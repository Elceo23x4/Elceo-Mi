import { createHash } from 'node:crypto';
import type { EventExpectationRecord } from '../expectation-reality/contracts';
import { canonicalJson } from '../expectation-reality/identity';

export function historicalHash(value: unknown): string { return createHash('sha256').update(canonicalJson(value)).digest('hex'); }
export function buildEventInstanceKey(input: Pick<EventExpectationRecord, 'eventReleaseId' | 'scheduledReleaseTime'>): string { return historicalHash({ eventReleaseId: input.eventReleaseId, scheduledReleaseTime: input.scheduledReleaseTime }); }
export function buildAnalogMemoryId(sourceEventEvaluationId: string, featurePolicyVersion: string, featureContentHash: string): string { return `ham_${historicalHash({ sourceEventEvaluationId, featurePolicyVersion, featureContentHash }).slice(0, 32)}`; }
export function buildRetrievalId(input: { queryEventEvaluationId: string; queryCutoffAt: string; retrievalPolicyVersion: string; memorySnapshotHash: string }): string { return `har_${historicalHash(input).slice(0, 32)}`; }
export function buildMemorySnapshotHash(snapshot: { analogMemoryId: string; featureContentHash: string; sourceAssessmentEvidenceHash: string; availableAt: string }[]): string { return historicalHash(snapshot); }
