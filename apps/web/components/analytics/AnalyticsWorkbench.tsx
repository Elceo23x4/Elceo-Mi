import { Reveal } from '@elceo/motion';
import type { JournalAnalyticsResult } from '@elceo/analytics';
import { Surface } from '@elceo/ui';
import { PrivateCommandBand, SurfaceHeader, SystemChip } from '../private-workspace/SurfacePrimitives';

export function AnalyticsWorkbench({ report, canAccessBehaviorCoaching }: { report: JournalAnalyticsResult; canAccessBehaviorCoaching: boolean }) {
  const mismatchSignals = report.behavior.confidenceMismatchPatterns;
  const overtradeSignals = report.behavior.overtradingSignals;

  return (
    <div className="elceo-private-page elceo-private-page-analytics">
      <Reveal>
        <PrivateCommandBand
          kicker="ANALYTICS · DIAGNOSIS LAB"
          title="Behavioral performance intelligence"
          meta={`Period: rolling journal history · Snapshot: ${report.performance.totalTrades} trades · Coaching ${canAccessBehaviorCoaching ? 'enabled' : 'limited'}`}
          chips={[
            { label: `Expectancy ${report.performance.expectancy.toFixed(2)}R`, tone: 'signal' },
            { label: `Win rate ${report.performance.winRate.toFixed(1)}%`, tone: 'neutral' },
            { label: canAccessBehaviorCoaching ? 'Plan depth unlocked' : 'Plan depth constrained', tone: canAccessBehaviorCoaching ? 'accent' : 'risk' }
          ]}
        />
      </Reveal>

      <div className="elceo-private-grid elceo-private-grid-analytics-top">
        <Reveal delayMs={70}>
          <Surface className="elceo-private-panel elceo-performance-board" style={{ padding: '1rem' }}>
            <SurfaceHeader kicker="PERFORMANCE BOARD" title="Deterministic performance hierarchy" />
            <div className="elceo-performance-hero-metric">
              <p>Total trades</p>
              <h2>{report.performance.totalTrades}</h2>
              <span>Avg risk-reward {report.performance.averageRiskReward.toFixed(2)}</span>
            </div>
            <div className="elceo-metric-ribbon-grid">
              <article><strong>{report.performance.winRate.toFixed(1)}%</strong><span>Win rate</span></article>
              <article><strong>{report.performance.expectancy.toFixed(2)}R</strong><span>Expectancy</span></article>
              <article><strong>{report.performance.averageGain.toFixed(1)}</strong><span>Avg gain</span></article>
              <article><strong>{report.performance.averageLoss.toFixed(1)}</strong><span>Avg loss</span></article>
            </div>
            <div className="elceo-asset-strength-ribbon">
              <div>
                <p className="elceo-kicker">BEST ASSETS</p>
                {report.performance.bestTradedAssets.slice(0, 2).map((asset) => (
                  <p key={asset.asset} className="elceo-muted-text">{asset.asset}: {asset.netPnl.toFixed(1)} net / {asset.winRate.toFixed(1)}%</p>
                ))}
              </div>
              <div>
                <p className="elceo-kicker">WEAK ASSETS</p>
                {report.performance.worstTradedAssets.slice(0, 2).map((asset) => (
                  <p key={asset.asset} className="elceo-muted-text">{asset.asset}: {asset.netPnl.toFixed(1)} net / {asset.winRate.toFixed(1)}%</p>
                ))}
              </div>
            </div>
          </Surface>
        </Reveal>

        <Reveal delayMs={120}>
          <Surface className="elceo-private-panel elceo-behavior-diagnosis" style={{ padding: '1rem' }}>
            <SurfaceHeader kicker="PATTERN ZONE" title="Behavior diagnosis surface" body="Overtrading, mismatch, and violation clusters." />
            <div className="elceo-diagnosis-stack">
              <article>
                <strong>Overtrading patterns</strong>
                {overtradeSignals.length ? overtradeSignals.map((signal) => <p key={signal} className="elceo-muted-text">• {signal}</p>) : <p className="elceo-muted-text">No overtrading signatures detected.</p>}
              </article>
              <article>
                <strong>Confidence mismatch</strong>
                {mismatchSignals.length ? mismatchSignals.map((signal) => <p key={signal} className="elceo-muted-text">• {signal}</p>) : <p className="elceo-muted-text">Confidence inputs and outcomes remain aligned.</p>}
              </article>
              <article>
                <strong>Session expectancy windows</strong>
                {report.performance.effectiveTradingTimeWindows.map((window) => (
                  <p key={window.session} className="elceo-muted-text">{window.session}: {window.expectancy.toFixed(2)}R across {window.tradeCount} trades</p>
                ))}
              </article>
            </div>
          </Surface>
        </Reveal>
      </div>

      <Reveal delayMs={160}>
        <Surface className="elceo-private-panel elceo-coaching-band" style={{ padding: '1rem' }}>
          <SurfaceHeader kicker="COACHING INTERPRETATION" title="Diagnosis, evidence, and interventions" />
          <div className="elceo-coaching-columns">
            <article>
              <h4>Diagnosis</h4>
              <p className="elceo-muted-text">{canAccessBehaviorCoaching ? report.coaching.summary.diagnosis : 'Upgrade to premium to unlock structured behavior diagnosis and intervention depth.'}</p>
              <SystemChip label={`Confidence: ${canAccessBehaviorCoaching ? report.coaching.summary.confidenceLevel : 'locked'}`} tone={canAccessBehaviorCoaching ? 'accent' : 'risk'} />
            </article>
            <article>
              <h4>Evidence fragments</h4>
              {(canAccessBehaviorCoaching ? report.coaching.evidence : report.coaching.evidence.slice(0, 1)).map((item) => (
                <p key={item.metric} className="elceo-muted-text"><strong>{item.metric}</strong> · {item.value} · {item.interpretation}</p>
              ))}
            </article>
            <article>
              <h4>Interventions</h4>
              {(canAccessBehaviorCoaching ? report.coaching.interventions : []).map((item) => (
                <p key={item.targetMetric} className="elceo-muted-text"><strong>{item.targetMetric}</strong> · {item.action} ({item.successCriteria})</p>
              ))}
              {!canAccessBehaviorCoaching ? <p className="elceo-muted-text">Premium unlock required for intervention and monitoring plan details.</p> : null}
            </article>
          </div>
        </Surface>
      </Reveal>

      <Reveal delayMs={200}>
        <Surface className="elceo-private-panel" style={{ padding: '1rem' }}>
          <SurfaceHeader kicker="MONITORING PLAN" title="Next 10-trade focus" />
          <p className="elceo-muted-text">Primary target: preserve expectancy by reducing mismatch entries in low-quality session windows while maintaining average risk-reward discipline.</p>
        </Surface>
      </Reveal>
    </div>
  );
}
