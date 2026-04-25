import type { SnapshotDomainKind } from '@elceo/types';
import { SNAPSHOT_REFRESH_DOMAIN_ORDER } from './constants';

const DEPENDENCIES: Record<SnapshotDomainKind, SnapshotDomainKind[]> = {
  journal_influence: [],
  analytics: [],
  coaching: ['journal_influence', 'analytics'],
  portfolio: [],
  workspace: ['coaching', 'portfolio']
};

const DEPENDENTS: Record<SnapshotDomainKind, SnapshotDomainKind[]> = {
  journal_influence: ['coaching', 'workspace'],
  analytics: ['coaching', 'workspace'],
  coaching: ['workspace'],
  portfolio: ['workspace'],
  workspace: []
};

export function getSnapshotDomainDependencies(domain: SnapshotDomainKind): SnapshotDomainKind[] {
  return [...DEPENDENCIES[domain]].sort((a, b) => SNAPSHOT_REFRESH_DOMAIN_ORDER.indexOf(a) - SNAPSHOT_REFRESH_DOMAIN_ORDER.indexOf(b));
}

export function getSnapshotDomainDependents(domain: SnapshotDomainKind): SnapshotDomainKind[] {
  return [...DEPENDENTS[domain]].sort((a, b) => SNAPSHOT_REFRESH_DOMAIN_ORDER.indexOf(a) - SNAPSHOT_REFRESH_DOMAIN_ORDER.indexOf(b));
}

export function expandDependentsRecursively(baseDomains: SnapshotDomainKind[]): SnapshotDomainKind[] {
  const out = new Set<SnapshotDomainKind>(baseDomains);
  const queue = [...baseDomains];
  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) continue;
    for (const dependent of getSnapshotDomainDependents(next)) {
      if (!out.has(dependent)) {
        out.add(dependent);
        queue.push(dependent);
      }
    }
  }
  return SNAPSHOT_REFRESH_DOMAIN_ORDER.filter((domain) => out.has(domain));
}
