'use client';

import { useMemo, useState, type FormEvent } from 'react';
import type { TradeJournalCreateInput, TradeJournalEntry } from '@elceo/types';
import { Reveal } from '@elceo/motion';
import { Surface } from '@elceo/ui';
import { PrivateCommandBand, SurfaceHeader, SystemChip } from '../private-workspace/SurfacePrimitives';

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
    const expectancy = entries.length ? entries.reduce((sum, entry) => sum + entry.resultRMultiple, 0) / entries.length : 0;
    return {
      trades: entries.length,
      winRate: entries.length ? (wins / entries.length) * 100 : 0,
      net,
      expectancy
    };
  }, [entries]);

  const latestMistake = entries.find((entry) => entry.mistakeCategory !== 'none')?.mistakeCategory ?? 'none';

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
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
    <div className="elceo-private-page elceo-private-page-journal">
      <Reveal>
        <PrivateCommandBand
          kicker="JOURNAL · EVIDENCE LAYER"
          title="Execution case recorder"
          meta={`Capture mode: structured · Depth: ${entries.length > 50 ? 'extended history' : 'active history'} · Expectancy ${stats.expectancy.toFixed(2)}R`}
          chips={[
            { label: 'Session tag: London', tone: 'neutral' },
            { label: `Latest mistake: ${latestMistake}`, tone: latestMistake === 'none' ? 'accent' : 'risk' },
            { label: 'Capture discipline active', tone: 'signal' }
          ]}
          actions={
            <button type="submit" form="journal-capture-form" className="elceo-pill-button elceo-pill-button-hero">
              New entry
            </button>
          }
        />
      </Reveal>

      <div className="elceo-private-grid elceo-private-grid-journal">
        <Reveal delayMs={70}>
          <Surface className="elceo-private-panel elceo-journal-capture-surface" style={{ padding: '1rem' }}>
            <SurfaceHeader kicker="TRADE CAPTURE" title="Case-entry workspace" body="Record structure, behavior context, and price geometry in one workflow." />
            <form id="journal-capture-form" className="elceo-journal-pro-form" onSubmit={submitEntry}>
              <section className="elceo-journal-group">
                <h4>Trade identity</h4>
                <label>Asset<input value={form.asset} onChange={(event) => setForm((prev) => ({ ...prev, asset: event.target.value }))} required /></label>
                <label>
                  Direction
                  <select value={form.direction} onChange={(event) => setForm((prev) => ({ ...prev, direction: event.target.value as TradeJournalCreateInput['direction'] }))}>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
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
              </section>

              <section className="elceo-journal-group elceo-journal-group-geometry">
                <h4>Entry / Stop / Target geometry</h4>
                <label>Entry<input type="number" value={form.entryPrice} onChange={(event) => setForm((prev) => ({ ...prev, entryPrice: Number(event.target.value) }))} required /></label>
                <label>Stop<input type="number" value={form.stopPrice} onChange={(event) => setForm((prev) => ({ ...prev, stopPrice: Number(event.target.value) }))} required /></label>
                <label>Take profit<input type="number" value={form.takeProfitPrice} onChange={(event) => setForm((prev) => ({ ...prev, takeProfitPrice: Number(event.target.value) }))} required /></label>
                <label>Exit<input type="number" value={form.exitPrice} onChange={(event) => setForm((prev) => ({ ...prev, exitPrice: Number(event.target.value) }))} required /></label>
              </section>

              <section className="elceo-journal-group">
                <h4>Behavior context</h4>
                <label>
                  Setup
                  <select value={form.setupType} onChange={(event) => setForm((prev) => ({ ...prev, setupType: event.target.value as TradeJournalCreateInput['setupType'] }))}>
                    <option value="trend-continuation">Trend continuation</option><option value="pullback">Pullback</option><option value="breakout">Breakout</option><option value="range-reversal">Range reversal</option><option value="macro-continuation">Macro continuation</option><option value="news-volatility">News volatility</option><option value="mean-reversion">Mean reversion</option><option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Emotion
                  <select value={form.emotion} onChange={(event) => setForm((prev) => ({ ...prev, emotion: event.target.value as TradeJournalCreateInput['emotion'] }))}>
                    <option value="calm">Calm</option><option value="confident">Confident</option><option value="hesitant">Hesitant</option><option value="fearful">Fearful</option><option value="euphoric">Euphoric</option><option value="revenge">Revenge</option><option value="frustrated">Frustrated</option><option value="fatigued">Fatigued</option>
                  </select>
                </label>
                <label>Confidence before<input type="number" min={0} max={100} value={form.confidenceBeforeTrade} onChange={(event) => setForm((prev) => ({ ...prev, confidenceBeforeTrade: Number(event.target.value) }))} /></label>
                <label>Confidence after<input type="number" min={0} max={100} value={form.confidenceAfterTrade} onChange={(event) => setForm((prev) => ({ ...prev, confidenceAfterTrade: Number(event.target.value) }))} /></label>
                <label>
                  Mistake category
                  <select value={form.mistakeCategory} onChange={(event) => setForm((prev) => ({ ...prev, mistakeCategory: event.target.value as TradeJournalCreateInput['mistakeCategory'] }))}>
                    <option value="none">None</option><option value="early-entry">Early entry</option><option value="late-entry">Late entry</option><option value="stop-moved">Stop moved</option><option value="size-too-large">Size too large</option><option value="size-too-small">Size too small</option><option value="rule-violation">Rule violation</option><option value="news-ignorance">News ignorance</option><option value="impulse-trade">Impulse trade</option><option value="overtrading">Overtrading</option><option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Lesson category
                  <select value={form.lessonCategory} onChange={(event) => setForm((prev) => ({ ...prev, lessonCategory: event.target.value as TradeJournalCreateInput['lessonCategory'] }))}>
                    <option value="discipline">Discipline</option><option value="risk-management">Risk management</option><option value="timing">Timing</option><option value="bias-alignment">Bias alignment</option><option value="setup-selection">Setup selection</option><option value="news-awareness">News awareness</option><option value="emotional-control">Emotional control</option><option value="execution-quality">Execution quality</option><option value="other">Other</option>
                  </select>
                </label>
                <label className="elceo-journal-check"><input type="checkbox" checked={form.majorNewsNearby} onChange={(event) => setForm((prev) => ({ ...prev, majorNewsNearby: event.target.checked }))} />Major news nearby</label>
                <label className="elceo-journal-check"><input type="checkbox" checked={form.followedElceoBias} onChange={(event) => setForm((prev) => ({ ...prev, followedElceoBias: event.target.checked }))} />Followed ELCEO bias</label>
              </section>

              <section className="elceo-journal-group elceo-journal-group-full">
                <h4>Narrative evidence</h4>
                <label>Trade reason<textarea value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} rows={4} required /></label>
                <div className="elceo-journal-actions">
                  <button type="button" className="elceo-pill-button" onClick={scaffoldMedia}>Add media scaffold ({form.media.length})</button>
                  <button type="submit" className="elceo-pill-button elceo-pill-button-hero">Commit entry</button>
                </div>
              </section>
            </form>
            <p className="elceo-muted-text">{status}</p>
          </Surface>
        </Reveal>

        <Reveal delayMs={130}>
          <aside className="elceo-private-stack">
            <Surface className="elceo-private-panel" style={{ padding: '1rem' }}>
              <SurfaceHeader kicker="INTELLIGENCE RAIL" title="Recent evidence entries" />
              <div className="elceo-journal-intelligence-rail">
                {entries.slice(0, 7).map((entry) => (
                  <article key={entry.entryId} className="elceo-journal-rail-item">
                    <strong>{entry.asset} · {entry.direction.toUpperCase()}</strong>
                    <p className="elceo-muted-text">R {entry.resultRMultiple.toFixed(2)} · {entry.sessionTraded} · {entry.outcome}</p>
                    <div className="elceo-private-chip-row"><SystemChip label={entry.followedElceoBias ? 'Bias adhered' : 'Bias mismatch'} tone={entry.followedElceoBias ? 'accent' : 'risk'} /><SystemChip label={entry.lessonCategory} tone="neutral" /></div>
                  </article>
                ))}
                {!entries.length ? <p className="elceo-muted-text">No trades logged yet.</p> : null}
              </div>
            </Surface>

            <Surface className="elceo-private-panel elceo-behavior-layer" style={{ padding: '1rem' }}>
              <SurfaceHeader kicker="BEHAVIORAL LAYER" title="Current coaching emphasis" />
              <p className="elceo-muted-text">Most repeated issue: <strong>{latestMistake}</strong>. Current emphasis is preserving rule adherence in high-volatility windows.</p>
              <p className="elceo-muted-text">Expectancy cue: {stats.expectancy >= 0 ? 'positive' : 'negative'} trajectory based on last recorded samples.</p>
            </Surface>

            <Surface className="elceo-private-panel" style={{ padding: '1rem' }}>
              <SurfaceHeader kicker="MEDIA / EVIDENCE" title="Attachment scaffold" body="Attach chart snapshots and notes for each case. Pending media is staged for future upload flow." />
              <div className="elceo-media-scaffold-zone">
                {form.media.length ? form.media.map((item) => <p key={item.mediaId} className="elceo-muted-text">{item.caption} · {item.status}</p>) : <p className="elceo-muted-text">No media attached yet. Use Add media scaffold to stage evidence.</p>}
              </div>
            </Surface>
          </aside>
        </Reveal>
      </div>
    </div>
  );
}
