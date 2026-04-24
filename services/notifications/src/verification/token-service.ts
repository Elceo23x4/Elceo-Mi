import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export type VerificationTokenServiceOptions = { tokenGenerator?: () => string };

const defaultTokenGenerator = (): string => randomBytes(24).toString('base64url');

export function createVerificationTokenService(options: VerificationTokenServiceOptions = {}) {
  const generateVerificationToken = (): string => (options.tokenGenerator ?? defaultTokenGenerator)();

  const hashVerificationToken = (token: string): string => createHash('sha256').update(token).digest('hex');

  const compareVerificationToken = (token: string, tokenHash: string): boolean => {
    const tokenDigest = Buffer.from(hashVerificationToken(token), 'utf8');
    const persistedDigest = Buffer.from(tokenHash, 'utf8');
    if (tokenDigest.length !== persistedDigest.length) return false;
    return timingSafeEqual(tokenDigest, persistedDigest);
  };

  return { generateVerificationToken, hashVerificationToken, compareVerificationToken };
}
