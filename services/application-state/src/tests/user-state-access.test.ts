import { ApplicationStateService } from '../application-state-service';
import { InMemoryUserStateRepository } from '../repositories/user-state-repository';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runUserStateAccessTests(): Promise<void> {
  const service = new ApplicationStateService(new InMemoryUserStateRepository());

  const created = await service.ensureUserFromIdentity({ email: 'analyst@elceo.dev', name: 'Analyst', role: 'analyst_admin' });
  const loaded = await service.getApplicationStateByUserId(created.profile.id);

  assert(loaded.profile.email === 'analyst@elceo.dev', 'user-state access should return the current user profile');
  assert(loaded.entitlement.planTier === loaded.profile.planTier, 'entitlement should align with persisted plan tier');
}
