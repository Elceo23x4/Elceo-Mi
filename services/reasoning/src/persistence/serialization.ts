import { validateCanonicalCognitionState } from '@elceo/schemas';
import type { CanonicalCognitionState } from '@elceo/types';

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error('malformed_json');
  }
}

export function serializeCanonicalCognitionState(cognition: CanonicalCognitionState): string {
  return JSON.stringify(cognition);
}

export function deserializeCanonicalCognitionState(json: string): CanonicalCognitionState {
  const parsed = parseJson(json);
  const validated = validateCanonicalCognitionState(parsed);
  if (validated.ok === false) {
    throw new Error(`invalid_canonical_cognition_state:${validated.errors.join('; ')}`);
  }
  return validated.value;
}
