import { buildCanonicalEventFixture } from '@elceo/schemas';
import { buildComparisonFromCanonicalAndLegacy, computeRunStatus, summarizeDiagnostics } from '../runtime/report-helpers';
import { computeOverlapRatio } from '../runtime/run-report';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runRunReportHelperTests(): void {
  assert(computeOverlapRatio(0, 0) === 100, 'unionCount zero should force overlap ratio 100');

  const canonical = [
    buildCanonicalEventFixture({ id: 'c1', dedupeKey: 'k1' }),
    buildCanonicalEventFixture({ id: 'c2', dedupeKey: 'k2' })
  ];
  const legacy = [
    buildCanonicalEventFixture({ id: 'l1', dedupeKey: 'k2' }),
    buildCanonicalEventFixture({ id: 'l2', dedupeKey: 'k3' })
  ];
  const comparison = buildComparisonFromCanonicalAndLegacy(canonical, legacy);
  assert(comparison.overlapDedupeKeyCount === 1, 'overlap count should be exact');
  assert(comparison.canonicalOnlyCount === 1, 'canonical-only count should be exact');
  assert(comparison.legacyOnlyCount === 1, 'legacy-only count should be exact');
  assert(comparison.unionCount === 3, 'union count should be exact');

  const summary = summarizeDiagnostics({
    adapterFailures: [{ adapterName: 'a', stage: 'fetch', message: 'x', occurredAt: '2026-01-01T00:00:00.000Z' }],
    invalidEvents: [{ adapterName: 'a', stage: 'validate', eventId: null, message: 'bad', fieldPath: null, occurredAt: '2026-01-01T00:00:00.000Z' }],
    merges: [{ dedupeKey: 'k', mergedEventIds: ['1', '2'], primaryEventId: '1', confirmationCount: 2 }],
    droppedEvents: [{ reason: 'invalid', eventId: null, adapterName: null, message: 'drop' }],
    totalFetched: 2,
    totalValidated: 1,
    totalMergedGroups: 1,
    totalOutput: 1
  });
  assert(summary.adapterFailureCount === 1, 'adapter failure summary count');
  assert(summary.invalidEventCount === 1, 'invalid summary count');
  assert(summary.mergeCount === 1, 'merge summary count');
  assert(summary.droppedEventCount === 1, 'dropped summary count');

  assert(computeRunStatus({ activeBoundary: 'canonical', fallbackApplied: false, partialFlag: false }) === 'success', 'status success rule');
  assert(computeRunStatus({ activeBoundary: 'legacy', fallbackApplied: true, partialFlag: false }) === 'partial_success', 'status partial rule on fallback');
  assert(computeRunStatus({ activeBoundary: 'none', fallbackApplied: false, partialFlag: false }) === 'failed', 'status failed rule');
}
