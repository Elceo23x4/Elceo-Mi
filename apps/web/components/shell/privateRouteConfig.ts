export type PrivateRouteGroup = 'primary' | 'development' | 'system';

export type PrivateRouteContext = {
  href: string;
  label: string;
  short: string;
  group: PrivateRouteGroup;
  shellKicker: string;
  workspaceLabel: string;
  contextPillLabel: string;
  contextPillValue: string;
  statusCues: string[];
};

export const privateRouteOrder: PrivateRouteContext[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    short: 'DB',
    group: 'primary',
    shellKicker: 'DASHBOARD SURFACE',
    workspaceLabel: 'Live cognition workspace',
    contextPillLabel: 'Asset',
    contextPillValue: 'XAU/USD · Intraday',
    statusCues: ['Bias + confidence stream', 'Contradiction monitored']
  },
  {
    href: '/portfolio',
    label: 'Portfolio',
    short: 'PF',
    group: 'primary',
    shellKicker: 'PORTFOLIO SURFACE',
    workspaceLabel: 'Watchlist command workspace',
    contextPillLabel: 'Depth',
    contextPillValue: 'Grouped focus mode',
    statusCues: ['Cluster pressure map', 'Watchlist depth aware']
  },
  {
    href: '/journal',
    label: 'Journal',
    short: 'JR',
    group: 'development',
    shellKicker: 'JOURNAL SURFACE',
    workspaceLabel: 'Execution evidence workspace',
    contextPillLabel: 'Capture',
    contextPillValue: 'Structured case mode',
    statusCues: ['Expectancy tracked', 'Session framing active']
  },
  {
    href: '/analytics',
    label: 'Analytics',
    short: 'AN',
    group: 'development',
    shellKicker: 'ANALYTICS SURFACE',
    workspaceLabel: 'Behavior diagnosis workspace',
    contextPillLabel: 'Period',
    contextPillValue: 'Rolling journal window',
    statusCues: ['Coaching emphasis ready', 'Pattern state monitored']
  },
  {
    href: '/settings',
    label: 'Settings',
    short: 'ST',
    group: 'system',
    shellKicker: 'SETTINGS SURFACE',
    workspaceLabel: 'Control-room workspace',
    contextPillLabel: 'System',
    contextPillValue: 'Plan + notifications',
    statusCues: ['Environment tuned', 'Lifecycle controls ready']
  },
  {
    href: '/admin',
    label: 'Admin',
    short: 'AD',
    group: 'system',
    shellKicker: 'ADMIN SURFACE',
    workspaceLabel: 'Operational console workspace',
    contextPillLabel: 'Ops',
    contextPillValue: 'Health + freshness + audit',
    statusCues: ['Governance trace active', 'Source health visible']
  }
];

export const privateRouteGroups: Array<{ id: PrivateRouteGroup; label: string }> = [
  { id: 'primary', label: 'Workspace' },
  { id: 'development', label: 'Development' },
  { id: 'system', label: 'System' }
];

export function resolvePrivateRoute(pathname: string): PrivateRouteContext {
  const matched = privateRouteOrder.find((route) => pathname.startsWith(route.href));
  return matched ?? privateRouteOrder[0];
}
