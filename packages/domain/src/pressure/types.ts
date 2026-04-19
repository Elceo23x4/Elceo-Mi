import type { DirectionalBias } from '../shared/types';

export type PressureComponent = {
  name: string;
  value: number;
};

export type PressureOutput = {
  bias: DirectionalBias;
  totalPressure: number;
  components: PressureComponent[];
};

export type PressureEvidenceInput = {
  realYieldPressure: number;
  dollarPressure: number;
  safeHavenPressure: number;
  policyPressure: number;
  eventShockPressure: number;
  growthPressure: number;
  liquidityPressure: number;
  sentimentPressure: number;
  macroDivergencePressure: number;
  policyDivergencePressure: number;
  yieldsPressure: number;
  eventSurprisePressure: number;
};
