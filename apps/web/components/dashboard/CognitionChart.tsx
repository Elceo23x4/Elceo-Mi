'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ChartAnnotation, ChartCandlePoint, H4Zone } from '@elceo/types';

type CognitionChartProps = {
  candles: ChartCandlePoint[];
  zones: H4Zone[];
  annotations: ChartAnnotation[];
};

type ZoneBand = {
  id: string;
  top: number;
  height: number;
  significance: number;
};

export const CognitionChart = memo(function CognitionChart({ candles, zones, annotations }: CognitionChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoneBands, setZoneBands] = useState<ZoneBand[]>([]);

  const markerAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.kind === 'macro_event_marker' || annotation.kind === 'contradiction_marker' || annotation.kind === 'impulse_origin_placeholder'),
    [annotations]
  );

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function mountChart() {
      if (!containerRef.current) return;

      const library = await import('lightweight-charts');
      const chart = library.createChart(containerRef.current, {
        layout: {
          background: { color: 'transparent' },
          textColor: '#d4c7c7'
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)' },
          horzLines: { color: 'rgba(255,255,255,0.04)' }
        },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.1)'
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.1)',
          timeVisible: true
        },
        crosshair: {
          mode: library.CrosshairMode.Magnet
        },
        height: 420
      });

      const series = chart.addCandlestickSeries({
        upColor: '#2ecb93',
        downColor: '#d85c68',
        borderVisible: false,
        wickUpColor: '#2ecb93',
        wickDownColor: '#d85c68'
      });

      series.setData(
        candles.map((candle) => ({
          time: Math.floor(new Date(candle.timestamp_utc).getTime() / 1000),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close
        }))
      );

      const markers = markerAnnotations.map((annotation) => {
        const timestamp =
          'timestamp_utc' in annotation
            ? annotation.timestamp_utc
            : candles[candles.length - 1]?.timestamp_utc ?? new Date().toISOString();

        return {
          time: Math.floor(new Date(timestamp).getTime() / 1000),
          position: annotation.kind === 'contradiction_marker' ? 'aboveBar' : 'belowBar',
          color: annotation.kind === 'contradiction_marker' ? '#ff6b77' : '#d7a34f',
          shape: annotation.kind === 'impulse_origin_placeholder' ? 'circle' : 'arrowDown',
          text:
            annotation.kind === 'macro_event_marker'
              ? 'Macro'
              : annotation.kind === 'contradiction_marker'
                ? 'Contradiction'
                : 'Impulse'
        };
      });

      (series as { setMarkers?: (_input: Array<Record<string, unknown>>) => void }).setMarkers?.(markers);

      const updateZones = () => {
        const next = zones
          .slice(0, 6)
          .map((zone) => {
            const top = series.priceToCoordinate(zone.upper);
            const bottom = series.priceToCoordinate(zone.lower);
            if (top === null || bottom === null) return null;

            return {
              id: zone.zone_id,
              top: Math.min(top, bottom),
              height: Math.abs(bottom - top),
              significance: zone.significance_score
            };
          })
          .filter((band): band is ZoneBand => band !== null);

        setZoneBands(next);
      };

      updateZones();
      chart.timeScale().fitContent();

      const observer = new ResizeObserver(() => {
        if (!containerRef.current) return;
        chart.applyOptions({ width: containerRef.current.clientWidth });
        updateZones();
      });

      observer.observe(containerRef.current);

      cleanup = () => {
        observer.disconnect();
        chart.remove();
      };
    }

    void mountChart();

    return () => {
      cleanup?.();
    };
  }, [candles, markerAnnotations, zones]);

  return (
    <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }} aria-label="Cognition chart container">
      <div ref={containerRef} style={{ width: '100%', minHeight: 420 }} aria-hidden="true" />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {zoneBands.map((band) => (
          <div
            key={band.id}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: band.top,
              height: band.height,
              background: `linear-gradient(90deg, rgba(216,92,104,${Math.min(0.28, band.significance / 400)}), rgba(216,92,104,0.03))`,
              borderTop: '1px solid rgba(216,92,104,0.18)',
              borderBottom: '1px solid rgba(216,92,104,0.18)'
            }}
          />
        ))}
      </div>
    </div>
  );
});
