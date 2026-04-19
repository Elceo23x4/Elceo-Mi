export const kafkaTopics = {
  sourceMarketRaw: 'elceo.source.market.raw',
  sourceMacroRaw: 'elceo.source.macro.raw',
  sourceNewsRaw: 'elceo.source.news.raw',
  sourceGeopoliticsRaw: 'elceo.source.geopolitics.raw',
  sourceCrawlRaw: 'elceo.source.crawl.raw',
  eventNormalized: 'elceo.event.normalized',
  eventAssetMapped: 'elceo.event.asset-mapped',
  eventReasoned: 'elceo.event.reasoned',
  assetStateUpdated: 'elceo.asset.state-updated',
  annotationRequested: 'elceo.asset.annotation-requested',
  annotationCreated: 'elceo.asset.annotation-created',
  alertTriggered: 'elceo.user.alert-triggered',
  alertDispatched: 'elceo.user.alert-dispatched',
  journalCreated: 'elceo.journal.created',
  analyticsRecomputeRequested: 'elceo.analytics.recompute-requested',
  adminAuditLog: 'elceo.admin.audit-log'
} as const;

export type KafkaTopic = (typeof kafkaTopics)[keyof typeof kafkaTopics];
