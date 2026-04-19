import type { NormalizedMacroEvent, NormalizedNewsArticle } from '@elceo/schemas';

export function macroEventDedupeKey(event: NormalizedMacroEvent): string {
  const hourBucket = event.releaseTimeUtc.slice(0, 13);
  return `${event.country.toLowerCase()}::${event.indicatorName.toLowerCase()}::${hourBucket}`;
}

export function articleDedupeKey(article: Pick<NormalizedNewsArticle, 'headline' | 'publishedAtUtc'>): string {
  return `${article.headline.toLowerCase().trim()}::${article.publishedAtUtc.slice(0, 13)}`;
}

export function clusterArticleBurst(articles: NormalizedNewsArticle[]): Record<string, NormalizedNewsArticle[]> {
  return articles.reduce<Record<string, NormalizedNewsArticle[]>>((acc, article) => {
    const key = article.publishedAtUtc.slice(0, 10);
    acc[key] ??= [];
    acc[key].push(article);
    return acc;
  }, {});
}
