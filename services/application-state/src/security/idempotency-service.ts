import type { SecurityActionKind, SecurityActorKind, SecurityDecision, SecurityIdempotencyReplayResult } from '@elceo/types';
import type { SecurityIdempotencyRepository, SecurityIdempotencyResponseRepository } from '../persistence/contracts';
import { SECURITY_DEFAULT_IDEMPOTENCY_TTL_MS } from './constants';
import { toCompactJson } from './serialization';

type IdempotencyParams = {
  actionKind: SecurityActionKind;
  actorKind: SecurityActorKind;
  actorId: string;
  subjectId?: string | null;
  idempotencyKey?: string | null;
  requestHash?: string | null;
  nowIso: string;
};

const id = (...parts: string[]): string => parts.join(':');
const withDefaultExpiry = (completedAt: string, expiresAt?: string): string =>
  expiresAt ?? new Date(Date.parse(completedAt) + SECURITY_DEFAULT_IDEMPOTENCY_TTL_MS).toISOString();

export class SecurityIdempotencyService {
  constructor(
    private readonly repository: SecurityIdempotencyRepository,
    private readonly responseRepository?: SecurityIdempotencyResponseRepository
  ) {}

  async beginIdempotentAction(params: IdempotencyParams): Promise<SecurityDecision> {
    const { actionKind, actorKind, actorId, subjectId = null, idempotencyKey = null, requestHash = null, nowIso } = params;
    if (!idempotencyKey || !requestHash) {
      return {
        decisionId: id('sec', actionKind, actorKind, actorId, nowIso, 'non_idempotent'),
        actionKind,
        actorKind,
        actorId,
        subjectId,
        status: 'allowed',
        blockReason: null,
        idempotencyKey: null,
        rateLimitPolicyKey: null,
        currentCount: null,
        maxCount: null,
        decidedAt: nowIso,
        metadataJson: toCompactJson({ reason: 'idempotency_not_required' })
      };
    }

    const existing = await this.repository.getIdempotencyRecord(idempotencyKey);
    if (!existing) {
      await this.repository.saveIdempotencyRecord({
        idempotencyKey,
        actionKind,
        actorKind,
        actorId,
        requestHash,
        responseHash: null,
        status: 'started',
        firstSeenAt: nowIso,
        lastSeenAt: nowIso,
        expiresAt: new Date(Date.parse(nowIso) + SECURITY_DEFAULT_IDEMPOTENCY_TTL_MS).toISOString(),
        metadataJson: toCompactJson({ state: 'started' })
      });
      return {
        decisionId: id('sec', actionKind, actorKind, actorId, idempotencyKey, 'allowed_started'),
        actionKind,
        actorKind,
        actorId,
        subjectId,
        status: 'allowed',
        blockReason: null,
        idempotencyKey,
        rateLimitPolicyKey: null,
        currentCount: null,
        maxCount: null,
        decidedAt: nowIso,
        metadataJson: toCompactJson({ reason: 'idempotency_started' })
      };
    }

    if (existing.requestHash !== requestHash) {
      return {
        decisionId: id('sec', actionKind, actorKind, actorId, idempotencyKey, 'hash_mismatch'),
        actionKind,
        actorKind,
        actorId,
        subjectId,
        status: 'blocked',
        blockReason: 'suspicious_replay',
        idempotencyKey,
        rateLimitPolicyKey: null,
        currentCount: null,
        maxCount: null,
        decidedAt: nowIso,
        metadataJson: toCompactJson({ reason: 'request_hash_mismatch' })
      };
    }

    if (existing.status === 'failed') {
      await this.repository.saveIdempotencyRecord({
        ...existing,
        status: 'started',
        responseHash: null,
        lastSeenAt: nowIso,
        metadataJson: toCompactJson({ state: 'started', restart: 'failed_same_hash' })
      });
      return {
        decisionId: id('sec', actionKind, actorKind, actorId, idempotencyKey, 'allowed_restarted'),
        actionKind,
        actorKind,
        actorId,
        subjectId,
        status: 'allowed',
        blockReason: null,
        idempotencyKey,
        rateLimitPolicyKey: null,
        currentCount: null,
        maxCount: null,
        decidedAt: nowIso,
        metadataJson: toCompactJson({ reason: 'idempotency_restarted_after_failure' })
      };
    }

    if (existing.status === 'completed') {
      return {
        decisionId: id('sec', actionKind, actorKind, actorId, idempotencyKey, 'replayed'),
        actionKind,
        actorKind,
        actorId,
        subjectId,
        status: 'replayed',
        blockReason: null,
        idempotencyKey,
        rateLimitPolicyKey: null,
        currentCount: null,
        maxCount: null,
        decidedAt: nowIso,
        metadataJson: toCompactJson({ reason: 'idempotency_replay_completed' })
      };
    }

    return {
      decisionId: id('sec', actionKind, actorKind, actorId, idempotencyKey, existing.status),
      actionKind,
      actorKind,
      actorId,
      subjectId,
      status: 'blocked',
      blockReason: 'idempotency_conflict',
      idempotencyKey,
      rateLimitPolicyKey: null,
      currentCount: null,
      maxCount: null,
      decidedAt: nowIso,
      metadataJson: toCompactJson({ reason: `idempotency_${existing.status}` })
    };
  }

  async completeIdempotentAction(params: { idempotencyKey: string; responseHash: string; nowIso: string; metadata?: Record<string, unknown> }): Promise<void> {
    await this.repository.completeIdempotencyRecord(params.idempotencyKey, params.responseHash, toCompactJson(params.metadata ?? { state: 'completed' }), params.nowIso);
  }

  async completeIdempotentActionWithResponse(params: {
    idempotencyKey: string;
    actionKind: SecurityActionKind;
    actorKind: SecurityActorKind;
    actorId: string;
    requestHash: string;
    httpStatus: number;
    responseJson: string;
    responseHash: string;
    completedAt: string;
    expiresAt?: string;
    metadataJson?: string;
  }): Promise<void> {
    const metadataJson = params.metadataJson ?? toCompactJson({ state: 'completed_with_response' });

    await this.repository.completeIdempotencyRecord(params.idempotencyKey, params.responseHash, metadataJson, params.completedAt);

    if (!this.responseRepository) {
      return;
    }

    await this.responseRepository.saveResponse({
      idempotencyKey: params.idempotencyKey,
      actionKind: params.actionKind,
      actorKind: params.actorKind,
      actorId: params.actorId,
      requestHash: params.requestHash,
      responseHash: params.responseHash,
      httpStatus: params.httpStatus,
      responseJson: params.responseJson,
      completedAt: params.completedAt,
      expiresAt: withDefaultExpiry(params.completedAt, params.expiresAt),
      metadataJson
    });
  }

  async getReplayForIdempotencyKey(params: { idempotencyKey: string; requestHash: string; asOfIso: string }): Promise<SecurityIdempotencyReplayResult> {
    const record = await this.repository.getIdempotencyRecord(params.idempotencyKey);
    if (!record) {
      return { replayable: false, idempotencyKey: params.idempotencyKey, httpStatus: null, responseJson: null, responseHash: null, reason: 'not_found' };
    }
    if (record.requestHash !== params.requestHash) {
      return { replayable: false, idempotencyKey: params.idempotencyKey, httpStatus: null, responseJson: null, responseHash: null, reason: 'request_hash_mismatch' };
    }

    const response = await this.responseRepository?.getResponse(params.idempotencyKey);
    if (!response) {
      return { replayable: false, idempotencyKey: params.idempotencyKey, httpStatus: null, responseJson: null, responseHash: null, reason: 'no_completed_response' };
    }
    if (Date.parse(response.expiresAt) <= Date.parse(params.asOfIso)) {
      return { replayable: false, idempotencyKey: params.idempotencyKey, httpStatus: null, responseJson: null, responseHash: null, reason: 'expired' };
    }

    return {
      replayable: true,
      idempotencyKey: params.idempotencyKey,
      httpStatus: response.httpStatus,
      responseJson: response.responseJson,
      responseHash: response.responseHash,
      reason: 'completed_response_found'
    };
  }

  async failIdempotentAction(params: { idempotencyKey: string; nowIso: string; metadata?: Record<string, unknown> }): Promise<void> {
    await this.repository.failIdempotencyRecord(params.idempotencyKey, toCompactJson(params.metadata ?? { state: 'failed' }), params.nowIso);
  }
}
