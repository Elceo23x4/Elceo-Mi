import type { BillingOrchestrationRun } from '@elceo/types';
import { validateBillingOrchestrationRun } from '@elceo/schemas';

export const serializeBillingOrchestrationRun = (run: BillingOrchestrationRun): string => JSON.stringify(run);

export const deserializeBillingOrchestrationRun = (raw: string): BillingOrchestrationRun => {
  const parsed = JSON.parse(raw) as unknown;
  const result = validateBillingOrchestrationRun(parsed);
  if (result.ok === true) {
    return result.value;
  }

  throw new Error(`invalid orchestration run: ${result.errors.join(',')}`);
};
