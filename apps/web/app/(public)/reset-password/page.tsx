import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordClient } from './ResetPasswordClient';
export const metadata: Metadata = { referrer: 'no-referrer', title: 'Reset password · ELCEO' };
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="elceo-auth-page" aria-busy="true" />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
