import { resolveTargetsForSubscriptionMatches } from '../delivery/target-resolver.js';
import { MemoryNotificationTargetRepository } from '../persistence/memory-notification-repository.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export async function runTargetResolverTests(): Promise<void> {
  const targetRepository = new MemoryNotificationTargetRepository();
  await targetRepository.saveTarget({ targetId: 't1', subjectKind: 'user', subjectId: 'u1', channel: 'in_app', targetKind: 'in_app_user', status: 'active', label: null, addressJson: '{}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });
  await targetRepository.saveTarget({ targetId: 't2', subjectKind: 'user', subjectId: 'u1', channel: 'in_app', targetKind: 'in_app_user', status: 'disabled', label: null, addressJson: '{}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });
  const resolved = await resolveTargetsForSubscriptionMatches([{ subscriptionId: 's1', subjectKind: 'user', subjectId: 'u1', channel: 'in_app', assetScope: '*', timeframeScope: '*', ruleKeyScope: '*', minMaterialityScore: null }], { targetRepository });
  assert(resolved.length === 1 && resolved[0]?.targetId === 't1', 'resolver keeps active channel-matching targets only');
}
