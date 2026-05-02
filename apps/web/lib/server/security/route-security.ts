import 'server-only';
import { createHash } from 'node:crypto';
import type { SecurityActionKind, SecurityActorKind, SecurityBlockReason, SecurityDecision } from '@elceo/types';
import { jsonError } from '@/lib/server/api';
import { getSecurityRuntime } from '@/lib/server/composition';

export type SecurityActor = { actorKind: SecurityActorKind; actorId: string; subjectId: string | null };

export function getSecurityActorFromRequest(request: Request, mode: 'internal' | 'admin' | 'user' = 'internal'): SecurityActor {
  const internalToken = request.headers.get('x-elceo-internal-token');
  if (internalToken) return { actorKind: mode === 'admin' ? 'admin' : 'internal', actorId: 'internal-api', subjectId: null };
  return { actorKind: 'system', actorId: 'missing', subjectId: null };
}

export function getIdempotencyKeyFromRequest(request: Request): string | null {
  return request.headers.get('Idempotency-Key') ?? request.headers.get('x-idempotency-key');
}

export function buildSecurityRequestHash(requestBody: unknown): string {
  const stable = JSON.stringify(requestBody ?? {}, Object.keys((requestBody ?? {}) as Record<string, unknown>).sort());
  return createHash('sha256').update(stable).digest('hex');
}

function mapBlockReason(reason: SecurityBlockReason | null): Response {
  if (reason === 'rate_limit_exceeded') return jsonError('bad_request', 'Rate limit exceeded', ['rate_limit_exceeded'], 429);
  if (reason === 'idempotency_conflict') return jsonError('conflict', 'Idempotency conflict', ['idempotency_conflict'], 409);
  if (reason === 'suspicious_replay') return jsonError('conflict', 'Suspicious replay detected', ['suspicious_replay'], 409);
  if (reason === 'missing_actor') return jsonError('forbidden', 'Forbidden', ['missing_actor'], 403);
  return jsonError('forbidden', 'Forbidden');
}

export async function requireSecurityDecision(params: { request: Request; routePath: string; method: string; actionKind: SecurityActionKind; actor: SecurityActor; subjectId?: string | null; requestBody?: unknown; }) {
  const nowIso = new Date().toISOString();
  const idempotencyKey = getIdempotencyKeyFromRequest(params.request);
  const requestHash = buildSecurityRequestHash(params.requestBody ?? {});
  const decision = await getSecurityRuntime().evaluateSecurityControl({ actionKind: params.actionKind, actorKind: params.actor.actorKind, actorId: params.actor.actorId, subjectId: params.subjectId ?? params.actor.subjectId, idempotencyKey, requestHash, routePath: params.routePath, method: params.method, ipAddress: params.request.headers.get('x-forwarded-for'), userAgent: params.request.headers.get('user-agent'), nowIso });
  if (decision.status === 'allowed') return { ok: true as const, decision, idempotencyKey, requestHash };
  if (decision.status === 'replayed') {
    const replay = await getSecurityRuntime().getIdempotencyReplayResult(idempotencyKey ?? '', requestHash, nowIso);
    if (!replay.replayable || !replay.responseJson) {
      return {
        ok: false as const,
        decision,
        response: jsonError('conflict', 'Replay unavailable', ['replay_unavailable', replay.reason], 409),
        idempotencyKey,
        requestHash
      };
    }
    try {
      const envelope = JSON.parse(replay.responseJson) as unknown;
      return { ok: false as const, decision, response: Response.json(envelope, { status: replay.httpStatus ?? 200 }), idempotencyKey, requestHash };
    } catch {
      return {
        ok: false as const,
        decision,
        response: jsonError('internal_error', 'Replay response parse failure', ['replay_response_malformed'], 500),
        idempotencyKey,
        requestHash
      };
    }
  }
  return { ok: false as const, decision, response: mapBlockReason(decision.blockReason), idempotencyKey, requestHash };
}

export async function completeSecurityDecision(params: { decision: SecurityDecision; idempotencyKey: string | null; responseBody: unknown; responseEnvelope?: unknown; httpStatus?: number; requestHash?: string; }) {
  if (!params.idempotencyKey) return;
  const nowIso = new Date().toISOString();
  if (params.responseEnvelope) {
    const responseJson = JSON.stringify(params.responseEnvelope);
    await getSecurityRuntime().completeIdempotentActionWithResponse({
      idempotencyKey: params.idempotencyKey,
      actionKind: params.decision.actionKind,
      actorKind: params.decision.actorKind,
      actorId: params.decision.actorId,
      requestHash: params.requestHash ?? '',
      responseHash: buildSecurityRequestHash(params.responseBody),
      httpStatus: params.httpStatus ?? 200,
      responseJson,
      completedAt: nowIso
    });
    return;
  }
  await getSecurityRuntime().completeIdempotentAction({ idempotencyKey: params.idempotencyKey, responseHash: buildSecurityRequestHash(params.responseBody), nowIso });
}

export async function failSecurityDecision(params: { idempotencyKey: string | null; errorMessage: string; }) {
  if (!params.idempotencyKey) return;
  await getSecurityRuntime().failIdempotentAction({ idempotencyKey: params.idempotencyKey, nowIso: new Date().toISOString(), metadata: { error: params.errorMessage } });
}

export async function auditInternalMutation(params: { actor: SecurityActor; subjectId?: string | null; actionKind: SecurityActionKind; routePath: string; method: string; request: Request; idempotencyKey?: string | null; metadata?: Record<string, unknown>; }) {
  const nowIso = new Date().toISOString();
  await getSecurityRuntime().recordSecurityAuditEvent({ auditEventId: `audit:route:${params.actionKind}:${nowIso}`, actorKind: params.actor.actorKind, actorId: params.actor.actorId, subjectId: params.subjectId ?? params.actor.subjectId ?? null, actionKind: params.actionKind, decisionStatus: 'allowed', blockReason: null, routePath: params.routePath, method: params.method, ipAddress: params.request.headers.get('x-forwarded-for'), userAgent: params.request.headers.get('user-agent'), idempotencyKey: params.idempotencyKey ?? null, metadataJson: JSON.stringify(params.metadata ?? { source: 'route' }), occurredAt: nowIso, createdAt: nowIso });
}
