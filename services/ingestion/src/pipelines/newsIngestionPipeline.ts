<<<<<<< HEAD
import { kafkaTopics } from '@elceo/config';
import type { InternalNormalizedEvent } from '@elceo/schemas';
import type { NewsProvider } from '@elceo/providers';
import { clusterArticleBurst } from '../normalization/dedupe';
import { normalizeEvent } from '../normalization/normalizeEvent';
import type { KafkaPublisher } from '../publishers/kafka-publisher';

export class NewsIngestionPipeline {
  constructor(private readonly provider: NewsProvider, private readonly publisher: KafkaPublisher) {}

  async ingest(query: string, fromIso: string, toIso: string): Promise<InternalNormalizedEvent[]> {
    const articles = await this.provider.searchNews(query, fromIso, toIso);
    const clustered = clusterArticleBurst(articles);
    const normalized: InternalNormalizedEvent[] = [];

    for (const article of articles) {
      const normalizedArticle = normalizeEvent(article);
      normalized.push(normalizedArticle);
      await this.publisher.publish(kafkaTopics.sourceNewsRaw, article.articleId, article);
      await this.publisher.publish(kafkaTopics.eventNormalized, article.articleId, normalizedArticle);
    }

    await this.publisher.publish(kafkaTopics.eventAssetMapped, query, clustered);
    return normalized;
  }
}
=======
export {};
>>>>>>> origin/main
