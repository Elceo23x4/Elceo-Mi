<<<<<<< HEAD
import { clamp } from '../shared/clamp';
import { weightedAverage } from '../shared/weightedAverage';
import type { ContradictionInputs, ContradictionOutput } from './types';

export function computeContradiction(inputs: ContradictionInputs): ContradictionOutput {
  const directionMismatch = inputs.expectedDirection === inputs.realizedDirection ? 0 : 100;
  const timePressure = clamp((inputs.elapsedMinutes / 180) * 100, 0, 100);

  const score = clamp(
    weightedAverage([
      { value: directionMismatch, weight: 0.32 },
      { value: inputs.deviationMagnitude, weight: 0.24 },
      { value: timePressure, weight: 0.16 },
      { value: inputs.zoneProximity, weight: 0.14 },
      { value: inputs.regimeStress, weight: 0.14 }
    ]),
    0,
    100
  );

  const state = score >= 80 ? 'high_instability' : score >= 60 ? 'strong_divergence' : score >= 35 ? 'mild_divergence' : 'aligned';

  return { score, state };
}
=======
export {};
>>>>>>> origin/main
