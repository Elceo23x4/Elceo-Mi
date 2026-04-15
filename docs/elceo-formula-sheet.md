# ELCEO Formula Sheet

## Core principles

All important scores must be:
- deterministic
- normalized
- composable
- tunable through config
- exposed with breakdowns where useful

## Core normalization

Use a 0 to 100 normalization for bounded scores and -100 to 100 for signed directional pressure where needed.

## Risk and position sizing

Inputs:
- accountBalance
- riskPercent
- entryPrice
- stopPrice
- targetPrice optional
- accountCurrency
- assetType
- contractSize optional
- pipSize optional
- quoteToAccountRate optional
- volatilityMultiplier optional
- eventRiskMultiplier optional

Outputs:
- riskAmount
- stopDistance
- positionSize
- rewardAmount optional
- riskRewardRatio optional
- nominalExposure
- warnings

Rules:
- throw on zero stop distance
- support forex, gold, index CFD, crypto, and generic sizing
- reduce effective size when volatility or event risk multipliers are elevated

## H4 zone significance

Inputs:
- touches
- reactionMagnitudeAtr
- hoursSinceLastTouch
- breakoutRetestBonus optional

Components:
- touch score
- reaction score
- recency score
- breakout retest score

Final:
weighted normalized total with configurable weights

## Impulse detection

Inputs:
- candleSize
- averageCandleSize
- moveDistanceAtr
- followThroughBars

Use:
- candle expansion
- move distance in ATR terms
- follow-through persistence

## Macro surprise

Inputs:
- actual
- forecast
- expectedRange
- polarity

Outputs:
- signedSurprise
- magnitude
- directionalEffect

## Directional pressure

Aggregate signed weighted components per asset.
Use thresholds to convert the total into bullish, bearish, or neutral.

## Confidence

Combine:
- source confidence
- event strength
- model agreement
- price confirmation
- historical pattern confidence
- contradiction penalty

Expose both total and breakdown.

## Contradiction

Combine:
- expected direction
- realized price direction
- deviation magnitude
- elapsed time
- zone proximity

Convert into:
- aligned
- mild_divergence
- strong_divergence
- high_instability

## Freshness decay

Use event-class-aware decay over time rather than flat timers.

## Ranking

Combine:
- portfolio relevance
- recency
- significance
- confidence
- volatility
- contradiction

## Behavior metrics

Compute:
- total trades
- win rate
- expectancy
- profit factor

Deterministic analytics first, explanation second.
