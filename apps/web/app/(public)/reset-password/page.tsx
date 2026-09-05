import type { Metadata } from 'next';
import { ResetPasswordClient } from './ResetPasswordClient';
export const metadata: Metadata = { referrer: 'no-referrer', title: 'Reset password · ELCEO' };
export default function ResetPasswordPage() { return <ResetPasswordClient />; }
