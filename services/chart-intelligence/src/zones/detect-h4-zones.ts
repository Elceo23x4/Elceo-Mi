import { scoreZoneSignificance } from '@elceo/domain';
import type { NormalizedCandle } from '@elceo/schemas';
import type { H4Zone } from '@elceo/types';

export function detectH4Zones(assetCode: string, candles: NormalizedCandle[]): H4Zone[] {
  const sorted = [...candles].sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc));
  const zones: H4Zone[] = [];

  for (let i = 2; i < sorted.length; i += 6) {
    const window = sorted.slice(i - 2, i + 1);
    if (window.length < 3) continue;
    const first = window[0];
    const last = window[window.length - 1];
    if (!first || !last) continue;

    const low = Math.min(...window.map((c) => c.low));
    const high = Math.max(...window.map((c) => c.high));
    const center = (low + high) / 2;
    const touches = window.filter((c) => c.low <= center && c.high >= center).length;
    const reactionMagnitudeAtr = Math.abs(last.close - first.open) / Math.max(1, high - low);
    const hoursSinceLastTouch = Math.max(0, (Date.now() - new Date(last.timestampUtc).getTime()) / (1000 * 60 * 60));

    zones.push({
      zone_id: `${assetCode}-h4-zone-${i}`,
      asset_code: assetCode,
      timeframe: 'H4',
      lower: Number(low.toFixed(5)),
      upper: Number(high.toFixed(5)),
      center: Number(center.toFixed(5)),
      touches,
      reaction_magnitude_atr: Number(reactionMagnitudeAtr.toFixed(4)),
      hours_since_last_touch: Number(hoursSinceLastTouch.toFixed(2)),
      significance_score: Number(
        scoreZoneSignificance({
          touches,
          reactionMagnitudeAtr,
          hoursSinceLastTouch
        }).toFixed(2)
      )
    });
  }

  return zones.sort((a, b) => b.significance_score - a.significance_score).slice(0, 8);
}
