import assert from 'node:assert/strict';
import argon2 from 'argon2';
import { hashPassword, needsPasswordRehash, PASSWORD_POLICY, PasswordPolicyError, verifyPassword } from '../authentication/password-crypto.js';

export async function runPasswordCryptoTests():Promise<void>{
  const decomposed='Cafe\u0301 password with spaces';
  const composed='Café password with spaces';
  const first=await hashPassword(decomposed); const second=await hashPassword(composed);
  assert.match(first,/^\$argon2id\$v=19\$m=19456,[^$]*t=2[^$]*,p=1\$|^\$argon2id\$v=19\$m=19456,[^$]*p=1[^$]*,t=2\$/);
  assert.notEqual(first,second,'random salts must produce distinct verifiers');
  assert.equal(await verifyPassword(first,composed),true);
  assert.equal(await verifyPassword(first,'Café password is wrong'),false);
  assert.equal(await verifyPassword('plaintext-looking-legacy-value',decomposed),false);
  assert.equal(await verifyPassword('$argon2id$malformed',decomposed),false);
  await assert.rejects(()=>hashPassword('too short'),PasswordPolicyError);
  const long='🐋'.repeat(PASSWORD_POLICY.maximumCodePoints);
  const longHash=await hashPassword(long); assert.equal(await verifyPassword(longHash,long),true); assert.equal(await verifyPassword(longHash,long.slice(0,-1)),false);
  const weak=await argon2.hash(composed,{type:argon2.argon2id,memoryCost:8192,timeCost:1,parallelism:1});
  assert.equal(needsPasswordRehash(weak),true); assert.equal(needsPasswordRehash(first),false);
}
