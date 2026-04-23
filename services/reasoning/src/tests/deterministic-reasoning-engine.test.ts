import { buildCanonicalEventFixture, buildReasoningInputFrameFixture, buildZoneSignificanceFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import {
  DETERMINISTIC_REASONING_ENGINE_NAME,
  DETERMINISTIC_REASONING_VERSION,
  DETERMINISTIC_SCORING_VERSION,
  DeterministicReasoningEngine
} from '../engine/index.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function buildInput(kind: 'bullish' | 'bearish' | 'neutral') {
  if (kind === 'bullish') {
    return buildReasoningInputFrameFixture({
      asOf: '2026-01-15T14:05:00.000Z',
      evidenceCandidates: [
        {
          ...buildReasoningInputFrameFixture().evidenceCandidates[0],
          evidenceId: 'b1',
          directionHint: 'bullish',
          finalRankScore: 80,
          label: 'Bull Driver 1',
          explanation: 'Bull support 1'
        },
        {
          ...buildReasoningInputFrameFixture().evidenceCandidates[0],
          evidenceId: 'b2',
          eventId: 'evt-b2',
          directionHint: 'bullish',
          finalRankScore: 55,
          label: 'Bull Driver 2',
          explanation: 'Bull support 2'
        },
        {
          ...buildReasoningInputFrameFixture().evidenceCandidates[0],
          evidenceId: 'b3',
          eventId: 'evt-b3',
          directionHint: 'bearish',
          finalRankScore: 20,
          label: 'Opposing Driver',
          explanation: 'Bear pressure'
        }
      ],
      zones: [buildZoneSignificanceFixture(), buildZoneSignificanceFixture({ zoneId: 'zone-2' })],
      events: [buildCanonicalEventFixture({ id: 'evt-b1' }), buildCanonicalEventFixture({ id: 'evt-b2', eventKind: 'news' })]
    });
  }

  if (kind === 'bearish') {
    return buildReasoningInputFrameFixture({
      evidenceCandidates: [
        {
          ...buildReasoningInputFrameFixture().evidenceCandidates[0],
          evidenceId: 's1',
          directionHint: 'bearish',
          finalRankScore: 85
        },
        {
          ...buildReasoningInputFrameFixture().evidenceCandidates[0],
          evidenceId: 's2',
          directionHint: 'bearish',
          finalRankScore: 55,
          eventId: 'evt-s2'
        },
        {
          ...buildReasoningInputFrameFixture().evidenceCandidates[0],
          evidenceId: 's3',
          directionHint: 'bullish',
          finalRankScore: 25,
          eventId: 'evt-s3'
        }
      ]
    });
  }

  return buildReasoningInputFrameFixture({
    evidenceCandidates: [
      {
        ...buildReasoningInputFrameFixture().evidenceCandidates[0],
        evidenceId: 'n1',
        directionHint: 'bullish',
        finalRankScore: 30
      },
      {
        ...buildReasoningInputFrameFixture().evidenceCandidates[0],
        evidenceId: 'n2',
        directionHint: 'bearish',
        finalRankScore: 28,
        eventId: 'evt-n2'
      },
      {
        ...buildReasoningInputFrameFixture().evidenceCandidates[0],
        evidenceId: 'n3',
        directionHint: 'mixed',
        finalRankScore: 35,
        eventId: 'evt-n3'
      }
    ]
  });
}

export function runDeterministicReasoningEngineTests(): void {
  const engine = new DeterministicReasoningEngine();

  const bullish = engine.evaluate(buildInput('bullish'));
  assert(bullish.bias === 'bullish', 'full bullish scenario should return bullish cognition');

  const bearish = engine.evaluate(buildInput('bearish'));
  assert(bearish.bias === 'bearish', 'full bearish scenario should return bearish cognition');

  const neutral = engine.evaluate(buildInput('neutral'));
  assert(neutral.bias === 'neutral', 'balanced mixed scenario should return neutral cognition');

  assert(bullish.evidence.evidenceCount === bullish.evidence.ranked.length, 'evidenceCount must be populated');
  assert(bullish.evidence.topEvidenceIds.length <= 5, 'topEvidenceIds must respect TOP_EVIDENCE_LIMIT');
  assert(Array.isArray(bullish.supportEvents.linkedEventIds), 'supportEvents should be populated');
  assert(Array.isArray(bullish.chartProjection.annotationIds), 'chartProjection should be populated');

  assert(bullish.audit.evaluatedBy === DETERMINISTIC_REASONING_ENGINE_NAME, 'audit evaluatedBy must use engine constant');
  assert(bullish.audit.reasoningVersion === DETERMINISTIC_REASONING_VERSION, 'audit reasoningVersion must use central constant');
  assert(bullish.audit.scoringVersion === DETERMINISTIC_SCORING_VERSION, 'audit scoringVersion must use central constant');

  const repeatInput = buildInput('bullish');
  const run1 = engine.evaluate(repeatInput);
  const run2 = engine.evaluate(repeatInput);
  assert(JSON.stringify(run1) === JSON.stringify(run2), 'same input must produce identical output across repeated runs');
}
