import type { BehaviorPatternSignals, DataScientistCoachingReport, PerformanceSnapshot } from './types';

function confidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 65) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export function shapeCoachingOutput(performance: PerformanceSnapshot, behavior: BehaviorPatternSignals): DataScientistCoachingReport {
  const processScore = Math.max(0, Math.min(100, performance.winRate + performance.expectancy * 10 - behavior.biasViolationRate * 0.4));

  const diagnosis =
    performance.totalTrades < 10
      ? 'Sample size is thin; prioritize consistent tagging and risk consistency before making major strategy shifts.'
      : behavior.overtradingSignals.length || behavior.confidenceMismatchPatterns.length
        ? 'Execution variance is degrading edge realization; reduce discretionary exposure and tighten pre-trade checklist compliance.'
        : 'Current process is stable with measurable edge; focus on compounding best-session and best-asset execution routines.';

  const evidence: DataScientistCoachingReport['evidence'] = [
    {
      metric: 'Win rate',
      value: `${performance.winRate.toFixed(1)}%`,
      interpretation: 'Outcome frequency should be evaluated with expectancy to avoid false confidence.'
    },
    {
      metric: 'Expectancy (R)',
      value: performance.expectancy.toFixed(2),
      interpretation: 'Positive expectancy indicates scalable edge when position sizing is controlled.'
    },
    {
      metric: 'Bias violation rate',
      value: `${behavior.biasViolationRate.toFixed(1)}%`,
      interpretation: 'Higher violation rates typically correlate with lower process discipline.'
    }
  ];

  const interventions: DataScientistCoachingReport['interventions'] = [
    {
      action: 'Cap daily trades to 3 unless first two trades follow plan and remain positive expectancy.',
      targetMetric: 'Overtrading frequency',
      successCriteria: 'Zero 4+ trade cluster days over next 2 weeks.'
    },
    {
      action: 'Block low-expectancy sessions from playbook until review is complete.',
      targetMetric: 'Session expectancy',
      successCriteria: 'All active sessions maintain non-negative expectancy over 20 trades.'
    },
    {
      action: 'Require ELCEO bias alignment note before order placement.',
      targetMetric: 'Bias violation rate',
      successCriteria: 'Bias violation rate below 15% for next rolling 30 trades.'
    }
  ];

  return {
    summary: {
      diagnosis,
      confidenceLevel: confidenceLevel(processScore)
    },
    evidence,
    interventions,
    monitoringPlan: [
      'Recompute analytics after every new journal close event.',
      'Track rolling 20-trade expectancy and rolling bias violation rate.',
      'Escalate coaching priority when confidence mismatch warnings persist for 2 consecutive weeks.'
    ]
  };
}
