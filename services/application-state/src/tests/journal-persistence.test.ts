import { ApplicationStateService } from '../application-state-service';
import { InMemoryAlertRepository } from '../repositories/alert-repository';
import { InMemoryTradeJournalRepository } from '../repositories/trade-journal-repository';
import { InMemoryUserStateRepository } from '../repositories/user-state-repository';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export async function runJournalPersistenceTests(): Promise<void> {
  const userRepo = new InMemoryUserStateRepository();
  const alertRepo = new InMemoryAlertRepository();
  const journalRepo = new InMemoryTradeJournalRepository();
  const service = new ApplicationStateService(userRepo, alertRepo, journalRepo);

  const state = await service.ensureUserFromIdentity({ email: 'journal@elceo.dev', name: 'Journal User' });

  const created = await service.createTradeJournalEntry(state.profile.id, {
    asset: 'XAU/USD',
    direction: 'long',
    entryPrice: 3020,
    stopPrice: 3008,
    takeProfitPrice: 3048,
    exitPrice: 3040,
    setupType: 'trend-continuation',
    reason: 'London continuation with macro support',
    emotion: 'calm',
    sessionTraded: 'london',
    majorNewsNearby: false,
    followedElceoBias: true,
    confidenceBeforeTrade: 72,
    confidenceAfterTrade: 78,
    mistakeCategory: 'none',
    lessonCategory: 'discipline',
    tradedAtUtc: '2026-03-04T08:15:00.000Z',
    closedAtUtc: '2026-03-04T10:20:00.000Z',
    media: [
      {
        mediaId: 'media-1',
        kind: 'image',
        url: 'local://journal/xau-1.png',
        caption: 'Structure mark-up',
        uploadedAtUtc: new Date().toISOString(),
        status: 'pending'
      }
    ]
  });

  assert(created.outcome === 'win', 'journal entry should derive win outcome');
  assert(created.resultRMultiple > 0, 'journal entry should derive R multiple');

  const list = await service.listTradeJournalEntries(state.profile.id, 20);
  assert(list.length === 1, 'journal listing should return persisted entry');
  assert(list[0]?.asset === 'XAU/USD', 'journal list should include asset');

  const full = await service.getTradeJournalEntries(state.profile.id, 20);
  assert(full[0]?.media.length === 1, 'journal media scaffold should persist');
}
