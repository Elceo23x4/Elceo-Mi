import { roundScore } from '@elceo/domain';
import type { CanonicalCognitionState } from '@elceo/types';
import type { InvalidationDelta } from './contracts';

export function buildInvalidationDelta(previous: CanonicalCognitionState, current: CanonicalCognitionState): InvalidationDelta {
  const previousPrimaryPrice = previous.invalidation.primary?.price ?? null;
  const currentPrimaryPrice = current.invalidation.primary?.price ?? null;

  return {
    previousPrimaryPrice,
    currentPrimaryPrice,
    priceChanged: previousPrimaryPrice !== currentPrimaryPrice,
    absolutePriceDelta:
      previousPrimaryPrice === null || currentPrimaryPrice === null
        ? 0
        : roundScore(Math.abs(currentPrimaryPrice - previousPrimaryPrice)),
    previousRiskLabel: previous.invalidation.riskLabel ?? null,
    currentRiskLabel: current.invalidation.riskLabel ?? null,
    riskLabelChanged: (previous.invalidation.riskLabel ?? null) !== (current.invalidation.riskLabel ?? null)
  };
}
