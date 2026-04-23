import { MemoryNotificationDeliveryTransport } from '../delivery/transport.js';
import { buildDecision, buildDecisionRecord } from './test-fixtures.js';
import { buildChannelPayloadForDecision } from '../delivery/payload-builders.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runTransportTests(): Promise<void> {
  const decision = buildDecision();
  const record = buildDecisionRecord();
  const payload = buildChannelPayloadForDecision(record, decision, 'in_app');

  const transport = new MemoryNotificationDeliveryTransport();
  const success = await transport.send('in_app', payload);
  assert(success.success === true, 'memory transport should succeed by default');
  assert(success.providerMessageId !== null, 'success should include provider message id');

  const failing = new MemoryNotificationDeliveryTransport({ in_app: { errorCode: 'forced_failure', errorMessage: 'forced_failure' } });
  const failure = await failing.send('in_app', payload);
  assert(failure.success === false, 'memory transport should support deterministic failure injection');
  assert(failure.errorCode === 'forced_failure', 'failure should preserve errorCode');
}
