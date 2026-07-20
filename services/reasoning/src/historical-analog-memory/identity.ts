import { createHash } from 'node:crypto';
import type { EventExpectationRecord } from '../expectation-reality/contracts';
import { canonicalJson } from '../expectation-reality/identity';

export function historicalHash(value: unknown): string { return createHash('sha256').update(canonicalJson(value)).digest('hex'); }
export function buildEventInstanceKey(input: Pick<EventExpectationRecord, 'eventReleaseId' | 'scheduledReleaseTime'>): string { return historicalHash({ eventReleaseId: input.eventReleaseId, scheduledReleaseTime: input.scheduledReleaseTime }); }
export function buildAnalogMemoryId(sourceEventEvaluationId: string, featurePolicyVersion: string, _featureContentHash: string): string { return `ham_${historicalHash({ sourceEventEvaluationId, featurePolicyVersion }).slice(0, 32)}`; }
export function buildRetrievalId(input: { queryEventEvaluationId: string; queryCutoffAt: string; retrievalPolicyVersion: string; featurePolicyVersion: string; queryFeatureHash: string; rankingMemorySnapshotHash: string; outcomeAttachmentSnapshotHash: string }): string { return `har_${historicalHash(input).slice(0, 32)}`; }
export function buildMemorySnapshotHash(snapshot: { analogMemoryId: string; sourceEventEvaluationId?: string; sourceEventInstanceKey?: string; selectedStageSourceEventEvaluationId?: string; selectedStageAssessmentEvidenceHash?: string; selectedStageObservationContentHash?: string; selectedStageInterpretedAt?: string; selectedStageElapsedMs?: number; selectedStageMatchFeatureHash?: string; featureContentHash?: string; stageFeatureTimelineHash?: string; sourceAssessmentEvidenceHash?: string; availableAt: string }[]): string { return historicalHash(snapshot); }
export function encodeTupleCursor(tuple: { at: string; id: string }): string { return Buffer.from(JSON.stringify(tuple), 'utf8').toString('base64url'); }
export function decodeTupleCursor(cursor?: string): { at: string; id: string } | null { if (!cursor) return null; try { const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')); return typeof parsed.at === 'string' && typeof parsed.id === 'string' ? parsed : null; } catch { return null; } }
export function isAfterTuple(row: { at: string; id: string }, cursor?: string): boolean { const c = decodeTupleCursor(cursor); if (!c) return true; return row.at > c.at || (row.at === c.at && row.id > c.id); }
