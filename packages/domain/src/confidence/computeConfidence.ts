import { clamp } from '../shared/clamp';
import { weightedAverage } from '../shared/weightedAverage';
import type { ConfidenceInputs, ConfidenceOutput } from './types';

export function computeConfidence(inputs: ConfidenceInputs): ConfidenceOutput {
  const historicalPattern = inputs.historicalPattern ?? 50;
  const base = weightedAverage([
    { value: inputs.sourceConfidence, weight: 0.24 },
    { value: inputs.eventStrength, weight: 0.2 },
    { value: inputs.modelAgreement, weight: 0.2 },
    { value: inputs.priceConfirmation, weight: 0.2 },
    { value: historicalPattern, weight: 0.16 }
  ]);

  const total = clamp(base - inputs.contradictionPenalty * 0.45, 0, 100);

  return {
    total,
    anatomy: {
      sourceConfidence: clamp(inputs.sourceConfidence, 0, 100),
      eventStrength: clamp(inputs.eventStrength, 0, 100),
      modelAgreement: clamp(inputs.modelAgreement, 0, 100),
      priceConfirmation: clamp(inputs.priceConfirmation, 0, 100),
      historicalPattern: clamp(historicalPattern, 0, 100),
      contradictionPenalty: clamp(inputs.contradictionPenalty, 0, 100)
    }
  };
}
