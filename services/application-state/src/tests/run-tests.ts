async function main(): Promise<void> {
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process ??= { env: {} };
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process!.env ??= {};
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process!.env!.APP_STATE_REPOSITORY = 'memory';

  const { runApplicationStateTests } = await import('./application-state.test.js');
  const { runUserStateAccessTests } = await import('./user-state-access.test.js');
  const { runJournalPersistenceTests } = await import('./journal-persistence.test.js');
  const { runEntitlementEnforcementTests } = await import('./entitlement-enforcement.test.js');
  const { runSubscriptionMappingTests } = await import('./subscription-mapping.test.js');
  const { runJournalDomainCoreTests } = await import('./journal-domain-core.test.js');
  const { runJournalInfluenceEngineTests } = await import('./journal-influence-engine.test.js');
  const { runPortfolioDomainCoreTests } = await import('./portfolio-domain-core.test.js');
  const { runWorkspaceSnapshotEngineTests } = await import('./workspace-snapshot-engine.test.js');
  const { runSnapshotRefreshRuntimeTests } = await import('./snapshot-refresh-runtime.test.js');
  const { runOpsRuntimeTests } = await import('./ops-runtime.test.js');
  const { runAdminControlPlaneTests } = await import('./admin-control-plane.test.js');
  const { runEntitlementsRuntimeCoreTests } = await import('./entitlements-runtime-core.test.js');

  await runApplicationStateTests();
  await runUserStateAccessTests();
  await runJournalPersistenceTests();
  await runEntitlementEnforcementTests();
  await runSubscriptionMappingTests();
  await runJournalDomainCoreTests();
  await runJournalInfluenceEngineTests();
  await runPortfolioDomainCoreTests();
  await runWorkspaceSnapshotEngineTests();
  await runSnapshotRefreshRuntimeTests();
  await runOpsRuntimeTests();
  await runAdminControlPlaneTests();
  await runEntitlementsRuntimeCoreTests();
  console.log('application-state tests passed');
}

void main();
