import { NextResponse } from 'next/server';
import { PasswordPolicyError } from '@elceo/application-state';
import { credentialService } from '../../../../../lib/auth/credential-runtime';
export async function POST(request:Request){
  if(!credentialService)return NextResponse.json({error:'invalid_or_expired_token'},{status:400});
  try{const body=await request.json() as {token?:unknown;password?:unknown};if(typeof body.token!=='string'||typeof body.password!=='string')throw new Error('invalid');const result=await credentialService.confirmReset(body.token,body.password);return result==='reset'?NextResponse.json({reset:true}):NextResponse.json({error:'invalid_or_expired_token'},{status:400});}
  catch(error){return NextResponse.json({error:error instanceof PasswordPolicyError?'password_policy_rejected':'invalid_or_expired_token'},{status:400});}
}
