import {
  MemoryAccountEntitlementRepository,
  MemoryFeatureAccessDecisionRepository,
  MemoryUsageCounterRepository
} from '../persistence/index';
import { buildPlanProfile, getUsageWindow, decideFeatureAccess } from '../entitlements/index';
import { CanonicalEntitlementsBoundaryService } from '../runtime/canonical-entitlements-boundary';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runEntitlementsRuntimeCoreTests(): Promise<void> {
  const plan = buildPlanProfile('free', 'active', '2026-01-01T00:00:00.000Z');
  assert(plan.allowedFeatures.includes('workspace.read'), 'free allowed');
  const premium = buildPlanProfile('premium', 'active', '2026-01-01T00:00:00.000Z');
  assert(premium.allowedFeatures.includes('portfolio.write'), 'premium write');
  const admin = buildPlanProfile('admin_internal', 'active', '2026-01-01T00:00:00.000Z');
  assert(admin.blockedFeatures.length === 0, 'admin all');

  const window = getUsageWindow('weekly', '2026-01-07T12:00:00.000Z');
  assert(window.periodStart === '2026-01-05T00:00:00.000Z', 'week start monday');

  const decisionRepo = new MemoryFeatureAccessDecisionRepository();
  const decision = await decideFeatureAccess({
    account: {
      subjectKind: 'user',
      subjectId: 'u1',
      planKind: 'free',
      accountState: 'active',
      planStartedAt: null,
      planEndsAt: null,
      trialEndsAt: null,
      internalOverride: false,
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    planProfile: plan,
    feature: 'workspace.read',
    asOfIso: '2026-01-01T00:00:00.000Z',
    usageCounter: null,
    decisionRepo
  });
  assert(decision.accessLevel === 'allowed', 'allowed decision');

  const accountRepo = new MemoryAccountEntitlementRepository();
  const usageRepo = new MemoryUsageCounterRepository();
  const boundary = new CanonicalEntitlementsBoundaryService(accountRepo, usageRepo, decisionRepo);
  const state = await boundary.getAccountEntitlementState('user', 'u2');
  assert(state.planKind === 'free', 'default free');

  await boundary.updateAccountPlan('user', 'u2', 'premium');
  const premiumDecision = await boundary.decideFeatureAccess('user', 'u2', 'analytics.generate', '2026-01-01T00:00:00.000Z');
  assert(premiumDecision.accessLevel === 'allowed', 'premium analytics allowed');
}
