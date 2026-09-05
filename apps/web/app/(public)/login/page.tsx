import { credentialsAuthEnabled } from '../../../lib/auth/config';
import { SecureLoginClient } from './SecureLoginClient';

export default function LoginPage() {
  return <SecureLoginClient credentialsEnabled={credentialsAuthEnabled} />;
}
