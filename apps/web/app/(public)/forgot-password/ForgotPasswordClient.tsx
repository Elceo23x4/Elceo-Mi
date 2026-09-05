'use client';
import Link from 'next/link';
import { useState } from 'react';
export function ForgotPasswordClient({ enabled }: { enabled: boolean }) {
  const [email,setEmail]=useState(''); const [sent,setSent]=useState(false);
  if(!enabled)return <main className="elceo-auth-page"><section className="elceo-auth-shell"><div className="elceo-auth-actions"><h1>Password recovery unavailable</h1><Link href="/login">Return to login</Link></div></section></main>;
  return <main className="elceo-auth-page"><section className="elceo-auth-shell"><div className="elceo-auth-actions"><p className="elceo-kicker">ACCOUNT RECOVERY</p><h1>Reset your password</h1>{sent?<><p>If an eligible account exists, reset instructions will arrive shortly.</p><Link href="/login">Return to login</Link></>:<><label className="elceo-auth-label"><span>Email</span><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="elceo-pill-button elceo-pill-button-auth" onClick={async()=>{try{await fetch('/api/auth/password-reset/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});}finally{setSent(true);}}}>Send reset instructions</button></>}</div></section></main>;
}
