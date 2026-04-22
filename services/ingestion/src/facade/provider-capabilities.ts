import type { SourceCategory } from '@elceo/types';

export type ProviderCapabilityDiagnostic = {
  providerName: string;
  category: SourceCategory;
  enabled: boolean;
  healthyToConstruct: boolean;
  reason: string | null;
};

export type FacadeDiagnostics = {
  providerCapabilities: ProviderCapabilityDiagnostic[];
  activeProviderCount: number;
  activeProvidersByCategory: Record<string, string[]>;
  canonicalBoundaryVersion: string;
};

export const CANONICAL_BOUNDARY_VERSION = 'c2b.0.0';

export function buildActiveProvidersByCategory(capabilities: ProviderCapabilityDiagnostic[]): Record<string, string[]> {
  const categories = ['market_data', 'macro_calendar', 'macro_context', 'news', 'geopolitics'] as const;
  const result: Record<string, string[]> = {
    market_data: [],
    macro_calendar: [],
    macro_context: [],
    news: [],
    geopolitics: []
  };

  for (const category of categories) {
    result[category] = capabilities
      .filter((item) => item.category === category && item.enabled && item.healthyToConstruct)
      .map((item) => item.providerName);
  }

  return result;
}
