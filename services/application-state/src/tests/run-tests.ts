async function main(): Promise<void> {
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process ??= { env: {} };
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process!.env ??= {};
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process!.env!.APP_STATE_REPOSITORY = 'memory';

  const { runApplicationStateTests } = await import('./application-state.test.js');
  const { runUserStateAccessTests } = await import('./user-state-access.test.js');
  const { runJournalPersistenceTests } = await import('./journal-persistence.test.js');
  const { runEntitlementEnforcementTests } = await import('./entitlement-enforcement.test.js');
  const { runSubscriptionMappingTests } = await import('./subscription-mapping.test.js');

  await runApplicationStateTests();
  await runUserStateAccessTests();
  await runJournalPersistenceTests();
  await runEntitlementEnforcementTests();
  await runSubscriptionMappingTests();
  console.log('application-state tests passed');
}

void main();
