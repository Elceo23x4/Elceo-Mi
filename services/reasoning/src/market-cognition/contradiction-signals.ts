import type { MarketContradictionFlag, MarketCognitionSignal, MarketCognitionSignalKind } from '@elceo/types';

type PairRule = { left: MarketCognitionSignalKind; right: MarketCognitionSignalKind; rationale: string };
const pairs: PairRule[] = [
  { left: 'macro_pressure', right: 'policy_pressure', rationale: 'macro_policy_opposition' },
  { left: 'liquidity_pressure', right: 'risk_sentiment_pressure', rationale: 'liquidity_sentiment_divergence' },
  { left: 'volatility_pressure', right: 'risk_sentiment_pressure', rationale: 'high_vol_with_risk_on' },
  { left: 'credit_stress_pressure', right: 'earnings_pressure', rationale: 'credit_stress_vs_earnings' }
];

export function buildContradictionFlags(snapshot:{asset:string;horizon:string;generatedAt:string},signals:MarketCognitionSignal[]): MarketContradictionFlag[] { const map=new Map(signals.map((s)=>[s.kind,s])); const out:MarketContradictionFlag[]=[]; for(const rule of pairs){ const x=map.get(rule.left); const y=map.get(rule.right); if(!x||!y) continue; const oppose=(x.direction==='bullish'&&y.direction==='bearish')||(x.direction==='bearish'&&y.direction==='bullish')||(rule.left==='volatility_pressure'&&x.strength>=65&&y.direction==='bullish'); if(!oppose) continue; out.push({flagId:`flag|${snapshot.asset}|${snapshot.horizon}|${rule.left}|${rule.right}|${snapshot.generatedAt}`,asset:snapshot.asset as never,horizon:snapshot.horizon as never,generatedAt:snapshot.generatedAt,severity:x.severity==='critical'||y.severity==='critical'?'critical':'high',conflictingSignalKinds:[x.kind,y.kind],evidenceItemIds:[...x.evidenceItemIds,...y.evidenceItemIds],rationale:rule.rationale}); } return out; }
