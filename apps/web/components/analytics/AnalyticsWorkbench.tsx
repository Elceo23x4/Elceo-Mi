import type { JournalAnalyticsResult } from '@elceo/analytics';
import { Surface } from '@elceo/ui';

export function AnalyticsWorkbench({ report, canAccessBehaviorCoaching }: { report: JournalAnalyticsResult; canAccessBehaviorCoaching: boolean }) {
  return (
    <div className="elceo-journal-layout elceo-surface-analytics">
      <Surface className="elceo-shell-hero elceo-shell-hero-analytics" style={{ padding: '1rem' }}>
        <p className="elceo-kicker">Analytics</p>
        <h2 style={{ marginTop: '0.35rem' }}>Deterministic performance metrics</h2>
        <div className="elceo-chip-grid" style={{ marginTop: '1rem' }}>
          <div className="elceo-chip">Total trades: {report.performance.totalTrades}</div>
          <div className="elceo-chip">Win rate: {report.performance.winRate.toFixed(1)}%</div>
          <div className="elceo-chip">Expectancy: {report.performance.expectancy.toFixed(2)}R</div>
          <div className="elceo-chip">Avg gain: {report.performance.averageGain.toFixed(1)}</div>
          <div className="elceo-chip">Avg loss: {report.performance.averageLoss.toFixed(1)}</div>
          <div className="elceo-chip">Avg risk-reward: {report.performance.averageRiskReward.toFixed(2)}</div>
        </div>

        <div className="elceo-analytics-grid">
          <article className="elceo-analytics-card">
            <h4>Asset edge map</h4>
            {report.performance.bestTradedAssets.map((asset) => (
              <p key={asset.asset} className="elceo-muted-text">
                {asset.asset}: {asset.netPnl.toFixed(1)} net · {asset.winRate.toFixed(1)}% win
              </p>
            ))}
          </article>
          <article className="elceo-analytics-card">
            <h4>Weak assets</h4>
            {report.performance.worstTradedAssets.map((asset) => (
              <p key={asset.asset} className="elceo-muted-text">
                {asset.asset}: {asset.netPnl.toFixed(1)} net · {asset.winRate.toFixed(1)}% win
              </p>
            ))}
          </article>
          <article className="elceo-analytics-card">
            <h4>Time-window expectancy</h4>
            {report.performance.effectiveTradingTimeWindows.map((window) => (
              <p key={window.session} className="elceo-muted-text">
                {window.session}: {window.expectancy.toFixed(2)}R across {window.tradeCount} trades
              </p>
            ))}
          </article>
          <article className="elceo-analytics-card">
            <h4>Pattern detection</h4>
            {report.behavior.overtradingSignals.concat(report.behavior.confidenceMismatchPatterns).map((signal) => (
              <p key={signal} className="elceo-muted-text">
                • {signal}
              </p>
            ))}
            {!report.behavior.overtradingSignals.length && !report.behavior.confidenceMismatchPatterns.length ? (
              <p className="elceo-muted-text">No severe execution instability signatures detected.</p>
            ) : null}
          </article>
        </div>
      </Surface>

      <Surface className="elceo-shell-panel elceo-panel-analytics-coaching" style={{ padding: '1rem' }}>
        <p className="elceo-kicker">Coaching Lab</p>
        <h3>Data-scientist style coaching output</h3>
        <p>{canAccessBehaviorCoaching ? report.coaching.summary.diagnosis : 'Upgrade to premium to unlock structured coaching diagnostics driven by your behavioral patterns.'}</p>
        <p className="elceo-muted-text">Confidence level: {canAccessBehaviorCoaching ? report.coaching.summary.confidenceLevel : 'locked'}</p>

        <div className="elceo-analytics-grid">
          <article className="elceo-analytics-card">
            <h4>Evidence</h4>
            {(canAccessBehaviorCoaching ? report.coaching.evidence : report.coaching.evidence.slice(0, 1)).map((item) => (
              <p key={item.metric} className="elceo-muted-text">
                <strong>{item.metric}</strong> — {item.value} · {item.interpretation}
              </p>
            ))}
          </article>
          <article className="elceo-analytics-card">
            <h4>Interventions</h4>
            {(canAccessBehaviorCoaching ? report.coaching.interventions : []).map((item) => (
              <p key={item.targetMetric} className="elceo-muted-text">
                <strong>{item.targetMetric}</strong> — {item.action} ({item.successCriteria})
              </p>
            ))}
            {!canAccessBehaviorCoaching ? <p className="elceo-muted-text">Premium unlock: interventions and monitoring plan.</p> : null}
          </article>
        </div>
      </Surface>
    </div>
  );
}
