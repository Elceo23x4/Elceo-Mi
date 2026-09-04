import type { UserProfileRecord } from '../types';
import { queryDb, withDbTransaction } from '../db/client';
import type { EncodedPasswordVerifier } from './password-crypto';

export type CredentialState = 'active' | 'reset_required';
export type CredentialAuthenticationRecord = {
  profile: UserProfileRecord;
  state: CredentialState | null;
  verifier: string | null;
};

type AuthRow = {
  id: string; email: string; name: string; role: UserProfileRecord['role']; plan_tier: UserProfileRecord['planTier'];
  terms_accepted: boolean; disclaimer_accepted: boolean; onboarding_completed_at: string | null;
  motion_intensity: UserProfileRecord['motionIntensity']; credential_state: CredentialState | null; password_hash: string | null;
};

const map = (row: AuthRow): CredentialAuthenticationRecord => ({
  profile: { id:row.id,email:row.email,name:row.name,role:row.role,planTier:row.plan_tier,termsAccepted:row.terms_accepted,disclaimerAccepted:row.disclaimer_accepted,onboardingCompletedAt:row.onboarding_completed_at,motionIntensity:row.motion_intensity },
  state: row.credential_state,
  verifier: row.password_hash
});

export interface CredentialRepository {
  findAuthenticationRecord(email: string): Promise<CredentialAuthenticationRecord | null>;
  replaceVerifier(userId: string, verifier: EncodedPasswordVerifier): Promise<void>;
  replaceVerifierIfCurrent(userId: string, expected: string, verifier: EncodedPasswordVerifier): Promise<boolean>;
  createResetToken(userId: string, digest: Buffer, expiresAt: Date): Promise<void>;
  revokeResetToken(digest: Buffer): Promise<void>;
  consumeResetToken(digest: Buffer, verifier: EncodedPasswordVerifier, now: Date): Promise<'consumed'|'invalid_or_expired'>;
}

export class PostgresCredentialRepository implements CredentialRepository {
  async findAuthenticationRecord(email: string): Promise<CredentialAuthenticationRecord | null> {
    const rows=await queryDb<AuthRow>(`SELECT p.id,p.email,p.name,p.role,p.plan_tier,p.terms_accepted,p.disclaimer_accepted,p.onboarding_completed_at,p.motion_intensity,c.credential_state,c.password_hash FROM app_user_profiles p LEFT JOIN app_auth_credentials c ON c.user_id=p.id WHERE lower(p.email)=lower($1)`,[email]);
    return rows[0] ? map(rows[0]) : null;
  }
  async replaceVerifier(userId:string,verifier:EncodedPasswordVerifier):Promise<void>{
    await queryDb(`INSERT INTO app_auth_credentials(user_id,password_hash,credential_state,password_updated_at,updated_at) VALUES($1,$2,'active',now(),now()) ON CONFLICT(user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,credential_state='active',password_updated_at=now(),updated_at=now()`,[userId,verifier]);
  }
  async replaceVerifierIfCurrent(userId:string,expected:string,verifier:EncodedPasswordVerifier):Promise<boolean>{
    const rows=await queryDb<{user_id:string}>(`UPDATE app_auth_credentials SET password_hash=$3,credential_state='active',password_updated_at=now(),updated_at=now() WHERE user_id=$1 AND credential_state='active' AND password_hash=$2 RETURNING user_id`,[userId,expected,verifier]); return rows.length===1;
  }
  async createResetToken(userId:string,digest:Buffer,expiresAt:Date):Promise<void>{await queryDb(`INSERT INTO app_password_reset_tokens(user_id,token_digest,expires_at) VALUES($1,$2,$3)`,[userId,digest,expiresAt]);}
  async revokeResetToken(digest:Buffer):Promise<void>{await queryDb(`UPDATE app_password_reset_tokens SET consumed_at=COALESCE(consumed_at,now()) WHERE token_digest=$1`,[digest]);}
  async consumeResetToken(digest:Buffer,verifier:EncodedPasswordVerifier,now:Date):Promise<'consumed'|'invalid_or_expired'>{
    return withDbTransaction(async tx=>{
      const result=await tx.query(`SELECT id,user_id FROM app_password_reset_tokens WHERE token_digest=$1 AND consumed_at IS NULL AND expires_at>$2 FOR UPDATE`,[digest,now]);
      const token=result.rows[0] as {id:string;user_id:string}|undefined; if(!token)return'invalid_or_expired';
      await tx.query(`INSERT INTO app_auth_credentials(user_id,password_hash,credential_state,password_updated_at,updated_at) VALUES($1,$2,'active',$3,$3) ON CONFLICT(user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,credential_state='active',password_updated_at=$3,updated_at=$3`,[token.user_id,verifier,now]);
      await tx.query(`UPDATE app_password_reset_tokens SET consumed_at=$2 WHERE user_id=$1 AND consumed_at IS NULL`,[token.user_id,now]);
      return 'consumed';
    });
  }
}
