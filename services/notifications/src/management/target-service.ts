import type { NotificationTargetRecord } from '@elceo/types';
import type { NotificationTargetRepository } from '../persistence/contracts';
import type { UpsertNotificationTargetInput } from './contracts';
import { buildDeterministicId } from './ids';
import { buildNotificationTargetKey } from './keys';
import { normalizeLabel, validateTargetStatusTransition } from './normalization';

export class NotificationTargetManagementService {
  constructor(private readonly repository: NotificationTargetRepository) {}

  async registerOrUpdateTarget(input: UpsertNotificationTargetInput, nowIso = new Date().toISOString()): Promise<NotificationTargetRecord> {
    const targetKey = buildNotificationTargetKey({
      subjectKind: input.subjectKind,
      subjectId: input.subjectId,
      channel: input.channel,
      targetKind: input.targetKind,
      addressJson: input.addressJson
    });

    const existing = await this.repository.getTargetByKey(targetKey);
    const createdAt = existing?.createdAt ?? input.createdAt ?? nowIso;
    const updatedAt = input.updatedAt ?? nowIso;

    let status = input.status ?? existing?.status ?? (input.targetKind === 'in_app_user' ? 'active' : 'unverified');
    let verifiedAt = input.verifiedAt ?? existing?.verifiedAt ?? null;

    if (input.targetKind === 'in_app_user' && verifiedAt === null) {
      verifiedAt = nowIso;
      status = 'active';
    }

    validateTargetStatusTransition(input.targetKind, status, verifiedAt);

    const record: NotificationTargetRecord = {
      targetId: existing?.targetId ?? buildDeterministicId('target', targetKey),
      targetKey,
      subjectKind: input.subjectKind,
      subjectId: input.subjectId.trim(),
      channel: input.channel,
      targetKind: input.targetKind,
      status,
      label: normalizeLabel(input.label ?? existing?.label ?? null),
      addressJson: input.addressJson,
      createdAt,
      updatedAt,
      verifiedAt
    };

    await this.repository.upsertTargetByKey(record);
    const persisted = await this.repository.getTargetByKey(targetKey);
    if (!persisted) throw new Error('Target upsert failed to persist');
    return persisted;
  }

  async verifyTarget(targetId: string, verifiedAt = new Date().toISOString()): Promise<void> {
    await this.repository.updateTargetStatus(targetId, 'active', verifiedAt, verifiedAt);
  }

  async disableTargetForSubject(subjectKind: NotificationTargetRecord['subjectKind'], subjectId: string, targetId: string, updatedAt = new Date().toISOString()): Promise<void> {
    if (!await this.repository.updateTargetStatusForSubject(subjectKind, subjectId, targetId, 'disabled', updatedAt)) throw new Error('target_not_found');
  }

  async enableTargetForSubject(subjectKind: NotificationTargetRecord['subjectKind'], subjectId: string, targetId: string, updatedAt = new Date().toISOString()): Promise<void> {
    const target = await this.repository.getTargetForSubject(subjectKind, subjectId, targetId);
    if (!target) throw new Error('target_not_found');

    if (target.targetKind !== 'in_app_user' && target.verifiedAt === null) {
      throw new Error('Cannot activate unverified non-in-app notification target');
    }

    if (!await this.repository.updateTargetStatusForSubject(subjectKind, subjectId, targetId, 'active', updatedAt)) throw new Error('target_not_found');
  }
}
