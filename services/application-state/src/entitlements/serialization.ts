import { validateFeatureAccessDecision } from '@elceo/schemas';
import type { FeatureAccessDecision } from '@elceo/types';

export function deserializeFeatureDecision(json: string): FeatureAccessDecision {
  const parsed = JSON.parse(json) as unknown;
  const result = validateFeatureAccessDecision(parsed);
  if (result.ok === true) return result.value;
  throw new Error(`validation_error:${result.errors.join('|')}`);
}
