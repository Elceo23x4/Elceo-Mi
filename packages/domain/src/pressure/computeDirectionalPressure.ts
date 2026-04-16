import { clamp } from '../shared/clamp';
import type { PressureEvidenceInput, PressureOutput } from './types';

const goldSet = ['XAU/USD'] as const;
const equitySet = ['Nasdaq 100', 'S&P 500', 'DE30'] as const;
const btcSet = ['BTC/USD'] as const;

function biasFromTotal(total: number): 'bullish' | 'bearish' | 'neutral' {
  if (total >= 18) return 'bullish';
  if (total <= -18) return 'bearish';
  return 'neutral';
}

export function computeDirectionalPressure(assetCode: string, evidence: PressureEvidenceInput): PressureOutput {
  const components =
    goldSet.includes(assetCode as (typeof goldSet)[number])
      ? [
          { name: 'real_yield_pressure', value: evidence.realYieldPressure },
          { name: 'dollar_pressure', value: evidence.dollarPressure },
          { name: 'safe_haven_pressure', value: evidence.safeHavenPressure },
          { name: 'policy_pressure', value: evidence.policyPressure },
          { name: 'event_shock_pressure', value: evidence.eventShockPressure }
        ]
      : equitySet.includes(assetCode as (typeof equitySet)[number])
        ? [
            { name: 'rates_pressure', value: evidence.yieldsPressure },
            { name: 'growth_pressure', value: evidence.growthPressure },
            { name: 'liquidity_pressure', value: evidence.liquidityPressure },
            { name: 'sentiment_pressure', value: evidence.sentimentPressure },
            { name: 'event_shock_pressure', value: evidence.eventShockPressure }
          ]
        : btcSet.includes(assetCode as (typeof btcSet)[number])
          ? [
              { name: 'liquidity_pressure', value: evidence.liquidityPressure },
              { name: 'dollar_pressure', value: evidence.dollarPressure },
              { name: 'risk_sentiment_pressure', value: evidence.sentimentPressure },
              { name: 'event_shock_pressure', value: evidence.eventShockPressure }
            ]
          : [
              { name: 'macro_divergence_pressure', value: evidence.macroDivergencePressure },
              { name: 'policy_divergence_pressure', value: evidence.policyDivergencePressure },
              { name: 'yields_pressure', value: evidence.yieldsPressure },
              { name: 'event_surprise_pressure', value: evidence.eventSurprisePressure }
            ];

  const totalPressure = clamp(components.reduce((sum, c) => sum + c.value, 0), -100, 100);

  return {
    bias: biasFromTotal(totalPressure),
    totalPressure,
    components
  };
}
