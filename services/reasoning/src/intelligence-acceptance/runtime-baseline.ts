import type { ConfigurationVersion } from './contracts';
import { canonicalJson } from './identity';
import { createConfiguration } from './configuration-registry';
import { HISTORICAL_ANALOG_RETRIEVAL_POLICY_VERSION } from '../historical-analog-memory/policy';
import { CONTRADICTION_ACTION_PROTOCOL_POLICY_VERSION } from '../contradiction-action-protocol/policy';
import { MARKET_CLEANLINESS_POLICY_VERSION } from '../market-cleanliness/policy';
import { NARRATIVE_DECAY_POLICY_VERSION } from '../narrative-decay/policy';
import { POSITIONING_STRESS_POLICY_VERSION } from '../positioning-stress/policy';
export const CANONICAL_RUNTIME_BASELINE = createConfiguration({
  configurationVersionId: 'ifp8-static-baseline-v1',
  parentConfigurationVersionId: null,
  status: 'baseline',
  policyVersions: {
    ifp1: 'expectation-reality-v1',
    ifp2: HISTORICAL_ANALOG_RETRIEVAL_POLICY_VERSION,
    ifp3: CONTRADICTION_ACTION_PROTOCOL_POLICY_VERSION,
    ifp4: MARKET_CLEANLINESS_POLICY_VERSION,
    ifp5: NARRATIVE_DECAY_POLICY_VERSION,
    ifp6: POSITIONING_STRESS_POLICY_VERSION,
    ifp7: 'fragility-score-v1',
  },
  parameterSnapshot: {
    runtimeMode: 'accepted-static-engine-code',
    runtimeOverridesSupported: false,
  },
  sourceCalibrationRunId: null,
  approvedBy: null,
  approvalReference: null,
  changeClass: 'no_change',
  changeReason: 'Canonical compile-time IFP-1 through IFP-7 baseline',
  createdAt: '2026-08-13T00:00:00.000Z',
  supersededAt: null,
  rollbackTargetVersionId: null,
});
export interface RuntimeBaselineConfigurationAuthority {
  resolve(): Promise<ConfigurationVersion>;
}
export class CanonicalRuntimeBaselineAuthority implements RuntimeBaselineConfigurationAuthority {
  async resolve() {
    return CANONICAL_RUNTIME_BASELINE;
  }
}
export async function assertRuntimeBaseline(
  configuration: ConfigurationVersion,
  authority: RuntimeBaselineConfigurationAuthority,
) {
  if (configuration.changeClass !== 'no_change')
    throw new Error('unsupported_runtime_parameter_calibration');
  const baseline = await authority.resolve();
  if (
    baseline.configurationVersionId !== CANONICAL_RUNTIME_BASELINE.configurationVersionId ||
    baseline.canonicalPayloadHash !== CANONICAL_RUNTIME_BASELINE.canonicalPayloadHash ||
    canonicalJson(configuration) !== canonicalJson(baseline)
  )
    throw new Error('runtime_configuration_not_canonical_baseline');
  return baseline;
}
