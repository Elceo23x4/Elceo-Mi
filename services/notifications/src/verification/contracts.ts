export type VerificationFailureReason =
  | 'missing_active_verification'
  | 'verification_expired'
  | 'invalid_verification_token'
  | 'target_not_found'
  | 'unsupported_verification_target_kind';
