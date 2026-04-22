import {
  buildCanonicalCognitionStateFixture,
  buildCanonicalEventFixture,
  buildInvalidationStateFixture,
  buildNotificationDecisionFixture,
  buildNotificationRuleFixture,
  buildRankedEvidenceItemFixture,
  buildReasoningInputFrameFixture,
  buildZoneSignificanceFixture,
  validateCanonicalCognitionState,
  validateCanonicalEvent,
  validateInvalidationState,
  validateNotificationDecision,
  validateNotificationTriggerRule,
  validateRankedEvidenceItem,
  validateReasoningInputFrame,
  validateZoneSignificance
} from '../../../../packages/schemas/src/index.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runSchemaValidationTests(): void {
  assert(validateCanonicalEvent(buildCanonicalEventFixture()).ok, 'valid CanonicalEvent should pass');
  assert(validateRankedEvidenceItem(buildRankedEvidenceItemFixture()).ok, 'valid RankedEvidenceItem should pass');
  assert(validateCanonicalCognitionState(buildCanonicalCognitionStateFixture()).ok, 'valid CanonicalCognitionState should pass');
  assert(validateReasoningInputFrame(buildReasoningInputFrameFixture()).ok, 'valid ReasoningInputFrame should pass');
  assert(validateNotificationTriggerRule(buildNotificationRuleFixture()).ok, 'valid NotificationTriggerRule should pass');
  assert(validateNotificationDecision(buildNotificationDecisionFixture()).ok, 'valid NotificationDecision should pass');
  assert(validateZoneSignificance(buildZoneSignificanceFixture()).ok, 'valid ZoneSignificance should pass');
  assert(validateInvalidationState(buildInvalidationStateFixture()).ok, 'valid InvalidationState should pass');

  assert(!validateCanonicalEvent(buildCanonicalEventFixture({ id: '' })).ok, 'event missing required field must fail');
  assert(!validateCanonicalEvent(buildCanonicalEventFixture({ relevanceScore: 101 })).ok, 'event score >100 must fail');

  const invalidRegime = buildCanonicalCognitionStateFixture();
  invalidRegime.contradiction.regime = 'wrong' as never;
  assert(!validateCanonicalCognitionState(invalidRegime).ok, 'invalid contradiction regime must fail');

  const wrongExplanation = buildCanonicalCognitionStateFixture({ explanation: { bulletReasons: 'bad' as never } });
  assert(!validateCanonicalCognitionState(wrongExplanation).ok, 'wrong explanation type must fail');

  assert(!validateCanonicalCognitionState(buildCanonicalCognitionStateFixture({ timeframe: 'W1' as never })).ok, 'invalid timeframe must fail');
  assert(!validateCanonicalCognitionState(buildCanonicalCognitionStateFixture({ bias: 'up_only' as never })).ok, 'invalid bias must fail');

  const invalidInvalidation = buildInvalidationStateFixture();
  if (invalidInvalidation.primary) invalidInvalidation.primary.severityScore = 120;
  assert(!validateInvalidationState(invalidInvalidation).ok, 'invalid invalidation severity must fail');

  const malformedEvidenceInsideCognition = buildCanonicalCognitionStateFixture({ evidence: { ranked: [buildRankedEvidenceItemFixture({ impactScore: 200 })] } });
  assert(!validateCanonicalCognitionState(malformedEvidenceInsideCognition).ok, 'malformed nested evidence item must fail');

  const malformedChannel = buildNotificationRuleFixture({ channels: ['fax' as never] });
  assert(!validateNotificationTriggerRule(malformedChannel).ok, 'malformed notification channel must fail');

  const malformedZone = buildZoneSignificanceFixture({ side: 'resistance' as never });
  assert(!validateZoneSignificance(malformedZone).ok, 'malformed zone side must fail');
}
