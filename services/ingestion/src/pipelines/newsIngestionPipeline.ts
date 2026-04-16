import { kafkaTopics } from '@elceo/config';
import type { NewsProvider } from '@elceo/providers';
import { clusterArticleBurst } from '../normalization/dedupe';
import { normalizeEvent } from '../normalization/normalizeEvent';
import type { KafkaPublisher } from '../publishers/kafka-publisher';

export class NewsIngestionPipeline {
  constructor(private readonly provider: NewsProvider, private readonly publisher: KafkaPublisher) {}

  async ingest(query: string, fromIso: string, toIso: string): Promise<void> {
    const articles = await this.provider.searchNews(query, fromIso, toIso);
    const clustered = clusterArticleBurst(articles);

    for (const article of articles) {
      await this.publisher.publish(kafkaTopics.sourceNewsRaw, article.articleId, article);
      await this.publisher.publish(kafkaTopics.eventNormalized, article.articleId, normalizeEvent(article));
    }

    await this.publisher.publish(kafkaTopics.eventAssetMapped, query, clustered);
  }
}
