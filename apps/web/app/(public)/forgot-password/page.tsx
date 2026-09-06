import { credentialsAuthEnabled } from '../../../lib/auth/config';
import { ForgotPasswordClient } from './ForgotPasswordClient';
export default function ForgotPasswordPage() { return <ForgotPasswordClient enabled={credentialsAuthEnabled} />; }
