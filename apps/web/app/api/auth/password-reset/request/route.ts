import { NextResponse } from 'next/server';
import { credentialService, resetDelivery } from '../../../../../lib/auth/credential-runtime';

const RESPONSE={accepted:true};
export async function POST(request:Request){
  if(!credentialService)return NextResponse.json(RESPONSE,{status:202});
  let email='';try{const body=await request.json() as {email?:unknown};email=typeof body.email==='string'?body.email.trim():'';}catch{/* generic response */}
  if(email)await credentialService.requestReset(email,new URL(request.url).origin,resetDelivery);
  return NextResponse.json(RESPONSE,{status:202});
}
