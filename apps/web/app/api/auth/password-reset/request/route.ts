import { after } from 'next/server';
import { credentialService, credentialsActivation, resetDelivery } from '../../../../../lib/auth/credential-runtime';
import { handlePasswordResetRequest } from '../../../../../lib/auth/reset-request-handler';

export async function POST(request: Request) {
  return handlePasswordResetRequest(request, after, { service: credentialService, baseUrl: credentialsActivation.resetBaseUrl, delivery: resetDelivery });
}
