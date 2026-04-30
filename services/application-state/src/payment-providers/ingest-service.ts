import type { BillingExternalEventIngestResult, BillingExternalProviderKind, BillingProviderPlanMapping, StripeLikeWebhookEnvelope } from '@elceo/types';
import type { ExternalBillingCustomerRepository, ExternalBillingEventRepository, ExternalBillingSubscriptionRepository, ProviderPlanMappingRepository } from '../persistence';
import { ExternalEventDeduper } from './event-deduper';
import { normalizeStripeLikeEnvelope } from './stripe-like-normalizer';
import { ExternalCustomerSyncService } from './customer-sync';
import { ExternalSubscriptionSyncService } from './subscription-sync';
import { PaymentProviderTranslator } from './translator';
import { ProviderPlanMapper } from './plan-mapper';

export class PaymentProviderIngestService {
  private readonly deduper: ExternalEventDeduper;
  private readonly customerSync: ExternalCustomerSyncService;
  private readonly subscriptionSync: ExternalSubscriptionSyncService;
  constructor(
    private readonly events: ExternalBillingEventRepository,
    customers: ExternalBillingCustomerRepository,
    subs: ExternalBillingSubscriptionRepository,
    private readonly mappings: ProviderPlanMappingRepository,
    private readonly translator: PaymentProviderTranslator
  ) { this.deduper = new ExternalEventDeduper(events); this.customerSync = new ExternalCustomerSyncService(customers); this.subscriptionSync = new ExternalSubscriptionSyncService(subs, new ProviderPlanMapper(mappings)); }

  async ingestExternalEvent(envelope: StripeLikeWebhookEnvelope): Promise<BillingExternalEventIngestResult> {
    const normalized = normalizeStripeLikeEnvelope(envelope);
    const nowIso = new Date().toISOString();
    const d = await this.deduper.check(normalized.providerKind, normalized.externalEventId);
    if (d.deduplicated && d.existing) return { accepted: true, deduplicated: true, translated: false, externalEventId: normalized.externalEventId, providerKind: normalized.providerKind, processingResultCode: d.existing.processingResultCode ?? 'deduplicated', linkedBillingSubscriptionId: null, linkedSubjectId: d.existing.subjectId, processedAt: nowIso };

    await this.events.saveEvent({ externalEventId: normalized.externalEventId, providerKind: normalized.providerKind, kind: normalized.kind, externalCustomerId: normalized.externalCustomerId, externalSubscriptionId: normalized.externalSubscriptionId, subjectKind: normalized.subject?.subjectKind ?? null, subjectId: normalized.subject?.subjectId ?? null, occurredAt: normalized.occurredAt, payloadJson: normalized.payloadJson, processed: false, processingResultCode: null, createdAt: nowIso, updatedAt: nowIso });
    await this.customerSync.sync(normalized.providerKind, normalized, nowIso);
    await this.subscriptionSync.sync(normalized.providerKind, normalized, nowIso);
    const translated = await this.translator.translate(normalized);
    await this.events.markProcessed(normalized.providerKind, normalized.externalEventId, translated.processingResultCode, nowIso);
    return { accepted: true, deduplicated: false, translated: translated.translated, externalEventId: normalized.externalEventId, providerKind: normalized.providerKind, processingResultCode: translated.processingResultCode, linkedBillingSubscriptionId: translated.linkedBillingSubscriptionId, linkedSubjectId: translated.linkedSubjectId, processedAt: nowIso };
  }

  async replayUnprocessedEvents(limit = 50) {
    const rows = await this.events.listUnprocessedEvents(limit);
    const results: BillingExternalEventIngestResult[] = [];
    for (const row of rows) {
      const translated = await this.translator.translatePersistedEvent(row);
      const nowIso = new Date().toISOString();
      await this.events.markProcessed(row.providerKind, row.externalEventId, translated.processingResultCode, nowIso);
      results.push({ accepted: true, deduplicated: false, translated: translated.translated, externalEventId: row.externalEventId, providerKind: row.providerKind, processingResultCode: translated.processingResultCode, linkedBillingSubscriptionId: translated.linkedBillingSubscriptionId, linkedSubjectId: translated.linkedSubjectId, processedAt: nowIso });
    }
    return results;
  }

  ingestManualEvent(providerKind: BillingExternalProviderKind, externalEventId: string, dataJson: string) { return this.ingestExternalEvent({ providerKind, externalEventId, eventType: 'manual.event.ingested', createdAt: new Date().toISOString(), dataJson }); }
  upsertProviderPlanMapping(mapping: BillingProviderPlanMapping) { return this.mappings.upsertPlanMapping({ ...mapping, updatedAt: new Date().toISOString() }); }
}
