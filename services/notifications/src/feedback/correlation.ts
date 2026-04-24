import type { NotificationOutboxAttemptRepository, NotificationOutboxRepository, NotificationDecisionRepository, NotificationTargetRepository } from '../persistence/contracts';
import type { NormalizedProviderEvent } from './normalizers';

export type CorrelatedProviderEntities = {
  outboxId: string | null;
  attemptId: string | null;
  decisionId: string | null;
  decisionKey: string | null;
  targetId: string | null;
  subjectKind: 'user' | 'workspace' | 'ops' | null;
  subjectId: string | null;
};

export async function correlateProviderEventToOutbox(event: NormalizedProviderEvent, _outboxRepository: NotificationOutboxRepository): Promise<string | null> {
  if (!event.normalizedMetaJson) return null;
  try {
    const parsed = JSON.parse(event.normalizedMetaJson) as { outboxId?: string };
    if (typeof parsed.outboxId === 'string') return parsed.outboxId;
  } catch {
    return null;
  }
  return null;
}

export async function correlateProviderEventToAttempt(event: NormalizedProviderEvent, outboxAttemptRepository: NotificationOutboxAttemptRepository): Promise<string | null> {
  if (event.normalizedMetaJson) {
    try {
      const parsed = JSON.parse(event.normalizedMetaJson) as { attemptId?: string };
      if (typeof parsed.attemptId === 'string') return parsed.attemptId;
    } catch {
      return null;
    }
  }
  if (!event.providerMessageId) return null;
  const attempt = await outboxAttemptRepository.getLatestAttemptByProviderMessageId(event.providerMessageId);
  return attempt?.attemptId ?? null;
}

export async function correlateProviderEventToDecision(outboxId: string | null, outboxRepository: NotificationOutboxRepository, decisionRepository: NotificationDecisionRepository): Promise<{ decisionId: string | null; decisionKey: string | null }> {
  if (!outboxId) return { decisionId: null, decisionKey: null };
  const outbox = await outboxRepository.getOutboxById(outboxId);
  if (!outbox) return { decisionId: null, decisionKey: null };
  const decision = await decisionRepository.getDecisionById(outbox.decisionId);
  return { decisionId: outbox.decisionId, decisionKey: decision?.decisionKey ?? outbox.decisionKey };
}

export async function correlateProviderEventToTarget(outboxId: string | null, outboxRepository: NotificationOutboxRepository, targetRepository: NotificationTargetRepository): Promise<CorrelatedProviderEntities['targetId'] extends string | null ? { targetId: string | null; subjectKind: 'user' | 'workspace' | 'ops' | null; subjectId: string | null } : never> {
  if (!outboxId) return { targetId: null, subjectKind: null, subjectId: null };
  const outbox = await outboxRepository.getOutboxById(outboxId);
  if (!outbox) return { targetId: null, subjectKind: null, subjectId: null };
  const target = await targetRepository.getTargetById(outbox.targetId);
  if (!target) return { targetId: outbox.targetId, subjectKind: outbox.subjectKind, subjectId: outbox.subjectId };
  return { targetId: target.targetId, subjectKind: target.subjectKind, subjectId: target.subjectId };
}

export async function correlateProviderEvent(event: NormalizedProviderEvent, repositories: { outboxRepository: NotificationOutboxRepository; outboxAttemptRepository: NotificationOutboxAttemptRepository; decisionRepository: NotificationDecisionRepository; targetRepository: NotificationTargetRepository }): Promise<CorrelatedProviderEntities> {
  const attemptId = await correlateProviderEventToAttempt(event, repositories.outboxAttemptRepository);
  let outboxId: string | null = null;
  if (attemptId) {
    const parts = attemptId.split('|');
    outboxId = parts.length > 1 ? parts[1] ?? null : null;
  }
  if (!outboxId) outboxId = await correlateProviderEventToOutbox(event, repositories.outboxRepository);
  const decision = await correlateProviderEventToDecision(outboxId, repositories.outboxRepository, repositories.decisionRepository);
  const target = await correlateProviderEventToTarget(outboxId, repositories.outboxRepository, repositories.targetRepository);
  return { outboxId, attemptId, decisionId: decision.decisionId, decisionKey: decision.decisionKey, targetId: target.targetId, subjectKind: target.subjectKind, subjectId: target.subjectId };
}
