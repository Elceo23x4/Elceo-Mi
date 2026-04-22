import { buildManualRequestKey, buildReplayRequestKey, buildScheduledRequestKey } from '../scheduler/request-key';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runSchedulerRequestKeyTests(): void {
  const scheduled = buildScheduledRequestKey('XAU/USD', 'H1', 'hourly', '2026-04-22T10:00:00.000Z', 'canonical');
  assert(scheduled === 'scheduled|XAU/USD|H1|hourly|2026-04-22T10:00:00.000Z|canonical', 'scheduled request key format should be deterministic');

  const manual = buildManualRequestKey('XAU/USD', 'H1', '2026-04-22T10:07:00.000Z');
  const replay = buildReplayRequestKey('XAU/USD', 'H1', 'run-123');

  assert(manual !== scheduled, 'manual request key should differ from scheduled key');
  assert(replay !== scheduled && replay !== manual, 'replay request key should be distinct from scheduled/manual');
}
