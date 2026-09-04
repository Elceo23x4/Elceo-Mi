import { createHash, randomBytes } from 'node:crypto';
import type { UserProfileRecord } from '../types';
import { DUMMY_PASSWORD_VERIFIER, hashPassword, needsPasswordRehash, verifyPassword } from './password-crypto';
import type { CredentialRepository } from './credential-repository';
import type { LoginThrottle } from './login-throttle';

export type PasswordResetDelivery = { sendPasswordReset(input:{email:string;resetUrl:string}):Promise<boolean> };
export const GENERIC_RESET_RESPONSE=Object.freeze({accepted:true} as const);
const digest=(token:string)=>createHash('sha256').update(token,'utf8').digest();

export class CredentialAuthenticationService {
  constructor(private repo:CredentialRepository,private throttle:LoginThrottle){}
  async authenticate(email:string,password:string):Promise<UserProfileRecord|null>{
    let allowed=false; try{allowed=await this.throttle.check(email);}catch{return null;}
    const record=await this.repo.findAuthenticationRecord(email);
    const eligible=record?.state==='active'&&typeof record.verifier==='string';
    const valid=await verifyPassword(eligible?record.verifier!:DUMMY_PASSWORD_VERIFIER,password);
    if(!allowed||!eligible||!valid){try{await this.throttle.fail(email);}catch{return null;}return null;}
    if(needsPasswordRehash(record.verifier!)){const upgraded=await hashPassword(password);await this.repo.replaceVerifierIfCurrent(record.profile.id,record.verifier!,upgraded);}
    try{await this.throttle.success(email);}catch{return null;}
    return record.profile;
  }
  async establishPassword(userId:string,newPassword:string){await this.repo.replaceVerifier(userId,await hashPassword(newPassword));}
  async rotatePassword(email:string,currentPassword:string,newPassword:string):Promise<boolean>{
    const record=await this.repo.findAuthenticationRecord(email); if(record?.state!=='active'||!record.verifier)return false;
    if(!await verifyPassword(record.verifier,currentPassword))return false;
    return this.repo.replaceVerifierIfCurrent(record.profile.id,record.verifier,await hashPassword(newPassword));
  }
  async requestReset(email:string,origin:string,delivery:PasswordResetDelivery):Promise<typeof GENERIC_RESET_RESPONSE>{
    const record=await this.repo.findAuthenticationRecord(email);
    // Equalize the dominant crypto work even though reset requests never inspect a password.
    await verifyPassword(DUMMY_PASSWORD_VERIFIER,'reset-request-timing-input');
    if(!record)return GENERIC_RESET_RESPONSE;
    const token=randomBytes(32).toString('base64url'); const tokenDigest=digest(token);
    await this.repo.createResetToken(record.profile.id,tokenDigest,new Date(Date.now()+15*60_000));
    let sent=false; try{sent=await delivery.sendPasswordReset({email:record.profile.email,resetUrl:`${origin.replace(/\/$/,'')}/reset-password?token=${encodeURIComponent(token)}`});}catch{sent=false;}
    if(!sent)await this.repo.revokeResetToken(tokenDigest);
    return GENERIC_RESET_RESPONSE;
  }
  async confirmReset(token:string,newPassword:string):Promise<'reset'|'invalid_or_expired'>{
    let bytes:Buffer; try{bytes=Buffer.from(token,'base64url');}catch{return'invalid_or_expired';} if(bytes.length!==32)return'invalid_or_expired';
    return (await this.repo.consumeResetToken(digest(token),await hashPassword(newPassword),new Date()))==='consumed'?'reset':'invalid_or_expired';
  }
}
