import { validateWorkspaceSnapshot } from '@elceo/schemas';
import type { WorkspaceSnapshot } from '@elceo/types';

function parseJsonStrict(input: string, label: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    throw new Error(`malformed_json:${label}`);
  }
}

export function serializeWorkspaceSnapshot(snapshot: WorkspaceSnapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializeWorkspaceSnapshot(input: string): WorkspaceSnapshot {
  const parsed = parseJsonStrict(input, 'workspace_snapshot');
  const result = validateWorkspaceSnapshot(parsed);
  if (result.ok === false) throw new Error(`invalid_workspace_snapshot:${result.errors.join('; ')}`);
  return result.value;
}
