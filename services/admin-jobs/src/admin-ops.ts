import { ApplicationStateService } from '@elceo/application-state';
import { readPersistedState } from '@elceo/ingestion';
import { buildAdminOperationalSnapshot, type AdminOperationalSnapshot } from '@elceo/notifications';

const appStateService = new ApplicationStateService();

export async function getAdminOperationalSnapshot(): Promise<AdminOperationalSnapshot> {
  const snapshot = await readPersistedState();
  const auditLogs = await appStateService.listAuditLogs(80);

  return buildAdminOperationalSnapshot({
    sourceHealth: snapshot.sourceHealthSnapshots,
    cognitionByAsset: snapshot.cognitionByAsset,
    auditLogs
  });
}
