import { computeFreshnessState } from '@elceo/domain';
import type { FreshnessState, ReasoningInputFrame } from '@elceo/types';
import { REASONING_COMPONENTS_VERSION } from './constants';
import { maxEventMaterialTime, parseIsoOrThrow } from './utils';

export function composeFreshnessState(input: ReasoningInputFrame): FreshnessState {
  parseIsoOrThrow(input.asOf, 'asOf');
  const latestMaterial = maxEventMaterialTime(input.events, input.asOf);

  return computeFreshnessState({
    timeframe: input.timeframe,
    hoursSinceLastMaterialUpdate: latestMaterial.hoursSinceLastMaterialUpdate,
    lastMaterialUpdateAt: latestMaterial.lastMaterialUpdateAt,
    componentsVersion: REASONING_COMPONENTS_VERSION
  });
}
