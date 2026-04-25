import type { WorkspaceAgendaItem, WorkspaceCoachingSummary } from '@elceo/types';

export function buildWorkspaceSupportingCaseIds(agenda: WorkspaceAgendaItem[], coachingSummary: WorkspaceCoachingSummary, cap = 50): string[] {
  const output: string[] = [];
  const seen = new Set<string>();

  const append = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    output.push(id);
  };

  for (const item of agenda) {
    for (const caseId of item.supportingCaseIds) {
      append(caseId);
      if (output.length >= cap) return output;
    }
  }

  for (const caseId of coachingSummary.supportingCaseIds) {
    append(caseId);
    if (output.length >= cap) return output;
  }

  return output;
}
