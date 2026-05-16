import assert from 'node:assert/strict';
import { getProviderActivationChecklistForProvider, getProviderActivationReadinessReport, getProviderActivationSmokeTestPlan, getProviderActivationRollbackPlan, evaluateProviderActivationGate } from '../provider-activation-readiness/index.js';
import { validateProviderActivationReadinessReport } from '../../../../packages/schemas/src/provider-activation-readiness.schema.js';

export const runProviderActivationReadinessCoreTests = () => {
  const report = getProviderActivationReadinessReport();
  assert.equal(report.liveActivationAllowed, false);
  assert.equal(validateProviderActivationReadinessReport(report).ok, true);
  assert.equal(getProviderActivationChecklistForProvider('korapay').some((x)=>x.description.includes('webhook signature docs')), true);
  assert.equal(getProviderActivationChecklistForProvider('email_provider').some((x)=>x.description.includes('no live sends until activated')), true);
  assert.equal(getProviderActivationSmokeTestPlan('korapay')?.status, 'planned');
  assert.equal(getProviderActivationRollbackPlan('korapay')?.status, 'ready');
  const gate = evaluateProviderActivationGate({ mode:'production_live', approvals:[] });
  assert.equal(gate.allowed, false);
};
