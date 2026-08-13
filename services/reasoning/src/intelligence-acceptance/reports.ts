import type { EngineOutputs } from './contracts';
const analogComponent = (outputs: EngineOutputs) =>
  outputs.ifp7.components.find(
    (component) => component.component === 'historical_analog_dispersion',
  );
const crowdComponent = (outputs: EngineOutputs) =>
  outputs.ifp7.components.find((component) => component.component === 'crowding_amplification');
export function crossEngineViolations(outputs: EngineOutputs): string[] {
  const violations: string[] = [];
  const invalidated = outputs.ifp3.protocolState === 'invalidate_thesis';
  if (outputs.ifp7.upstreamThesisInvalidated !== invalidated)
    violations.push('ifp3_ifp7_invalidation_authority_mismatch');
  if (outputs.ifp7.sourceProtocolDecisionId !== outputs.ifp3.protocolDecisionId)
    violations.push('ifp7_protocol_lineage_mismatch');
  if (outputs.ifp7.sourceCleanlinessEvaluationId !== outputs.ifp4.cleanlinessEvaluationId)
    violations.push('ifp7_cleanliness_lineage_mismatch');
  if (outputs.ifp7.sourceNarrativeDecayEvaluationId !== outputs.ifp5.narrativeDecayEvaluationId)
    violations.push('ifp7_narrative_lineage_mismatch');
  if (
    outputs.ifp7.sourcePositioningStressEvaluationId !== outputs.ifp6.positioningStressEvaluationId
  )
    violations.push('ifp7_positioning_lineage_mismatch');
  const analogId = outputs.ifp2?.retrievalId ?? null;
  if (
    outputs.ifp7.sourceAnalogRetrievalId !== analogId ||
    (outputs.ifp5.sourceAnalogRetrievalId !== null &&
      outputs.ifp5.sourceAnalogRetrievalId !== analogId) ||
    (outputs.ifp6.sourceAnalogRetrievalId !== null &&
      outputs.ifp6.sourceAnalogRetrievalId !== analogId)
  )
    violations.push('analog_lineage_mismatch');
  if (
    outputs.ifp6.sourceCleanlinessEvaluationId !== outputs.ifp4.cleanlinessEvaluationId ||
    outputs.ifp6.sourceNarrativeDecayEvaluationId !== outputs.ifp5.narrativeDecayEvaluationId
  )
    violations.push('ifp6_upstream_lineage_mismatch');
  if (
    outputs.ifp2?.evidenceSufficiency !== 'sufficient' &&
    analogComponent(outputs)?.availability === 'available'
  )
    violations.push('ifp2_insufficiency_promoted_to_fragility');
  if (
    outputs.ifp6.crowdPainQualification !== 'directly_supported' &&
    crowdComponent(outputs)?.availability === 'available'
  )
    violations.push('proxy_promoted_to_direct_crowding');
  if (
    outputs.ifp3.evidenceSufficiency === 'provenance_limited' &&
    outputs.ifp7.evidenceSufficiency === 'sufficient'
  )
    violations.push('provenance_limitation_hidden');
  const eventId = outputs.ifp1.eventEvaluationId;
  if (
    [
      outputs.ifp2?.queryEventEvaluationId,
      outputs.ifp3.sourceEventEvaluationId,
      outputs.ifp4.sourceEventEvaluationId,
      outputs.ifp5.sourceEventEvaluationId,
      outputs.ifp6.sourceEventEvaluationId,
      outputs.ifp7.sourceEventEvaluationId,
    ]
      .filter(Boolean)
      .some((id) => id !== eventId)
  )
    violations.push('event_lineage_mismatch');
  if (
    [outputs.ifp4.asset, outputs.ifp5.asset, outputs.ifp6.asset, outputs.ifp7.asset].some(
      (asset) => asset !== outputs.ifp1.asset,
    )
  )
    violations.push('asset_lineage_mismatch');
  return [...new Set(violations)].sort();
}
