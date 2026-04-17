'use client';

import { useMemo, useState } from 'react';
import type { TradeJournalCreateInput, TradeJournalEntry } from '@elceo/types';
import { Surface } from '@elceo/ui';

const defaultForm: TradeJournalCreateInput = {
  asset: 'XAU/USD',
  direction: 'long',
  entryPrice: 0,
  stopPrice: 0,
  takeProfitPrice: 0,
  exitPrice: 0,
  setupType: 'trend-continuation',
  reason: '',
  emotion: 'calm',
  sessionTraded: 'london',
  majorNewsNearby: false,
  followedElceoBias: true,
  confidenceBeforeTrade: 60,
  confidenceAfterTrade: 60,
  mistakeCategory: 'none',
  lessonCategory: 'discipline',
  tradedAtUtc: new Date().toISOString(),
  closedAtUtc: new Date().toISOString(),
  media: []
};

export function JournalWorkbench({ initialEntries }: { initialEntries: TradeJournalEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [form, setForm] = useState<TradeJournalCreateInput>(defaultForm);
  const [status, setStatus] = useState<string>('');

  const stats = useMemo(() => {
    const wins = entries.filter((entry) => entry.outcome === 'win').length;
    const net = entries.reduce((sum, entry) => sum + entry.pnlAmount, 0);
    return {
      trades: entries.length,
      winRate: entries.length ? (wins / entries.length) * 100 : 0,
      net
    };
  }, [entries]);

  async function submitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('Saving trade...');

    const response = await fetch('/api/journal/entries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: string };
      setStatus(error.error ?? 'Unable to save trade entry');
      return;
    }

    const created = (await response.json()) as TradeJournalEntry;
    setEntries((prev) => [created, ...prev]);
    setStatus('Trade logged and routed into analytics stream.');
  }

  function scaffoldMedia(): void {
    setForm((prev) => ({
      ...prev,
      media: [
        ...prev.media,
        {
          mediaId: crypto.randomUUID(),
          kind: 'image',
          url: `local://journal/${Date.now()}.png`,
          caption: 'Chart snapshot placeholder',
          uploadedAtUtc: new Date().toISOString(),
          status: 'pending'
        }
      ]
    }));
  }

  return (
    <div className="elceo-journal-layout">
      <Surface style={{ padding: '1rem' }}>
        <p className="elceo-kicker">Trader Journal</p>
        <h2 style={{ marginTop: '0.35rem' }}>Structured trade capture</h2>
        <form className="elceo-journal-form" onSubmit={submitEntry}>
          <label>
            Asset
            <input value={form.asset} onChange={(event) => setForm((prev) => ({ ...prev, asset: event.target.value }))} required />
          </label>
          <label>
            Direction
            <select value={form.direction} onChange={(event) => setForm((prev) => ({ ...prev, direction: event.target.value as TradeJournalCreateInput['direction'] }))}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
          <label>
            Entry
            <input type="number" value={form.entryPrice} onChange={(event) => setForm((prev) => ({ ...prev, entryPrice: Number(event.target.value) }))} required />
          </label>
          <label>
            Stop
            <input type="number" value={form.stopPrice} onChange={(event) => setForm((prev) => ({ ...prev, stopPrice: Number(event.target.value) }))} required />
          </label>
          <label>
            Take Profit
            <input type="number" value={form.takeProfitPrice} onChange={(event) => setForm((prev) => ({ ...prev, takeProfitPrice: Number(event.target.value) }))} required />
          </label>
          <label>
            Exit
            <input type="number" value={form.exitPrice} onChange={(event) => setForm((prev) => ({ ...prev, exitPrice: Number(event.target.value) }))} required />
          </label>
          <label>
            Setup type
            <select value={form.setupType} onChange={(event) => setForm((prev) => ({ ...prev, setupType: event.target.value as TradeJournalCreateInput['setupType'] }))}>
              <option value="trend-continuation">Trend continuation</option>
              <option value="pullback">Pullback</option>
              <option value="breakout">Breakout</option>
              <option value="range-reversal">Range reversal</option>
              <option value="macro-continuation">Macro continuation</option>
              <option value="news-volatility">News volatility</option>
              <option value="mean-reversion">Mean reversion</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Emotion
            <select value={form.emotion} onChange={(event) => setForm((prev) => ({ ...prev, emotion: event.target.value as TradeJournalCreateInput['emotion'] }))}>
              <option value="calm">Calm</option>
              <option value="confident">Confident</option>
              <option value="hesitant">Hesitant</option>
              <option value="fearful">Fearful</option>
              <option value="euphoric">Euphoric</option>
              <option value="revenge">Revenge</option>
              <option value="frustrated">Frustrated</option>
              <option value="fatigued">Fatigued</option>
            </select>
          </label>
          <label>
            Session
            <select value={form.sessionTraded} onChange={(event) => setForm((prev) => ({ ...prev, sessionTraded: event.target.value as TradeJournalCreateInput['sessionTraded'] }))}>
              <option value="asia">Asia</option>
              <option value="london">London</option>
              <option value="new-york">New York</option>
              <option value="overlap">Overlap</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Confidence before
            <input
              type="number"
              min={0}
              max={100}
              value={form.confidenceBeforeTrade}
              onChange={(event) => setForm((prev) => ({ ...prev, confidenceBeforeTrade: Number(event.target.value) }))}
            />
          </label>
          <label>
            Confidence after
            <input
              type="number"
              min={0}
              max={100}
              value={form.confidenceAfterTrade}
              onChange={(event) => setForm((prev) => ({ ...prev, confidenceAfterTrade: Number(event.target.value) }))}
            />
          </label>
          <label>
            Mistake category
            <select value={form.mistakeCategory} onChange={(event) => setForm((prev) => ({ ...prev, mistakeCategory: event.target.value as TradeJournalCreateInput['mistakeCategory'] }))}>
              <option value="none">None</option>
              <option value="early-entry">Early entry</option>
              <option value="late-entry">Late entry</option>
              <option value="stop-moved">Stop moved</option>
              <option value="size-too-large">Size too large</option>
              <option value="size-too-small">Size too small</option>
              <option value="rule-violation">Rule violation</option>
              <option value="news-ignorance">News ignorance</option>
              <option value="impulse-trade">Impulse trade</option>
              <option value="overtrading">Overtrading</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Lesson category
            <select value={form.lessonCategory} onChange={(event) => setForm((prev) => ({ ...prev, lessonCategory: event.target.value as TradeJournalCreateInput['lessonCategory'] }))}>
              <option value="discipline">Discipline</option>
              <option value="risk-management">Risk management</option>
              <option value="timing">Timing</option>
              <option value="bias-alignment">Bias alignment</option>
              <option value="setup-selection">Setup selection</option>
              <option value="news-awareness">News awareness</option>
              <option value="emotional-control">Emotional control</option>
              <option value="execution-quality">Execution quality</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Trade reason
            <textarea value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} rows={3} required />
          </label>

          <label className="elceo-inline-check"><input type="checkbox" checked={form.majorNewsNearby} onChange={(event) => setForm((prev) => ({ ...prev, majorNewsNearby: event.target.checked }))} /> Major news nearby</label>
          <label className="elceo-inline-check"><input type="checkbox" checked={form.followedElceoBias} onChange={(event) => setForm((prev) => ({ ...prev, followedElceoBias: event.target.checked }))} /> Followed ELCEO bias</label>

          <div className="elceo-journal-actions">
            <button type="button" className="elceo-pill-button" onClick={scaffoldMedia}>
              Add media scaffold ({form.media.length})
            </button>
            <button type="submit" className="elceo-pill-button">
              Log trade
            </button>
          </div>
        </form>
        <p className="elceo-muted-text">{status}</p>
      </Surface>

      <Surface style={{ padding: '1rem' }}>
        <p className="elceo-kicker">Performance feed</p>
        <h3>Rolling journal stats</h3>
        <div className="elceo-chip-grid" style={{ marginBottom: '1rem' }}>
          <div className="elceo-chip">Trades: {stats.trades}</div>
          <div className="elceo-chip">Win rate: {stats.winRate.toFixed(1)}%</div>
          <div className="elceo-chip">Net PnL: {stats.net.toFixed(1)}</div>
        </div>
        <div className="elceo-entry-list">
          {entries.map((entry) => (
            <article key={entry.entryId} className="elceo-entry-item">
              <div>
                <strong>{entry.asset}</strong> · {entry.direction.toUpperCase()} · {entry.setupType}
              </div>
              <div className="elceo-muted-text">
                Outcome: {entry.outcome} · R: {entry.resultRMultiple.toFixed(2)} · PnL: {entry.pnlAmount.toFixed(1)} · Session: {entry.sessionTraded}
              </div>
            </article>
          ))}
          {!entries.length ? <p className="elceo-muted-text">No trades logged yet.</p> : null}
        </div>
      </Surface>
    </div>
  );
}
