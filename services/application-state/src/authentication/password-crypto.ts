import argon2 from 'argon2';

export const PASSWORD_POLICY = Object.freeze({
  minimumCodePoints: 15,
  maximumCodePoints: 256,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32
});

export type EncodedPasswordVerifier = string & { readonly __encodedPasswordVerifier: unique symbol };

export class PasswordPolicyError extends Error {
  constructor() { super('password_policy_rejected'); }
}

export function normalizePassword(password: string): string {
  return password.normalize('NFC');
}

export function validatePasswordPolicy(password: string): string {
  const normalized = normalizePassword(password);
  const length = Array.from(normalized).length;
  if (length < PASSWORD_POLICY.minimumCodePoints || length > PASSWORD_POLICY.maximumCodePoints) throw new PasswordPolicyError();
  return normalized;
}

export async function hashPassword(password: string): Promise<EncodedPasswordVerifier> {
  return argon2.hash(validatePasswordPolicy(password), {
    type: argon2.argon2id,
    version: 0x13,
    memoryCost: PASSWORD_POLICY.memoryCost,
    timeCost: PASSWORD_POLICY.timeCost,
    parallelism: PASSWORD_POLICY.parallelism,
    hashLength: PASSWORD_POLICY.hashLength
  }) as Promise<EncodedPasswordVerifier>;
}

export async function verifyPassword(verifier: string, password: string): Promise<boolean> {
  if (!verifier.startsWith('$argon2id$')) return false;
  try {
    return await argon2.verify(verifier, normalizePassword(password));
  } catch {
    return false;
  }
}

export function needsPasswordRehash(verifier: string): boolean {
  if (!verifier.startsWith('$argon2id$')) return true;
  try {
    return argon2.needsRehash(verifier, {
      memoryCost: PASSWORD_POLICY.memoryCost,
      timeCost: PASSWORD_POLICY.timeCost,
      parallelism: PASSWORD_POLICY.parallelism
    });
  } catch {
    return true;
  }
}

// A fixed valid verifier prevents the missing/inactive-account path from skipping Argon2.
// It encodes no product or user secret.
export const DUMMY_PASSWORD_VERIFIER = '$argon2id$v=19$m=19456,t=2,p=1$dGltaW5nLW9ubHktc2FsdA$ZiZQbDuplC7g25exDGEGhvFjW6VkE9BNuZYZRdAcqUg';
