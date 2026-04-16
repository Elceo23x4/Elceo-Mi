<<<<<<< HEAD
import type { RiskInput, RiskOutput } from './types';

export function calculateRiskAmount(input: RiskInput): RiskOutput {
  return {
    riskAmount: input.accountBalance * (input.riskPercent / 100)
  };
}
=======
export {};
>>>>>>> origin/main
