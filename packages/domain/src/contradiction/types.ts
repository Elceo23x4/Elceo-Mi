import type { ContradictionState, DirectionalBias } from '../shared/types';

export type ContradictionInputs = {
  expectedDirection: DirectionalBias;
  realizedDirection: DirectionalBias;
  deviationMagnitude: number;
  elapsedMinutes: number;
  zoneProximity: number;
  regimeStress: number;
};

export type ContradictionOutput = {
  score: number;
  state: ContradictionState;
};
