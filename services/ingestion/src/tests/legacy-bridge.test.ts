import type { NewsProvider } from '@elceo/providers';
import { LegacyNewsBridge } from '../bridges/legacy-news-bridge';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

class ValidNewsProvider implements NewsProvider {
  readonly providerId = 'news-valid';

  async searchNews(query: string): Promise<import('@elceo/schemas').NormalizedNewsArticle[]> {
    return [
      {
        type: 'news_article',
        provider: 'newsapi',
        articleId: 'a-1',
        sourceName: 'NewsAPI',
        url: 'https://example.com/a1',
        headline: `headline ${query}`,
        summary: 'summary',
        publishedAtUtc: '2026-01-01T00:00:00.000Z',
        mentionedAssets: [query],
        dedupeKey: 'a-1'
      }
    ];
  }
}

class InvalidNewsProvider implements NewsProvider {
  readonly providerId = 'news-invalid';

  async searchNews(): Promise<import('@elceo/schemas').NormalizedNewsArticle[]> {
    return [
      {
        type: 'news_article',
        provider: 'newsapi',
        articleId: 'a-2',
        sourceName: 'NewsAPI',
        url: 'https://example.com/a2',
        headline: 'bad',
        summary: 'bad',
        publishedAtUtc: 'not-iso' as unknown as string,
        mentionedAssets: ['XAU/USD'],
        dedupeKey: 'a-2'
      }
    ];
  }
}

export async function runLegacyBridgeTests(): Promise<void> {
  const validBridge = new LegacyNewsBridge(new ValidNewsProvider());
  const validEvents = await validBridge.getRecentNewsEvidence('XAU/USD', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z');
  assert(validEvents.length === 1, 'valid legacy payload should bridge to canonical event');
  assert(validEvents[0]?.eventKind === 'news', 'bridge event kind should be news');

  const invalidBridge = new LegacyNewsBridge(new InvalidNewsProvider());
  const invalidEvents = await invalidBridge.getRecentNewsEvidence('XAU/USD', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z');
  assert(invalidEvents.length === 0, 'invalid bridged event should be dropped');
  const diagnostics = invalidBridge.consumeBridgeDroppedRecords();
  assert(diagnostics.length === 1, 'invalid bridge item should emit drop diagnostic');
  assert(diagnostics[0]?.reason === 'bridge_failure', 'drop reason should be bridge_failure when mapping throws');
}
