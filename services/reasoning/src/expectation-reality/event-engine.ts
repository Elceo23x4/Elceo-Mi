import type { MarketAssetDirectionResolutionResult, MarketPriceReactionExpectedDirection, MarketPriceReactionInput } from '@elceo/types';
import { resolveAssetContextualEvidenceDirection, resolveAssetDirectionFromNormalizedMacroContext } from '../asset-direction-resolution/index';
import { calculateMacroSignedNormalizedContribution, getMacroSurpriseRuleSetSnapshot, normalizeMacroSurprise, resolveMacroPressuresFromSignedNormalizedScore } from '../macro-surprise-normalization/index';
import { evaluatePriceReaction } from '../price-reaction/index';
import type { EventExpectationRecord, EventRealityEvaluation, EventRealityRecord, NumericReleaseFields, ReactionObservationEnvelope, RelatedEvidenceDecision, ReleaseAlignment } from './contracts';
import { calculateEventAssessmentEvidenceHash, calculateReactionEnvelopeContentHash, canonicalHash } from './identity';
import { EXPECTATION_REALITY_POLICY_V1 } from './policy';

const unique = (xs: string[]) => [...new Set(xs)];
const known = (d: string | null | undefined) => d === 'bullish' || d === 'bearish' || d === 'neutral' || d === 'mixed';
const reliable = (r: EventRealityRecord) => r.provenance.some((p) => (EXPECTATION_REALITY_POLICY_V1.eventInterpretation.reliableProvenance as readonly string[]).includes(p.effectiveReliability ?? p.reliability ?? 'unverified'));
const adjustedMaterial = (r: EventRealityRecord) => r.revisionAdjustedMeasures.revisionAdjustedMateriality === 'material' && Math.abs(r.revisionAdjustedMeasures.adjustedSurpriseScore ?? 0) >= EXPECTATION_REALITY_POLICY_V1.eventInterpretation.materialSurpriseScore;
const relatedAllowsNormalFinalInterpretation = (r: EventRealityRecord) => r.relatedEvidenceDecision.status === 'confirmed' || r.relatedEvidenceDecision.status === 'not_required';
const relatedConfirmsStrictMispricing = (r: EventRealityRecord) => r.relatedEvidenceDecision.status === 'confirmed';
const isReliableObservation = (e: ReactionObservationEnvelope) => (EXPECTATION_REALITY_POLICY_V1.eventInterpretation.reliableProvenance as readonly string[]).includes(e.effectiveReliability ?? 'unverified');
function asEnvelope(input: MarketPriceReactionInput | ReactionObservationEnvelope, role: string): ReactionObservationEnvelope { const envelope = 'reactionInput' in input ? input : { reactionInput: input, sourceId: role, provider: 'caller_unspecified', observationVersion: 'unspecified', reliability: 'unverified', effectiveReliability: 'unverified', trustBasis: 'internal_unverified' } as ReactionObservationEnvelope; const calculatedContentHash = calculateReactionEnvelopeContentHash(envelope); if (envelope.suppliedContentHash && envelope.suppliedContentHash !== calculatedContentHash) throw new Error(`${role}_reaction_content_hash_mismatch`); return { ...envelope, effectiveReliability: envelope.effectiveReliability ?? 'unverified', calculatedContentHash }; }
function relatedState(reactions: EventRealityRecord['relatedMarketReactions']): EventRealityRecord['relatedMarketState'] { if (reactions.length === 0) return 'unavailable'; if (reactions.some((r) => r.status === 'rejected' || r.status === 'reversed')) return 'conflicting'; if (reactions.some((r) => r.status === 'insufficient_data' || r.status === 'unknown' || r.status === 'ambiguous')) return 'insufficient'; return reactions.some((r) => r.status === 'confirmed' || r.status === 'delayed') ? 'confirmed' : 'unavailable'; }

function releaseMetadata(expectation: EventExpectationRecord, normalized: EventRealityRecord['normalizedSurprise'], revisionAdjusted?: ReturnType<typeof revisionMeasures>) {
  if (revisionAdjusted?.revisionAdjustedMateriality === 'unavailable') return null;
  const economicMeaning = revisionAdjusted?.adjustedEconomicMeaning ?? normalized?.economicMeaning ?? 'unknown';
  const policyPressure = revisionAdjusted?.adjustedPolicyPressure ?? normalized?.policyPressure ?? 'unknown';
  const riskPressure = revisionAdjusted?.adjustedRiskPressure ?? normalized?.riskPressure ?? 'unknown';
  return JSON.stringify({
    releaseId: expectation.eventReleaseId,
    indicatorKind: revisionAdjusted ? undefined : expectation.indicatorKind,
    indicatorName: revisionAdjusted ? undefined : expectation.indicatorKind,
    category: expectation.indicatorCategory,
    region: expectation.region,
    currency: expectation.currency,
    affectedCurrency: expectation.currency,
    issuerCurrency: expectation.currency,
    policyIssuerCurrency: expectation.currency,
    policyIssuerRegion: expectation.region,
    actual: revisionAdjusted ? undefined : normalized?.actual ?? null,
    forecast: revisionAdjusted ? undefined : normalized?.forecast ?? null,
    previous: revisionAdjusted ? undefined : normalized?.previous ?? null,
    revisedPrevious: revisionAdjusted ? undefined : normalized?.revisedPrevious ?? null,
    economicMeaning,
    policyPressure,
    policyTone: policyPressure,
    riskRegime: riskPressure === 'risk_negative' ? 'risk_off' : riskPressure === 'risk_supportive' ? 'risk_on' : 'unknown',
    driverKind: normalized?.category === 'inflation' || normalized?.category === 'central_bank_policy' ? 'central_bank_policy' : 'unknown'
  });
}

function unresolvedDirection(expectation: EventExpectationRecord, asset: string, reason: string): MarketAssetDirectionResolutionResult {
  return { asset: asset as never, evidenceClass: 'macro_release', rawHint: 'unknown', resolvedDirection: 'unknown', pressureTarget: 'unknown', confidence: 0, reasonCodes: ['macro_surprise_incomplete'], warnings: ['pending_macro_surprise_normalization'], requiresSurpriseNormalization: true, requiresRelativeStrength: false, requiresPriceConfirmation: true, appliedRuleIds: ['event-revision-v1'], rationale: reason, unresolvedReason: reason };
}
function resolveReleaseDirection(expectation: EventExpectationRecord, asset: string, normalized: EventRealityRecord['normalizedSurprise'], revisionAdjusted?: ReturnType<typeof revisionMeasures>): MarketAssetDirectionResolutionResult {
  if (!expectation.affectedAssets.includes(asset as never)) throw new Error(`unrelated_related_market_rejected:${asset}`);
  if (revisionAdjusted && revisionAdjusted.revisionAdjustedMateriality !== 'unavailable' && revisionAdjusted.adjustedSurpriseScore !== null) {
    const resolved = resolveAssetDirectionFromNormalizedMacroContext({ asset: asset as never, evidenceClass: 'macro_release', indicatorKind: String(expectation.indicatorKind), category: String(expectation.indicatorCategory), currency: String(expectation.currency), region: String(expectation.region), signedNormalizedScore: revisionAdjusted.adjustedSurpriseScore, economicMeaning: revisionAdjusted.adjustedEconomicMeaning, policyPressure: revisionAdjusted.adjustedPolicyPressure, growthPressure: revisionAdjusted.adjustedGrowthPressure, inflationPressure: revisionAdjusted.adjustedInflationPressure, riskPressure: revisionAdjusted.adjustedRiskPressure, observedAt: normalized ? expectation.scheduledReleaseTime : null });
    if (!known(resolved.resolvedDirection) && normalized) throw new Error(`canonical_direction_unavailable:${asset}`);
    return resolved;
  }
  const metadataJson = releaseMetadata(expectation, normalized, revisionAdjusted);
  if (!metadataJson) return unresolvedDirection(expectation, asset, 'revision_context_insufficient_for_direction');
  const resolved = resolveAssetContextualEvidenceDirection({ asset: asset as never, evidenceClass: 'macro_release', metadataJson, policyTone: (revisionAdjusted?.adjustedPolicyPressure ?? normalized?.policyPressure) as never, policyIssuerRegion: String(expectation.region), affectedCurrency: String(expectation.currency), observedAt: normalized ? expectation.scheduledReleaseTime : null });
  if (!known(resolved.resolvedDirection) && normalized) throw new Error(`canonical_direction_unavailable:${asset}`);
  return resolved;
}

function assertReaction(input: MarketPriceReactionInput, expectation: EventExpectationRecord, role: 'primary' | 'follow_through' | 'related', releaseObservedAt: string, direction: MarketPriceReactionExpectedDirection) {
  if (role !== 'related' && input.asset !== expectation.asset) throw new Error(`${role}_reaction_asset_mismatch`);
  if (role === 'related' && input.asset === expectation.asset) throw new Error('related_market_primary_asset_rejected');
  if (input.eventKind !== expectation.eventKind && !(expectation.eventKind === 'macro_release' && input.eventKind === 'macro_release')) throw new Error(`${role}_reaction_event_kind_mismatch`);
  if (input.eventTime !== releaseObservedAt) throw new Error(`${role}_reaction_release_time_mismatch`);
  if (input.expectedDirection && input.expectedDirection !== direction) throw new Error(`${role}_reaction_direction_mismatch`);
  return { ...input, eventTime: releaseObservedAt, expectedDirection: direction };
}


function postCandles(input: MarketPriceReactionInput) { const event = Date.parse(input.eventTime ?? ''); return [...input.candles].map((c)=>({ ...c, timestamp: (c as { closedAt?: string }).closedAt ?? c.timestamp })).sort((a,b)=>Date.parse(((a as { openedAt?: string }).openedAt ?? a.timestamp))-Date.parse(((b as { openedAt?: string }).openedAt ?? b.timestamp))).filter((c)=>{ const open=Date.parse((c as { openedAt?: string }).openedAt ?? c.timestamp); return !Number.isFinite(event) || open >= event; }); }
function signFor(direction: MarketPriceReactionExpectedDirection) { return direction === 'bullish' ? 1 : direction === 'bearish' ? -1 : 0; }
function observedFromMove(movePct: number | null) { if (movePct === null) return 'unknown' as const; return movePct > 0 ? 'bullish' as const : movePct < 0 ? 'bearish' as const : 'neutral' as const; }
function stateFromMove(movePct: number | null, vol: number, direction: MarketPriceReactionExpectedDirection, available: number, required: number) { if (available < required || movePct === null) return 'insufficient_data' as const; const signed = movePct * signFor(direction); const threshold = vol * EXPECTATION_REALITY_POLICY_V1.eventInterpretation.timeline.acceptanceVolUnits; if (signed >= threshold) return 'confirmed' as const; if (signed <= -threshold) return 'rejected' as const; return 'ambiguous' as const; }
function phaseRecord(post: ReturnType<typeof postCandles>, origin: number | null, vol: number, direction: MarketPriceReactionExpectedDirection, start: number, end: number, required: number, label: string) {
  const slice = post.slice(start, end); const last = slice.at(-1); const move = origin && last ? (last.close - origin) / origin * 100 : null; const state = stateFromMove(move, vol, direction, slice.length, required); return { state, startTimestamp: slice[0]?.timestamp ?? null, endTimestamp: last?.timestamp ?? null, requiredBarCount: required, availableBarCount: slice.length, moveFromOriginPct: move, volatilityAdjustedMove: move === null ? null : Math.abs(move) / Math.max(vol, 0.000001), observedDirection: observedFromMove(move), reasonCodes: [`event_timeline_${label}`], warnings: slice.length < required ? ['observation_window_incomplete'] : [] };
}
function phaseAbsorbed(phase: ReturnType<typeof phaseRecord>, direction: MarketPriceReactionExpectedDirection, vol: number, candle: MarketPriceReactionInput['candles'][number] | undefined, origin: number | null) { if (phase.availableBarCount < phase.requiredBarCount || phase.state !== 'ambiguous' || phase.moveFromOriginPct === null || !candle || !origin || direction === 'neutral' || direction === 'mixed' || direction === 'unknown') return false; const absorption = EXPECTATION_REALITY_POLICY_V1.eventInterpretation.timeline.phaseAbsorption; const opposingExcursionPct = direction === 'bullish' ? ((candle.low - origin) / origin) * 100 : ((origin - candle.high) / origin) * 100; const terminalSignedPct = phase.moveFromOriginPct * signFor(direction); return opposingExcursionPct <= -vol * absorption.opposingExcursionVolUnits && terminalSignedPct >= -vol * absorption.terminalBoundaryVolUnits && terminalSignedPct <= vol * absorption.terminalBoundaryVolUnits; }
function buildTimeline(envelope: ReactionObservationEnvelope, expectation: EventExpectationRecord, releaseObservedAt: string, direction: MarketPriceReactionExpectedDirection) {
  const canonical = assertReaction(envelope.reactionInput, expectation, 'primary', releaseObservedAt, direction);
  const fullReaction = evaluatePriceReaction(canonical);
  const post = postCandles(canonical).slice(0,6); const origin = post[0]?.open ?? null; const vol = canonical.volatilityBasisPct && canonical.volatilityBasisPct > 0 ? canonical.volatilityBasisPct : 0.5;
  const immediate = phaseRecord(post, origin, vol, direction, 0, 1, 1, 'immediate');
  const confirmation = phaseRecord(post, origin, vol, direction, 0, 3, 3, 'confirmation');
  const laterAcceptance = phaseRecord(post, origin, vol, direction, 1, 6, 1, 'later_acceptance');
  const followThrough = phaseRecord(post, origin, vol, direction, 3, 6, 3, 'follow_through');
  let firstAcceptanceTimestamp: string | null = null; let firstAcceptancePhase: 'immediate'|'confirmation'|'follow_through'|null = null; let acceptanceLostTimestamp: string | null = null; let renewedAcceptanceTimestamp: string | null = null; let renewedAcceptancePhase: 'immediate'|'confirmation'|'follow_through'|null = null; let firstContradictionTimestamp: string | null = null; let wasAccepted = false; let lost = false;
  post.forEach((c,i)=>{ const phase=i===0?'immediate':i<=2?'confirmation':'follow_through'; const rec=phaseRecord(post, origin, vol, direction, 0, i+1, i+1, `bar_${i+1}`); if (rec.state === 'confirmed') { if (!firstAcceptanceTimestamp) { firstAcceptanceTimestamp=c.timestamp; firstAcceptancePhase=phase; } else if (lost && !renewedAcceptanceTimestamp) { renewedAcceptanceTimestamp=c.timestamp; renewedAcceptancePhase=phase; } wasAccepted = true; } else if (wasAccepted && !lost) { lost = true; acceptanceLostTimestamp = c.timestamp; } if (!firstContradictionTimestamp && rec.state === 'rejected') firstContradictionTimestamp=c.timestamp; });
  const reversalTimestamp = immediate.state === 'confirmed' && firstContradictionTimestamp ? firstContradictionTimestamp : null;
  const immediateAbsorbed = phaseAbsorbed(immediate, direction, vol, post[0], origin);
  immediate.reasonCodes.push(immediateAbsorbed ? 'initial_opposing_excursion' : 'initial_absorption_not_proven');
  if (immediateAbsorbed) immediate.reasonCodes.push('initial_excursion_recovered','initial_absorption_confirmed');
  const followThroughAcceptance = firstAcceptancePhase === 'follow_through' || renewedAcceptancePhase === 'follow_through';
  return { policyVersion: EXPECTATION_REALITY_POLICY_V1.eventInterpretation.timeline.version, primaryObservation: envelope, immediate, confirmation, followThrough, laterAcceptance, initialState: immediateAbsorbed ? 'absorbed' as const : immediate.state, confirmationWindowState: confirmation.state, followThroughState: followThrough.state, laterAcceptanceState: laterAcceptance.state, reversalAbsorptionState: immediateAbsorbed ? 'absorbed' as const : fullReaction.status === 'reversed' ? 'reversed' as const : 'none' as const, acceptanceTimestamp:firstAcceptanceTimestamp, acceptancePhase:firstAcceptancePhase, firstAcceptanceTimestamp, firstAcceptancePhase, acceptanceLostTimestamp, renewedAcceptanceTimestamp, renewedAcceptancePhase, firstContradictionTimestamp, reversalTimestamp, initialRejectionThenAcceptance: (immediate.state === 'rejected' || immediateAbsorbed) && confirmation.state !== 'insufficient_data' && followThrough.state === 'confirmed' && laterAcceptance.state === 'confirmed' && followThroughAcceptance, initialConfirmationThenReversal: immediate.state === 'confirmed' && !!reversalTimestamp };
}
function revisionFamily(indicatorKind: string) { const rule = getMacroSurpriseRuleSetSnapshot('2026-01-01T00:00:00.000Z').rules.find((r)=>r.indicatorKinds.includes(indicatorKind as never)); if (!rule) return { family:'non_additive' as const, additive:false, inverted:false }; if (rule.category === 'inflation') return { family:'inflation' as const, additive:true, inverted:rule.inverted }; if (rule.ruleId === 'macro-labor-inverted') return { family:'inverted_labour' as const, additive:true, inverted:rule.inverted }; if (rule.category === 'labor_market') return { family:'labour_strength' as const, additive:true, inverted:rule.inverted }; if (rule.category === 'growth_activity') return { family:'growth_activity' as const, additive:true, inverted:rule.inverted }; if (rule.category === 'central_bank_policy') return { family:'central_bank_policy' as const, additive:false, inverted:rule.inverted }; return { family:'non_additive' as const, additive:false, inverted:rule.inverted }; }
function effect(raw: number | null, rev: number | null) { if (raw === null || rev === null) return 'unavailable' as const; if (Math.abs(rev) < 1) return 'immaterial' as const; if (Math.sign(raw) === Math.sign(raw + rev)) return Math.sign(raw) === Math.sign(rev) ? 'reinforces_surprise' as const : 'offsets_surprise' as const; return 'reverses_interpretation' as const; }
function revisionMeasures(expectation: EventExpectationRecord, normalized: EventRealityRecord['normalizedSurprise']) { const meta=revisionFamily(String(normalized?.indicatorKind ?? expectation.indicatorKind)); const empty = { revisionPolicyVersion:'event-revision-v1' as const, revisionFamily:meta.family, rawSurpriseDelta:null, revisionDelta:null, revisionAdjustedDelta:null, rawNormalizedSurpriseScore: normalized?.normalizedSurpriseScore ?? null, normalizedRevisionContribution:null, rawSignedContribution:null, revisionSignedContribution:null, revisionAdjustedDirection:'unknown' as const, adjustedSurpriseScore:null, adjustedEconomicMeaning:null, adjustedPolicyPressure:null, adjustedGrowthPressure:null, adjustedInflationPressure:null, adjustedRiskPressure:null, revisionEffect:'unavailable' as const, revisionAdjustedMateriality:'unavailable' as const, limitations:['revision_context_insufficient'] }; if (!normalized || normalized.actual === null || normalized.forecast === null) return empty; const raw = calculateMacroSignedNormalizedContribution({ indicatorKind:normalized.indicatorKind, category:normalized.category, actual:normalized.actual, forecast:normalized.forecast, previous:normalized.previous }); const revision = normalized.revisedPrevious !== null && normalized.previous !== null ? calculateMacroSignedNormalizedContribution({ indicatorKind:normalized.indicatorKind, category:normalized.category, actual:normalized.revisedPrevious, forecast:normalized.previous, previous:normalized.previous }) : { signedContribution:null, boundedSignedContribution:null }; const rawScore = raw.signedContribution; const revisionScore = revision.signedContribution; if (!meta.additive && revisionScore !== null) return { ...empty, rawSurpriseDelta: rawScore, revisionDelta: revisionScore, revisionAdjustedDelta:null, rawNormalizedSurpriseScore: normalized.normalizedSurpriseScore, normalizedRevisionContribution: revision.boundedSignedContribution, rawSignedContribution:rawScore, revisionSignedContribution:revisionScore, limitations:['revision_context_non_additive'] }; const combined = rawScore === null ? null : rawScore + (revisionScore ?? 0); const adjustedContext = combined === null ? null : resolveMacroPressuresFromSignedNormalizedScore({ indicatorKind: normalized.indicatorKind, category: normalized.category, signedNormalizedScore: combined }); return { revisionPolicyVersion:'event-revision-v1' as const, revisionFamily:meta.family, rawSurpriseDelta:rawScore, revisionDelta:revisionScore, revisionAdjustedDelta:combined, rawNormalizedSurpriseScore:normalized.normalizedSurpriseScore, normalizedRevisionContribution:revision.boundedSignedContribution, rawSignedContribution:rawScore, revisionSignedContribution:revisionScore, revisionAdjustedDirection:adjustedContext?.surpriseDirection ?? 'unknown' as const, adjustedSurpriseScore:adjustedContext?.boundedSignedNormalizedScore ?? null, adjustedEconomicMeaning:adjustedContext?.economicMeaning ?? null, adjustedPolicyPressure:adjustedContext?.policyPressure ?? null, adjustedGrowthPressure:adjustedContext?.growthPressure ?? null, adjustedInflationPressure:adjustedContext?.inflationPressure ?? null, adjustedRiskPressure:adjustedContext?.riskPressure ?? null, revisionEffect:effect(rawScore, revisionScore), revisionAdjustedMateriality: adjustedContext && Math.abs(adjustedContext.boundedSignedNormalizedScore) >= EXPECTATION_REALITY_POLICY_V1.eventInterpretation.materialSurpriseScore ? 'material' as const : adjustedContext ? 'immaterial' as const : 'unavailable' as const, limitations:[] };
}

function alignRelease(expectation: EventExpectationRecord, normalized: EventRealityRecord['normalizedSurprise'], directions: EventRealityRecord['actualAssetDirections'], revisionAdjusted: ReturnType<typeof revisionMeasures>): ReleaseAlignment {
  const reasonCodes: string[] = [];
  if (!normalized) return { status:'insufficient_data', reasonCodes:['release_alignment_non_numeric_or_missing'], economicMeaningAlignment:'insufficient_data', policyPressureAlignment:'insufficient_data', actualVsForecastAlignment:'insufficient_data', revisionEffect:'unavailable', revisionExpectationImpact:'unavailable', primaryAssetDirectionAlignment:'insufficient_data', relatedMarketDirectionAlignment:'insufficient_data', expectedEconomicMeaning: expectation.expectedEconomicMeaning, actualEconomicMeaning: null, expectedPolicyPressure: expectation.expectedPolicyPressure, actualPolicyPressure: null, expectedDirection: expectation.expectedAssetDirection, actualDirection: null };
  const adjustedMeaning = revisionAdjusted.adjustedEconomicMeaning ?? normalized.economicMeaning;
  const adjustedPressure = revisionAdjusted.adjustedPolicyPressure ?? normalized.policyPressure;
  const meaning = String(adjustedMeaning) === String(expectation.expectedEconomicMeaning) ? 'aligned' : 'contradicted';
  const pressure = String(adjustedPressure) === String(expectation.expectedPolicyPressure) ? 'aligned' : 'contradicted';
  const actualVsForecast = revisionAdjusted.revisionAdjustedMateriality === 'unavailable' ? 'insufficient_data' : revisionAdjusted.revisionAdjustedMateriality === 'immaterial' || revisionAdjusted.revisionAdjustedDirection === 'inline' ? 'inline' : 'aligned';
  const revisionEffect = revisionAdjusted.revisionEffect;
  const rawAligned = String(normalized.economicMeaning) === String(expectation.expectedEconomicMeaning) && String(normalized.policyPressure) === String(expectation.expectedPolicyPressure);
  const adjustedAligned = meaning === 'aligned' && pressure === 'aligned';
  const revisionExpectationImpact = revisionEffect === 'unavailable' ? 'unavailable' as const : revisionEffect === 'immaterial' ? 'immaterial' as const : rawAligned && adjustedAligned ? 'reinforces_alignment' as const : rawAligned && !adjustedAligned ? 'reverses_to_contradiction' as const : !rawAligned && adjustedAligned ? 'reverses_to_alignment' as const : 'weakens_alignment' as const;
  const primaryDirection = revisionAdjusted.revisionAdjustedMateriality === 'immaterial' || revisionAdjusted.revisionAdjustedDirection === 'unknown' ? 'unknown' : directions.find((d) => d.asset === expectation.asset)?.resolvedDirection ?? 'unknown';
  const primaryDir = primaryDirection === expectation.expectedAssetDirection ? 'aligned' : primaryDirection === 'unknown' ? 'insufficient_data' : 'contradicted';
  const relatedKnown = directions.filter((d) => d.asset !== expectation.asset);
  const relatedAlignment = relatedKnown.length === 0 ? 'insufficient_data' : relatedKnown.every((d) => d.resolvedDirection !== 'unknown') ? 'aligned' : 'mixed';
  for (const [prefix, state] of [['economic_meaning', meaning], ['policy_pressure', pressure], ['actual_vs_forecast', actualVsForecast], ['revision_effect', revisionEffect], ['revision_expectation_impact', revisionExpectationImpact], ['primary_asset_direction', primaryDir], ['related_market_direction', relatedAlignment]] as const) reasonCodes.push(`${prefix}_${state}`);
  const core = [meaning, pressure, primaryDir].filter((x) => x !== 'insufficient_data');
  const revisionAlignment = revisionExpectationImpact === 'reverses_to_contradiction' ? 'contradicted' : revisionExpectationImpact === 'unavailable' ? 'insufficient_data' : revisionExpectationImpact === 'weakens_alignment' ? 'mixed' : 'aligned';
  const components = [meaning, pressure, actualVsForecast, primaryDir, revisionAlignment].filter((x) => x !== 'insufficient_data');
  const status = components.length === 0 ? 'insufficient_data' : core.length > 0 && core.every((x) => x === 'contradicted') ? 'contradicted' : components.every((x) => x === 'aligned' || x === 'inline') ? 'aligned' : components.some((x) => x === 'contradicted') ? 'mixed' : 'inline';
  return { status, reasonCodes, economicMeaningAlignment: meaning, policyPressureAlignment: pressure, actualVsForecastAlignment: actualVsForecast, revisionEffect, revisionExpectationImpact, primaryAssetDirectionAlignment: primaryDir, relatedMarketDirectionAlignment: relatedAlignment, expectedEconomicMeaning: expectation.expectedEconomicMeaning, actualEconomicMeaning: adjustedMeaning, expectedPolicyPressure: expectation.expectedPolicyPressure, actualPolicyPressure: adjustedPressure, expectedDirection: expectation.expectedAssetDirection, actualDirection: primaryDirection as never };
}

export function createEventExpectation(input: EventExpectationRecord): EventExpectationRecord {
  if (Date.parse(input.dataCutoffAt) > Date.parse(input.issuedAt)) throw new Error('event_expectation_future_cutoff_rejected');
  if (Date.parse(input.issuedAt) >= Date.parse(input.scheduledReleaseTime)) throw new Error('event_expectation_not_pre_event');
  const required = [...new Set(input.requiredRelatedAssets ?? [])];
  if (required.some((a) => a === input.asset)) throw new Error('required_related_asset_primary_rejected');
  if (required.some((a) => !input.affectedAssets.includes(a))) throw new Error('required_related_asset_not_affected');
  if (required.length !== (input.requiredRelatedAssets ?? []).length) throw new Error('required_related_asset_duplicate');
  return Object.freeze({ ...input, requiredRelatedAssets: required, affectedAssets: [...input.affectedAssets], affectedCurrencies: [...input.affectedCurrencies], expectedConfirmationConditions: [...input.expectedConfirmationConditions], provenance: input.provenance.map((p) => ({ ...p })) });
}

export function buildEventReality(params: { expectation: EventExpectationRecord; release: NumericReleaseFields | { releaseId: string; nonNumericOutcome: string; observedAt: string; releaseVersion: string; provenance: EventExpectationRecord['provenance'] }; primaryPriceReactionInput: MarketPriceReactionInput | ReactionObservationEnvelope; relatedMarketReactionInputs: Array<MarketPriceReactionInput | ReactionObservationEnvelope>; postEventCognition?: { snapshotId: string; evaluatedAt: string; confidence: number; contradiction: number; bias: EventExpectationRecord['expectedAssetDirection'] } | null; relatedEvidenceDecision?: RelatedEvidenceDecision }): EventRealityRecord {
  const { expectation, release } = params;
  const numeric = 'actual' in release;
  if (release.releaseId !== expectation.eventReleaseId) throw new Error('release_id_mismatch');
  if (Date.parse(release.observedAt) < Date.parse(expectation.scheduledReleaseTime)) throw new Error('event_reality_before_release_rejected');
  const normalizedSurprise = numeric && expectation.expectationBasis.kind === 'numeric' ? normalizeMacroSurprise({ releaseId: expectation.eventReleaseId, indicatorKind: expectation.indicatorKind, category: expectation.indicatorCategory, region: expectation.region, currency: expectation.currency, importance: expectation.importance, actual: release.actual, forecast: expectation.expectationBasis.forecast, previous: expectation.expectationBasis.previous, revisedPrevious: release.revisedPrevious, unit: expectation.expectationBasis.unit, observedAt: release.observedAt }) : null;
  const revisionAdjustedMeasures = revisionMeasures(expectation, normalizedSurprise);
  const directionAssets = unique([expectation.asset, ...params.relatedMarketReactionInputs.map((r) => asEnvelope(r, 'related').reactionInput.asset as string)]);
  const actualAssetDirections = directionAssets.map((asset) => resolveReleaseDirection(expectation, asset, normalizedSurprise, revisionAdjustedMeasures)).map((r) => ({ asset: r.asset, resolvedDirection: r.resolvedDirection, confidence: r.confidence, reasonCodes: r.reasonCodes, warnings: r.warnings }));
  const dirFor = (asset: string) => actualAssetDirections.find((d) => d.asset === asset)?.resolvedDirection as MarketPriceReactionExpectedDirection | undefined;
  const primaryDirection = dirFor(expectation.asset); if (!primaryDirection) throw new Error('primary_direction_unavailable');
  const primaryEnvelope = asEnvelope(params.primaryPriceReactionInput, 'primary');
  const relatedEnvelopes = params.relatedMarketReactionInputs.map((input) => asEnvelope(input, 'related'));
  const priceReactionTimeline = buildTimeline(primaryEnvelope, expectation, release.observedAt, primaryDirection);
  const fullPrimaryReaction = evaluatePriceReaction(assertReaction(primaryEnvelope.reactionInput, expectation, 'primary', release.observedAt, primaryDirection));
  const primaryPriceReaction = fullPrimaryReaction;
  const followThroughReaction = priceReactionTimeline.followThrough;
  const relatedMarketReactions = relatedEnvelopes.map((envelope) => { const direction = dirFor(envelope.reactionInput.asset); if (!direction) throw new Error(`canonical_direction_unavailable:${envelope.reactionInput.asset}`); return evaluatePriceReaction(assertReaction(envelope.reactionInput, expectation, 'related', release.observedAt, direction)); });
  const relatedMarketState = relatedState(relatedMarketReactions);
  const relatedEvidenceDecision: RelatedEvidenceDecision = params.relatedEvidenceDecision ?? { status: relatedMarketReactions.length === 0 ? 'pending' : relatedMarketState === 'confirmed' ? 'confirmed' : 'pending', decidedAt: null, policyVersion: 'related-evidence-closure-v1', reasonCodes: relatedMarketReactions.length === 0 ? ['related_evidence_pending'] : ['related_evidence_observed_pending_closure'] };
  const post = params.postEventCognition ?? null;
  const releaseAlignment = alignRelease(expectation, normalizedSurprise, actualAssetDirections, revisionAdjustedMeasures);
  const reactionProvenance = [primaryEnvelope, ...relatedEnvelopes];
  const observationContentHash = canonicalHash({ releaseId: release.releaseId, releaseVersion: release.releaseVersion, observedAt: release.observedAt, actual: numeric ? release.actual : null, forecast: expectation.expectationBasis.kind === 'numeric' ? expectation.expectationBasis.forecast : null, previous: expectation.expectationBasis.kind === 'numeric' ? expectation.expectationBasis.previous : null, revisedPrevious: numeric ? release.revisedPrevious : null, releaseProvenance: release.provenance, primary: primaryEnvelope, related: relatedEnvelopes });
  const record: EventRealityRecord = { releaseAlignment, revisionAdjustedMeasures, priceReactionTimeline, actualAssetDirections, observationContentHash, reactionProvenance, relatedMarketState, relatedEvidenceDecision, releaseId: expectation.eventReleaseId, releaseVersion: release.releaseVersion, observedAt: release.observedAt, actual: numeric ? release.actual : null, forecast: expectation.expectationBasis.kind === 'numeric' ? expectation.expectationBasis.forecast : null, previous: expectation.expectationBasis.kind === 'numeric' ? expectation.expectationBasis.previous : null, revisedPrevious: numeric ? release.revisedPrevious : null, normalizedSurprise, nonNumericOutcome: numeric ? null : release.nonNumericOutcome, provenance: release.provenance.map((p) => ({ ...p })), primaryPriceReaction, followThroughReaction, relatedMarketReactions, postEventCognitionSnapshotId: post?.snapshotId ?? null, postEventCognitionEvaluatedAt: post?.evaluatedAt ?? null, postEventConfidence: post?.confidence ?? null, confidenceDelta: post ? post.confidence - expectation.preEventConfidence : null, postEventContradiction: post?.contradiction ?? null, contradictionDelta: post ? post.contradiction - expectation.preEventContradiction : null, biasChange: { before: expectation.expectedAssetDirection, after: post?.bias ?? null, changed: post ? post.bias !== expectation.expectedAssetDirection : false }, warnings: unique([...(normalizedSurprise?.warnings ?? []), ...actualAssetDirections.flatMap((d) => d.warnings), ...primaryPriceReaction.warnings, ...followThroughReaction.warnings, ...(relatedMarketReactions.length === 0 ? ['missing_related_market_context'] : []), ...(relatedMarketState === 'conflicting' ? ['related_market_conflict'] : [])]), limitations: relatedMarketReactions.length === 0 ? ['related_market_confirmation_unavailable'] : [] };
  return record;
}

export function interpretEventReality(params: { expectation: EventExpectationRecord; reality: EventRealityRecord; interpretedAt: string }): EventRealityEvaluation {
  const { expectation, reality, interpretedAt } = params;
  const reasonCodes: string[] = [...reality.releaseAlignment.reasonCodes];
  const warnings = [...reality.warnings];
  let outcome: EventRealityEvaluation['outcome'] = 'ambiguous';
  const actualKnown = known(reality.releaseAlignment.actualDirection);
  const effectiveRelatedState = reality.relatedEvidenceDecision.status === 'conflicting_final' ? 'conflicting' : reality.relatedEvidenceDecision.status === 'confirmed' ? 'confirmed' : reality.relatedEvidenceDecision.status === 'not_required' ? 'confirmed' : relatedState(reality.relatedMarketReactions);
  const primaryProvenanceReliable = isReliableObservation(reality.reactionProvenance[0]!);
  const requiredRelatedProvenance = reality.reactionProvenance.slice(1).filter((e)=>expectation.requiredRelatedAssets.includes(e.reactionInput.asset as never));
  const optionalRelatedProvenance = reality.reactionProvenance.slice(1).filter((e)=>!expectation.requiredRelatedAssets.includes(e.reactionInput.asset as never));
  const requiredRelatedProvenanceReliable = requiredRelatedProvenance.every(isReliableObservation);
  const optionalRelatedUnverified = optionalRelatedProvenance.some((e)=>!isReliableObservation(e));
  const priceProvenanceReliable = primaryProvenanceReliable && requiredRelatedProvenanceReliable;
  const releaseReliable = reliable(reality);
  const limitedRelatedFinal = ['conflicting_final','insufficient_final','explicitly_unavailable'].includes(reality.relatedEvidenceDecision.status);
  const criticalAmbiguity = warnings.includes('volatility_context_unavailable') || warnings.includes('volatility_basis_missing') || warnings.includes('observation_content_hash_mismatch') || !actualKnown || reality.releaseAlignment.status === 'mixed' || reality.relatedEvidenceDecision.status === 'conflicting_final' || !priceProvenanceReliable || !releaseReliable;
  if (!reality.primaryPriceReaction || reality.primaryPriceReaction.status === 'insufficient_data') { outcome = 'insufficient_data'; reasonCodes.push('primary_price_reaction_insufficient'); }
  else if (!adjustedMaterial(reality) && expectation.expectationBasis.kind === 'numeric') { outcome = 'ambiguous'; reasonCodes.push('event_surprise_not_material'); }
  else if (reality.priceReactionTimeline.initialRejectionThenAcceptance && relatedConfirmsStrictMispricing(reality) && releaseReliable && adjustedMaterial(reality) && reality.revisionAdjustedMeasures.revisionAdjustedMateriality === 'material' && Math.abs(reality.revisionAdjustedMeasures.adjustedSurpriseScore ?? 0) >= EXPECTATION_REALITY_POLICY_V1.eventInterpretation.materialSurpriseScore && (reality.releaseAlignment.status === 'contradicted' || reality.releaseAlignment.status === 'aligned') && !criticalAmbiguity) { outcome = 'mispriced_candidate'; reasonCodes.push(reality.releaseAlignment.status === 'aligned' ? 'expectation_aligned_market_initially_rejected' : 'expectation_contradicted_market_initially_rejected_actual_reality'); }
  else if (reality.releaseAlignment.status === 'contradicted') { outcome = 'rejected'; reasonCodes.push('release_expectation_semantic_contradiction'); }
  else if (effectiveRelatedState === 'conflicting') { outcome = 'ambiguous'; reasonCodes.push('related_market_conflict_blocks_mispricing'); }
  else if (reality.releaseAlignment.status === 'mixed') { outcome = 'ambiguous'; reasonCodes.push('release_expectation_mixed_alignment'); }
  else if (reality.primaryPriceReaction.status === 'confirmed' && relatedAllowsNormalFinalInterpretation(reality)) { outcome = 'confirmed'; reasonCodes.push('event_confirmed_by_primary_and_related'); }
  else if (reality.primaryPriceReaction.status === 'confirmed' && reality.relatedMarketReactions.length === 0) { outcome = 'ambiguous'; reasonCodes.push('missing_related_market_context'); }
  else if (reality.primaryPriceReaction.status === 'rejected') { outcome = 'rejected'; reasonCodes.push('event_rejected_by_primary_price'); }
  else if (reality.primaryPriceReaction.status === 'absorbed') { outcome = 'absorbed'; reasonCodes.push('event_absorbed_by_primary_price'); }
  else if (reality.primaryPriceReaction.status === 'reversed') { outcome = 'reversed'; reasonCodes.push('event_reversed_after_initial_reaction'); }
  else if (reality.primaryPriceReaction.status === 'delayed' || reality.followThroughReaction.state === 'confirmed') { outcome = 'delayed'; reasonCodes.push('event_delayed_follow_through'); }
  else { reasonCodes.push('event_interpretation_ambiguous'); }
  if (!reality.postEventCognitionSnapshotId && ['confirmed','rejected','absorbed','delayed','reversed','mispriced_candidate'].includes(outcome)) { outcome = 'insufficient_data'; reasonCodes.push('post_event_cognition_required'); warnings.push('missing_confidence_shift_context'); }
  const finalOutcome = ['confirmed','rejected','absorbed','delayed','reversed','mispriced_candidate'].includes(outcome);
  if (finalOutcome && !releaseReliable) { outcome = 'insufficient_data'; reasonCodes.push('release_evidence_unverified','final_event_trust_gate_not_satisfied'); }
  if (finalOutcome && !primaryProvenanceReliable) { outcome = 'insufficient_data'; reasonCodes.push('primary_reaction_evidence_unverified','final_event_trust_gate_not_satisfied'); }
  if (finalOutcome && primaryProvenanceReliable && !requiredRelatedProvenanceReliable) { outcome = 'insufficient_data'; reasonCodes.push('required_related_reaction_evidence_unverified','final_event_trust_gate_not_satisfied'); }
  if (!requiredRelatedProvenanceReliable) reasonCodes.push('required_related_reaction_evidence_unverified');
  if (optionalRelatedUnverified) { reasonCodes.push('optional_related_reaction_evidence_unverified'); warnings.push('optional_related_reaction_evidence_unverified'); }
  reasonCodes.push(...reality.relatedEvidenceDecision.reasonCodes);
  const readyReasons: string[] = [];
  if (reality.priceReactionTimeline.followThrough.availableBarCount < reality.priceReactionTimeline.followThrough.requiredBarCount) readyReasons.push('follow_through_window_incomplete');
  if (!reality.postEventCognitionSnapshotId) readyReasons.push('post_event_cognition_required');
  if (!releaseReliable) readyReasons.push('release_evidence_unverified');
  if (!primaryProvenanceReliable) readyReasons.push('primary_reaction_evidence_unverified');
  if (!requiredRelatedProvenanceReliable) readyReasons.push('required_related_reaction_evidence_unverified');
  if (reality.relatedEvidenceDecision.status === 'pending') readyReasons.push('related_evidence_pending');
  if (warnings.includes('volatility_basis_missing') || warnings.includes('volatility_context_unavailable')) readyReasons.push('volatility_context_unavailable');
  const finalizationStatus = readyReasons.length === 0 ? 'final' as const : 'provisional' as const;
  const assessmentStage = reality.priceReactionTimeline.followThrough.availableBarCount >= 3 ? 'follow_through' as const : reality.priceReactionTimeline.confirmation.availableBarCount >= 3 ? 'confirmation' as const : 'immediate' as const;
  if (limitedRelatedFinal && ['confirmed','rejected','absorbed','delayed','reversed','mispriced_candidate'].includes(outcome)) { outcome = 'ambiguous'; reasonCodes.push('related_evidence_limited_final_interpretation'); }
  if (finalizationStatus !== 'final' && ['confirmed','rejected','absorbed','delayed','reversed','mispriced_candidate'].includes(outcome)) { outcome = 'insufficient_data'; reasonCodes.push('final_event_trust_gate_not_satisfied'); }
  if (outcome === 'mispriced_candidate') warnings.push('candidate_not_proven_mispricing');
  const assessmentEvidenceHash = calculateEventAssessmentEvidenceHash({ reality, interpretedAt });
  const eventEvaluationId = finalizationStatus === 'final' ? `event-reality-${expectation.expectationId}-${reality.releaseVersion}-final` : `event-assessment-${expectation.expectationId}-${reality.releaseVersion}-${assessmentEvidenceHash}`;
  return { assessmentStage, finalizationStatus, finalizationReadiness: { ready: finalizationStatus === 'final', reasonCodes: unique(readyReasons) }, eventEvaluationId: eventEvaluationId, expectationId: expectation.expectationId, releaseId: reality.releaseId, releaseVersion: reality.releaseVersion, asset: expectation.asset, preEventCognitionSnapshotId: expectation.preEventCognitionSnapshotId, postEventCognitionSnapshotId: reality.postEventCognitionSnapshotId, observationContentHash: reality.observationContentHash, assessmentEvidenceHash, relatedEvidenceStatus: reality.relatedEvidenceDecision.status, relatedEvidenceDecisionAt: reality.relatedEvidenceDecision.decidedAt, relatedEvidencePolicyVersion: reality.relatedEvidenceDecision.policyVersion, relatedEvidenceReasonCodes: reality.relatedEvidenceDecision.reasonCodes, reactionProvenance: reality.reactionProvenance, interpretedAt, outcome, reasonCodes: unique(reasonCodes), warnings: unique(warnings), rationale: `Event release ${reality.releaseId} interpreted as ${outcome}; classification is evidence-qualified and not financial advice.`, expectation, reality, createdAt: interpretedAt };
}
