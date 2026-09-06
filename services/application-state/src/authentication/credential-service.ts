import { createHash, randomBytes } from 'node:crypto';
import type { UserProfileRecord } from '../types';
import { DUMMY_PASSWORD_VERIFIER, hashPassword, needsPasswordRehash, verifyPassword } from './password-crypto';
import type { CredentialRepository } from './credential-repository';
import type { AttemptThrottle } from './login-throttle';

export type PasswordResetDelivery = { sendPasswordReset(input: { email: string; resetUrl: string }): Promise<boolean> };
export const GENERIC_RESET_RESPONSE = Object.freeze({ accepted: true } as const);
const digest = (token: string) => createHash('sha256').update(token, 'utf8').digest();

export class CredentialAuthenticationService {
  constructor(private readonly repo: CredentialRepository, private readonly loginThrottle: AttemptThrottle, private readonly resetThrottle: AttemptThrottle, private readonly hashNewPassword: typeof hashPassword = hashPassword) {}
  async authenticate(email: string, password: string): Promise<UserProfileRecord | null> {
    let admitted = false; try { admitted = (await this.loginThrottle.admit(email)).admitted; } catch { return null; }
    if (!admitted) return null;
    const record = await this.repo.findAuthenticationRecord(email);
    const eligible = record?.state === 'active' && typeof record.verifier === 'string';
    const valid = await verifyPassword(eligible ? record.verifier! : DUMMY_PASSWORD_VERIFIER, password);
    if (!eligible || !valid) return null;
    if (needsPasswordRehash(record.verifier!)) { const upgraded = await hashPassword(password); await this.repo.replaceVerifierIfCurrent(record.profile.id, record.verifier!, upgraded); }
    try { await this.loginThrottle.success(email); } catch { return null; }
    return record.profile;
  }
  async establishPassword(userId: string, newPassword: string): Promise<void> { await this.repo.replaceVerifier(userId, await this.hashNewPassword(newPassword)); }
  async rotatePassword(email: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const record = await this.repo.findAuthenticationRecord(email); if (record?.state !== 'active' || !record.verifier) return false;
    if (!await verifyPassword(record.verifier, currentPassword)) return false;
    return this.repo.replaceVerifierIfCurrent(record.profile.id, record.verifier, await hashPassword(newPassword));
  }
  async requestReset(email: string, baseUrl: URL, delivery: PasswordResetDelivery): Promise<typeof GENERIC_RESET_RESPONSE> {
    let admitted = false; try { admitted = (await this.resetThrottle.admit(email)).admitted; } catch { return GENERIC_RESET_RESPONSE; }
    if (!admitted) return GENERIC_RESET_RESPONSE;
    const record = await this.repo.findAuthenticationRecord(email);
    await verifyPassword(DUMMY_PASSWORD_VERIFIER, 'reset-request-timing-input');
    if (!record) return GENERIC_RESET_RESPONSE;
    const token = randomBytes(32).toString('base64url'); const tokenDigest = digest(token);
    await this.repo.replaceResetToken(record.profile.id, tokenDigest, new Date(Date.now() + 15 * 60_000));
    const resetUrl = new URL('/reset-password', baseUrl); resetUrl.searchParams.set('token', token);
    let sent = false; try { sent = await delivery.sendPasswordReset({ email: record.profile.email, resetUrl: resetUrl.toString() }); } catch { sent = false; }
    if (!sent) await this.repo.revokeResetToken(tokenDigest);
    return GENERIC_RESET_RESPONSE;
  }
  async confirmReset(token: string, newPassword: string): Promise<'reset' | 'invalid_or_expired'> {
    let bytes: Buffer; try { bytes = Buffer.from(token, 'base64url'); } catch { return 'invalid_or_expired'; }
    if (bytes.length !== 32) return 'invalid_or_expired';
    const tokenDigest = digest(token); const now = new Date();
    if (!await this.repo.isResetTokenUsable(tokenDigest, now)) return 'invalid_or_expired';
    const verifier = await this.hashNewPassword(newPassword);
    return (await this.repo.consumeResetToken(tokenDigest, verifier, now)) === 'consumed' ? 'reset' : 'invalid_or_expired';
  }
}
