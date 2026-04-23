import type { CanonicalAssetSymbol, JournalInfluenceFlag, Timeframe } from '@elceo/types';

export type ReasoningJournalInfluence = {
  enabled: boolean;
  influenceFlag: JournalInfluenceFlag;
  linkedEntryIds: string[];
};

export interface ReasoningJournalInfluenceProvider {
  loadJournalInfluence(asset: CanonicalAssetSymbol, timeframe: Timeframe, asOf: string, userId?: string | null): Promise<ReasoningJournalInfluence>;
}

export class DisabledJournalInfluenceProvider implements ReasoningJournalInfluenceProvider {
  async loadJournalInfluence(_asset: CanonicalAssetSymbol, _timeframe: Timeframe, _asOf: string, _userId?: string | null): Promise<ReasoningJournalInfluence> {
    return { enabled: false, influenceFlag: 'none', linkedEntryIds: [] };
  }
}

const ALLOWED_FLAGS: JournalInfluenceFlag[] = ['none', 'weak', 'medium', 'strong'];

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
  return input;
}
