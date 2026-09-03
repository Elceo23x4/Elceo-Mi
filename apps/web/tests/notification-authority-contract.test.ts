import assert from 'node:assert/strict';
import { buildPublicTargetAddress } from '../lib/server/notifications/target-address';
import { toPublicVerificationIssue } from '../lib/server/notifications/public-verification';

export function runNotificationAuthorityContractTests(): void {
  assert.deepEqual(buildPublicTargetAddress('in_app', undefined, 'user-1'), { targetKind: 'in_app_user', addressJson: '{"userId":"user-1"}' });
  assert.deepEqual(buildPublicTargetAddress('email', ' User@Example.COM ', 'user-1'), { targetKind: 'email_address', addressJson: '{"email":"user@example.com"}' });
  assert.deepEqual(buildPublicTargetAddress('push', ' endpoint-token ', 'user-1'), { targetKind: 'push_endpoint', addressJson: '{"endpoint":"endpoint-token"}' });
  assert.throws(() => buildPublicTargetAddress('sms', '+15550000000', 'user-1'), /unsupported_notification_target_channel/);
  assert.throws(() => buildPublicTargetAddress('webhook', 'https:\/\/example.test', 'user-1'), /unsupported_notification_target_channel/);
  const publicResult = toPublicVerificationIssue({ verificationId:'v1', targetId:'t1', verificationKind:'email_verification', issuedAt:'2026-01-01T00:00:00.000Z', expiresAt:'2026-01-02T00:00:00.000Z', rawToken:'secret', alreadyActive:false });
  assert.deepEqual(publicResult, { verificationId:'v1', targetId:'t1', verificationKind:'email_verification', issuedAt:'2026-01-01T00:00:00.000Z', expiresAt:'2026-01-02T00:00:00.000Z', alreadyActive:false });
  assert.equal('rawToken' in publicResult, false);
  assert.equal('tokenHash' in publicResult, false);
}
