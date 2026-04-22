import { MemoryIngestionRuntimeLeaseRepository } from '../scheduler/lease-repository';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export async function runSchedulerLeaseRepositoryTests(): Promise<void> {
  const repo = new MemoryIngestionRuntimeLeaseRepository();

  const first = await repo.acquireLease({
    requestKey: 'scheduled|XAU/USD|H1|hourly|2026-04-22T10:00:00.000Z|canonical',
    asset: 'XAU/USD',
    timeframe: 'H1',
    mode: 'canonical',
    triggerKind: 'scheduled',
    slotStartAt: '2026-04-22T10:00:00.000Z',
    slotEndAt: '2026-04-22T11:00:00.000Z',
    leaseHolder: 'tick-a',
    acquiredAt: '2026-04-22T10:00:00.000Z',
    expiresAt: '2026-04-22T10:45:00.000Z'
  });
  assert(first.acquired, 'first lease acquisition should succeed');

  const second = await repo.acquireLease({
    requestKey: 'scheduled|XAU/USD|H1|hourly|2026-04-22T10:00:00.000Z|canonical',
    asset: 'XAU/USD',
    timeframe: 'H1',
    mode: 'canonical',
    triggerKind: 'scheduled',
    slotStartAt: '2026-04-22T10:00:00.000Z',
    slotEndAt: '2026-04-22T11:00:00.000Z',
    leaseHolder: 'tick-b',
    acquiredAt: '2026-04-22T10:02:00.000Z',
    expiresAt: '2026-04-22T10:47:00.000Z'
  });
  assert(!second.acquired, 'second acquire should fail while lease is active');

  const expiredCount = await repo.cleanupExpiredLeases('2026-04-22T10:46:00.000Z');
  assert(expiredCount === 1, 'cleanup should mark active expired leases as expired');

  const reacquired = await repo.acquireLease({
    requestKey: 'scheduled|XAU/USD|H1|hourly|2026-04-22T10:00:00.000Z|canonical',
    asset: 'XAU/USD',
    timeframe: 'H1',
    mode: 'canonical',
    triggerKind: 'scheduled',
    slotStartAt: '2026-04-22T10:00:00.000Z',
    slotEndAt: '2026-04-22T11:00:00.000Z',
    leaseHolder: 'tick-c',
    acquiredAt: '2026-04-22T10:46:00.000Z',
    expiresAt: '2026-04-22T11:31:00.000Z'
  });
  assert(reacquired.acquired, 're-acquisition should succeed after lease expiry');

  await repo.releaseLease('scheduled|XAU/USD|H1|hourly|2026-04-22T10:00:00.000Z|canonical', '2026-04-22T10:50:00.000Z');
  const released = await repo.getLeaseByRequestKey('scheduled|XAU/USD|H1|hourly|2026-04-22T10:00:00.000Z|canonical');
  assert(released?.status === 'released', 'release should update lease status to released');
}
