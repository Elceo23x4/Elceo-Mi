import type { CanonicalAssetSymbol, JournalInfluenceFlag, JournalInfluenceSummary, Timeframe } from '@elceo/types';
import { validateJournalInfluenceSummary } from '@elceo/schemas';

export type ReasoningJournalInfluence = {
  enabled: boolean;
  influenceFlag: JournalInfluenceFlag;
  linkedEntryIds: string[];
  summary: JournalInfluenceSummary | null;
};

export interface JournalInfluenceProviderContract {
  getJournalInfluenceForReasoningInput(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    asset: CanonicalAssetSymbol,
    timeframe: Timeframe,
    asOfIso: string
  ): Promise<ReasoningJournalInfluence>;
}

export interface ReasoningJournalInfluenceProvider {
  loadJournalInfluence(asset: CanonicalAssetSymbol, timeframe: Timeframe, asOf: string, userId?: string | null): Promise<ReasoningJournalInfluence>;
}

export class DisabledJournalInfluenceProvider implements ReasoningJournalInfluenceProvider {
  async loadJournalInfluence(_asset: CanonicalAssetSymbol, _timeframe: Timeframe, _asOf: string, _userId?: string | null): Promise<ReasoningJournalInfluence> {
    return { enabled: false, influenceFlag: 'none', linkedEntryIds: [], summary: null };
  }
}

const ALLOWED_FLAGS: JournalInfluenceFlag[] = ['none', 'weak', 'medium', 'strong'];

export function deriveInfluenceFlag(summary: JournalInfluenceSummary | null): JournalInfluenceFlag {
  if (!summary) return 'none';
  const bestSetup = summary.setupPatterns[0]?.influenceScore ?? 0;
  const strongestBehavior = Math.max(...summary.behaviorPatterns.map((item) => item.influenceScore), 0);
  const signal = Math.max(bestSetup, strongestBehavior);
  if (signal >= 70) return 'strong';
  if (signal >= 45) return 'medium';
  if (signal > 0) return 'weak';
  return 'none';
}

export function validateJournalInfluenceOrThrow(input: ReasoningJournalInfluence): ReasoningJournalInfluence {
  if (!ALLOWED_FLAGS.includes(input.influenceFlag)) {
    throw new Error(`invalid influenceFlag: ${input.influenceFlag}`);
  }
  if (!Array.isArray(input.linkedEntryIds) || !input.linkedEntryIds.every((item) => typeof item === 'string')) {
    throw new Error('linkedEntryIds must be string[]');
  }
  if (typeof input.enabled !== 'boolean') {
    throw new Error('enabled must be boolean');
  }
  if (input.summary !== null) {
    const summaryValidation = validateJournalInfluenceSummary(input.summary);
    if (summaryValidation.ok === false) {
      throw new Error(`invalid_journal_influence_summary:${summaryValidation.errors.join('; ')}`);
    }
  }
  return input;
}


export class ContractBackedJournalInfluenceProvider implements ReasoningJournalInfluenceProvider {
  constructor(private readonly provider: JournalInfluenceProviderContract, private readonly subjectKind: 'user' | 'workspace' | 'ops' = 'user') {}

  async loadJournalInfluence(asset: CanonicalAssetSymbol, timeframe: Timeframe, asOf: string, userId?: string | null): Promise<ReasoningJournalInfluence> {
    if (!userId) return { enabled: false, influenceFlag: 'none', linkedEntryIds: [], summary: null };
    const response = await this.provider.getJournalInfluenceForReasoningInput(this.subjectKind, userId, asset, timeframe, asOf);
    const validated = validateJournalInfluenceOrThrow(response);
    return {
      ...validated,
      influenceFlag: validated.influenceFlag === 'none' && validated.summary ? deriveInfluenceFlag(validated.summary) : validated.influenceFlag
    };
  }
}
