import type { MarketPriceCandle, MarketPriceReactionAsset, MarketPriceReactionCoverageReport, MarketPriceReactionExpectedDirection, MarketPriceReactionInput, MarketPriceReactionObservedDirection, MarketPriceReactionReasonCode, MarketPriceReactionResult, MarketPriceReactionRule, MarketPriceReactionRuleSetSnapshot, MarketPriceReactionStatus, MarketPriceReactionWarning, MarketPriceReactionWindow } from '@elceo/types';
import { MARKET_ASSET_CAUSALITY_ASSETS, MARKET_PRICE_REACTION_STATUSES, MARKET_PRICE_REACTION_WARNINGS, MARKET_PRICE_REACTION_WINDOW_KINDS } from '@elceo/types';
import { validateMarketPriceReactionCoverageReport, validateMarketPriceReactionInput, validateMarketPriceReactionResult, validateMarketPriceReactionRuleSetSnapshot } from '@elceo/schemas';
import { resolveAssetContextualDirectionForEvidenceItem } from '../asset-direction-resolution/index';

const pending = { providerReliabilityExpansion:true, goldenScenarioExpansion:true, empiricalBacktesting:true } as const;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const pct = (from: number, to: number) => from === 0 ? 0 : (to - from) / from * 100;
const unique = <T extends string>(items: T[]): T[] => Array.from(new Set(items));
const dirSign = (d: MarketPriceReactionExpectedDirection) => d === 'bullish' ? 1 : d === 'bearish' ? -1 : 0;
function sorted(candles: MarketPriceCandle[]): MarketPriceCandle[] { return [...candles].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)); }
function windowFrom(kind: MarketPriceReactionWindow['kind'], candles: MarketPriceCandle[]): MarketPriceReactionWindow {
  const first = candles[0]; const last = candles[candles.length - 1];
  if (!first || !last) return { kind, startTime:null, endTime:null, candleCount:0, open:null, high:null, low:null, close:null, movePct:null, rangePct:null };
  const high = Math.max(...candles.map((c)=>c.high)); const low = Math.min(...candles.map((c)=>c.low));
  return { kind, startTime:first.timestamp, endTime:last.timestamp, candleCount:candles.length, open:first.open, high, low, close:last.close, movePct:pct(first.open, last.close), rangePct:first.open === 0 ? 0 : (high - low) / first.open * 100 };
}
function afterEvent(input: MarketPriceReactionInput): MarketPriceCandle[] { const cs = sorted(input.candles); if (!input.eventTime) return cs; const event = Date.parse(input.eventTime); return cs.filter((c)=>Date.parse(c.timestamp) >= event); }
function preEvent(input: MarketPriceReactionInput): MarketPriceCandle[] { if (!input.eventTime) return []; const event = Date.parse(input.eventTime); return sorted(input.candles).filter((c)=>Date.parse(c.timestamp) < event); }
function moveDirection(move: number, threshold: number): Exclude<MarketPriceReactionObservedDirection, 'mixed'> { return move > threshold ? 'bullish' : move < -threshold ? 'bearish' : Math.abs(move) <= threshold ? 'neutral' : 'unknown'; }
function matches(expected: MarketPriceReactionExpectedDirection, observed: MarketPriceReactionObservedDirection): boolean { return expected !== 'unknown' && expected !== 'mixed' && expected !== 'neutral' && expected === observed; }
function opposes(expected: MarketPriceReactionExpectedDirection, observed: MarketPriceReactionObservedDirection): boolean { return (expected === 'bullish' && observed === 'bearish') || (expected === 'bearish' && observed === 'bullish'); }
function volatility(input: MarketPriceReactionInput, warnings: MarketPriceReactionWarning[]): number {
  if (typeof input.volatilityBasisPct === 'number' && Number.isFinite(input.volatilityBasisPct) && input.volatilityBasisPct > 0) return input.volatilityBasisPct;
  const pre = preEvent(input).slice(-6); const ranges = pre.map((c)=>c.open === 0 ? 0 : (c.high - c.low) / c.open * 100).filter((n)=>Number.isFinite(n) && n > 0);
  if (ranges.length > 0) return Math.max(0.05, ranges.reduce((a,b)=>a+b,0)/ranges.length);
  warnings.push('volatility_basis_missing'); return 0.5;
}

export function buildPriceReactionWindows(input: MarketPriceReactionInput): MarketPriceReactionWindow[] {
  const pre = preEvent(input).slice(-6); const post = afterEvent(input);
  return [windowFrom('pre_event', pre), windowFrom('immediate', post.slice(0,1)), windowFrom('confirmation', post.slice(1,3)), windowFrom('follow_through', post.slice(3,6)), windowFrom('post_event', post)];
}
export function inferObservedPriceDirection(input: MarketPriceReactionInput): MarketPriceReactionObservedDirection {
  const warnings: MarketPriceReactionWarning[] = []; const vol = volatility(input, warnings); const windows = buildPriceReactionWindows(input); const imm = windows.find((w)=>w.kind === 'immediate'); const follow = windows.find((w)=>w.kind === 'follow_through');
  const immediate = moveDirection(imm?.movePct ?? 0, Math.min(0.15, vol * 0.35)); const later = follow && follow.candleCount > 0 ? moveDirection(follow.movePct ?? 0, Math.min(0.15, vol * 0.35)) : immediate;
  return immediate !== 'neutral' && later !== 'neutral' && immediate !== later ? 'mixed' : immediate;
}
export function classifyPriceImpulse(input: MarketPriceReactionInput): MarketPriceReactionResult['impulseClass'] {
  const warnings: MarketPriceReactionWarning[] = []; const vol = volatility(input, warnings); const imm = Math.abs(buildPriceReactionWindows(input).find((w)=>w.kind === 'immediate')?.movePct ?? 0); const adjusted = vol === 0 ? 0 : imm / vol;
  return adjusted >= 8 ? 'outlier' : adjusted >= 5 ? 'extreme' : adjusted >= 2.5 ? 'strong' : adjusted >= 1 ? 'moderate' : adjusted >= 0.25 ? 'weak' : 'none';
}
export function detectWickRejection(input: MarketPriceReactionInput): number {
  const expected = input.expectedDirection ?? 'unknown'; const c = afterEvent(input)[0]; if (!c || dirSign(expected) === 0) return 0;
  const range = Math.max(0.000001, c.high - c.low); const bodyTop = Math.max(c.open, c.close); const bodyBottom = Math.min(c.open, c.close);
  const upper = (c.high - bodyTop) / range * 100; const lower = (bodyBottom - c.low) / range * 100; const closePos = (c.close - c.low) / range * 100;
  if (expected === 'bullish') return clamp(upper * 0.75 + (100 - closePos) * 0.25);
  if (expected === 'bearish') return clamp(lower * 0.75 + closePos * 0.25);
  return 0;
}
export function detectAbsorption(input: MarketPriceReactionInput): number {
  const expected = input.expectedDirection ?? 'unknown'; if (dirSign(expected) === 0) return 0;
  const warnings: MarketPriceReactionWarning[] = []; const vol = volatility(input, warnings); const w = buildPriceReactionWindows(input); const immediateMove = Math.abs(w.find((x)=>x.kind === 'immediate')?.movePct ?? 0); const postRange = w.find((x)=>x.kind === 'post_event')?.rangePct ?? 0;
  return postRange >= vol * 1.2 && immediateMove <= vol * 0.3 ? clamp(65 + (postRange / Math.max(vol, 0.01)) * 5) : immediateMove <= vol * 0.15 ? 55 : 0;
}
export function detectReversal(input: MarketPriceReactionInput): number {
  const expected = input.expectedDirection ?? 'unknown'; if (dirSign(expected) === 0) return 0;
  const warnings: MarketPriceReactionWarning[] = []; const vol = volatility(input, warnings); const windows = buildPriceReactionWindows(input); const immediate = moveDirection(windows.find((w)=>w.kind === 'immediate')?.movePct ?? 0, vol * 0.25); const follow = moveDirection(windows.find((w)=>w.kind === 'follow_through')?.movePct ?? 0, vol * 0.35);
  return matches(expected, immediate) && opposes(expected, follow) ? 80 : 0;
}

export function evaluatePriceReaction(input: MarketPriceReactionInput): MarketPriceReactionResult {
  const check = validateMarketPriceReactionInput(input); if (check.ok === false) throw new Error(`invalid_market_price_reaction_input:${check.errors.join('|')}`);
  const warnings: MarketPriceReactionWarning[] = ['pending_provider_reliability','pending_golden_scenario_expansion','spread_risk_unavailable','provider_activation_gap'];
  const reasonCodes: MarketPriceReactionReasonCode[] = ['deterministic_foundation_only'];
  if (!input.eventTime) warnings.push('missing_event_time','insufficient_candles');
  const expected = input.expectedDirection ?? 'unknown'; if (expected === 'unknown') warnings.push('missing_expected_direction'); else reasonCodes.push('expected_direction_from_resolver');
  const windows = buildPriceReactionWindows(input); const pre = windows.find((w)=>w.kind === 'pre_event'); const post = windows.find((w)=>w.kind === 'post_event');
  if ((pre?.candleCount ?? 0) === 0) warnings.push('missing_pre_event_context'); if ((post?.candleCount ?? 0) === 0) warnings.push('missing_post_event_context','missing_price_window');
  if (input.candles.length < 2 || (post?.candleCount ?? 0) < 1) warnings.push('insufficient_candles');
  const vol = volatility(input, warnings); const immediateMovePct = windows.find((w)=>w.kind === 'immediate')?.movePct ?? 0; const followThroughMovePct = windows.find((w)=>w.kind === 'follow_through')?.movePct ?? windows.find((w)=>w.kind === 'confirmation')?.movePct ?? 0;
  const adjusted = clamp(Math.abs(immediateMovePct) / Math.max(vol, 0.01) * 20); const observed = inferObservedPriceDirection(input); const impulseClass = classifyPriceImpulse(input); reasonCodes.push('event_window_return','volatility_adjusted_move','impulse_bucket_applied');
  const wickRejectionScore = detectWickRejection(input); const absorptionScore = detectAbsorption(input); const reversalScore = detectReversal(input);
  if (wickRejectionScore >= 60) { warnings.push('wick_rejection_detected'); reasonCodes.push('wick_rejection_rule'); }
  if (absorptionScore >= 60) { warnings.push('absorption_detected'); reasonCodes.push('absorption_rule'); }
  if (reversalScore >= 60) { warnings.push('reversal_detected'); reasonCodes.push('reversal_rule'); }
  if (impulseClass === 'extreme' || impulseClass === 'outlier') warnings.push('outlier_move');
  let status: MarketPriceReactionStatus = 'ambiguous';
  const immediateDir = moveDirection(immediateMovePct, vol * 0.25); const followDir = moveDirection(followThroughMovePct, vol * 0.35);
  if (warnings.includes('insufficient_candles') || !input.eventTime) { status = 'insufficient_data'; reasonCodes.push('insufficient_data_penalty'); }
  else if (expected === 'unknown' || expected === 'mixed' || expected === 'neutral') { status = 'ambiguous'; reasonCodes.push('price_reaction_ambiguous'); }
  else if (reversalScore >= 60) { status = 'reversed'; reasonCodes.push('reversal_rule'); }
  else if (matches(expected, immediateDir) && wickRejectionScore < 60 && !opposes(expected, followDir)) { status = 'confirmed'; reasonCodes.push('confirmation_rule','price_reaction_confirmed'); }
  else if (opposes(expected, immediateDir) && impulseClass !== 'none' && impulseClass !== 'weak') { status = 'rejected'; reasonCodes.push('price_reaction_rejected'); }
  else if (immediateDir === 'neutral' && matches(expected, followDir)) { status = 'delayed'; warnings.push('delayed_follow_through'); reasonCodes.push('follow_through_rule'); }
  else if (absorptionScore >= 60) { status = 'absorbed'; reasonCodes.push('price_reaction_absorbed'); }
  else { status = 'ambiguous'; reasonCodes.push('price_reaction_ambiguous'); }
  const base = 35 + Math.min(input.candles.length, 8) * 3 + adjusted * 0.35;
  const statusAdj = status === 'confirmed' ? 18 : status === 'rejected' || status === 'reversed' ? -8 : status === 'absorbed' || status === 'delayed' ? 2 : status === 'insufficient_data' ? -25 : -6;
  const confidence = clamp(base + statusAdj - (warnings.includes('volatility_basis_missing') ? 7 : 0) - (wickRejectionScore >= 60 ? 10 : 0));
  const result: MarketPriceReactionResult = { reactionId: input.reactionId ?? `price-reaction|${input.asset}|${input.horizon}|${input.eventTime ?? 'missing-event'}`, asset:input.asset, horizon:input.horizon, eventKind:input.eventKind, eventTime:input.eventTime ?? null, expectedDirection:expected, observedDirection:observed, status, impulseClass, confidence, immediateMovePct, followThroughMovePct, volatilityAdjustedMove:adjusted, wickRejectionScore, absorptionScore, reversalScore, windows, warnings:unique(warnings), reasonCodes:unique(reasonCodes), rationale:`Deterministic event-window price reaction classified as ${status}; context is input-driven and does not project future movement.`, complete:false, pending };
  const valid = validateMarketPriceReactionResult(result); if (valid.ok === false) throw new Error(`invalid_market_price_reaction_result:${valid.errors.join('|')}`);
  return result;
}

function expectedFromMetadata(metaJson: string): MarketPriceReactionExpectedDirection | null { try { const v: unknown = JSON.parse(metaJson || '{}'); if (typeof v !== 'object' || v === null || Array.isArray(v)) return null; const d = (v as Record<string, unknown>).expectedDirection; return d === 'bullish' || d === 'bearish' || d === 'neutral' || d === 'mixed' || d === 'unknown' ? d : null; } catch { return null; } }
export function evaluatePriceReactionFromEvidenceItem(evidenceItem: Parameters<typeof resolveAssetContextualDirectionForEvidenceItem>[0], candles: MarketPriceCandle[], options?: Partial<Omit<MarketPriceReactionInput, 'asset' | 'eventKind' | 'candles'>> & { eventKind?: MarketPriceReactionInput['eventKind'] }): MarketPriceReactionResult {
  const resolved = resolveAssetContextualDirectionForEvidenceItem(evidenceItem); const expected = options?.expectedDirection ?? expectedFromMetadata(evidenceItem.metadataJson ?? '') ?? (resolved.resolvedDirection === 'bullish' || resolved.resolvedDirection === 'bearish' || resolved.resolvedDirection === 'neutral' ? resolved.resolvedDirection : 'unknown');
  const asset = evidenceItem.asset && (MARKET_ASSET_CAUSALITY_ASSETS as readonly string[]).includes(evidenceItem.asset) ? evidenceItem.asset as MarketPriceReactionAsset : 'sp500';
  const input: MarketPriceReactionInput = { asset, horizon:options?.horizon ?? 'intraday', eventKind:options?.eventKind ?? 'generic_news', eventTime:options?.eventTime ?? evidenceItem.observedAt ?? null, expectedDirection:expected, candles, ...(options?.volatilityBasisPct !== undefined ? { volatilityBasisPct: options.volatilityBasisPct } : {}), ...(options?.volatilityBasis !== undefined ? { volatilityBasis: options.volatilityBasis } : {}), ...(options?.reactionId ? { reactionId: options.reactionId } : {}) };
  return evaluatePriceReaction(input);
}
export function evaluatePriceReactionFromWeightedSnapshot(weightedSnapshot: { asset: string; horizon: MarketPriceReactionInput['horizon']; generatedAt: string; items: { direction: string; reasons: string[] }[] }, candles: MarketPriceCandle[], options?: Partial<Omit<MarketPriceReactionInput, 'asset' | 'eventKind' | 'candles'>> & { eventKind?: MarketPriceReactionInput['eventKind'] }): MarketPriceReactionResult {
  const asset = (MARKET_ASSET_CAUSALITY_ASSETS as readonly string[]).includes(weightedSnapshot.asset) ? weightedSnapshot.asset as MarketPriceReactionAsset : 'sp500';
  const first = weightedSnapshot.items.find((i)=>i.direction === 'bullish' || i.direction === 'bearish' || i.direction === 'neutral');
  const expected = options?.expectedDirection ?? (first?.direction === 'bullish' || first?.direction === 'bearish' || first?.direction === 'neutral' ? first.direction : 'unknown');
  const input: MarketPriceReactionInput = { asset, horizon:weightedSnapshot.horizon, eventKind:options?.eventKind ?? 'generic_news', eventTime:options?.eventTime ?? weightedSnapshot.generatedAt, expectedDirection:expected, candles, ...(options?.volatilityBasisPct !== undefined ? { volatilityBasisPct: options.volatilityBasisPct } : {}), ...(options?.volatilityBasis !== undefined ? { volatilityBasis: options.volatilityBasis } : {}), ...(options?.reactionId ? { reactionId: options.reactionId } : {}) };
  return evaluatePriceReaction(input);
}
const rules: MarketPriceReactionRule[] = [
  { ruleId:'window.event-segmentation', reasonCodes:['event_window_return'], rationale:'Candles are segmented into pre-event, immediate, confirmation, follow-through, and post-event windows.' },
  { ruleId:'impulse.volatility-adjusted', reasonCodes:['volatility_adjusted_move','impulse_bucket_applied'], rationale:'Move magnitude is bucketed against supplied or pre-event range context.' },
  { ruleId:'status.confirm-reject-absorb-reverse-delay', reasonCodes:['confirmation_rule','reversal_rule','absorption_rule'], rationale:'Status is deterministic confirmation context only, not prediction logic.' }
];
export function getMarketPriceReactionRuleSetSnapshot(asOfIso = new Date().toISOString()): MarketPriceReactionRuleSetSnapshot { const snapshot = { generatedAt:asOfIso, rules, warnings:[...MARKET_PRICE_REACTION_WARNINGS], complete:false as const, pending }; const v=validateMarketPriceReactionRuleSetSnapshot(snapshot); if (v.ok === false) throw new Error(`invalid_market_price_reaction_rules:${v.errors.join('|')}`); return snapshot; }
export function getMarketPriceReactionCoverageReport(asOfIso = new Date().toISOString()): MarketPriceReactionCoverageReport { const report = { generatedAt:asOfIso, assetCount:MARKET_ASSET_CAUSALITY_ASSETS.length, statusCoverage:[...MARKET_PRICE_REACTION_STATUSES], windowKinds:[...MARKET_PRICE_REACTION_WINDOW_KINDS], warnings:[...MARKET_PRICE_REACTION_WARNINGS], notes:['C6-R7 adds deterministic price reaction and event impulse foundation.','Price confirmation is fixture/input driven; live provider activation remains blocked.','Provider reliability weighting, golden scenario expansion, and empirical backtesting remain pending.'], complete:false as const, pending }; const v=validateMarketPriceReactionCoverageReport(report); if (v.ok === false) throw new Error(`invalid_market_price_reaction_coverage:${v.errors.join('|')}`); return report; }
export function assertMarketPriceReactionRuleSetValid(): MarketPriceReactionRuleSetSnapshot { return getMarketPriceReactionRuleSetSnapshot('2026-06-04T00:00:00.000Z'); }
export function listMarketPriceReactionWarnings(_asset?: MarketPriceReactionAsset): MarketPriceReactionWarning[] { return [...MARKET_PRICE_REACTION_WARNINGS]; }
export function listMarketPriceReactionRules(asset?: MarketPriceReactionAsset): MarketPriceReactionRule[] { return rules.filter((r)=>!asset || !r.asset || r.asset === asset); }
