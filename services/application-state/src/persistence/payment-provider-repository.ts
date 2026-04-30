import type {
  BillingExternalCustomerRecord,
  BillingExternalEventKind,
  BillingExternalEventRecord,
  BillingExternalProviderKind,
  BillingExternalSubscriptionRecord,
  BillingProviderPlanMapping
} from '@elceo/types';
import { queryDb } from '../db/client';
import type {
  ExternalBillingCustomerRepository,
  ExternalBillingEventRepository,
  ExternalBillingSubscriptionRepository,
  PersistedExternalCustomerRecord,
  PersistedExternalEventRecord,
  PersistedExternalSubscriptionRecord,
  PersistedProviderPlanMappingRecord,
  ProviderPlanMappingRepository
} from './contracts';

const cap = (n?: number) => Math.max(1, Math.min(500, n ?? 50));

const toCustomer = (row: BillingExternalCustomerRecord): PersistedExternalCustomerRecord => ({ ...row });
const toSubscription = (row: BillingExternalSubscriptionRecord): PersistedExternalSubscriptionRecord => ({ ...row });
const toEvent = (row: BillingExternalEventRecord): PersistedExternalEventRecord => ({ ...row });
const toMapping = (row: BillingProviderPlanMapping & { updatedAt: string }): PersistedProviderPlanMappingRecord => ({ ...row });

export class MemoryExternalBillingCustomerRepository implements ExternalBillingCustomerRepository {
  private rows = new Map<string, PersistedExternalCustomerRecord>();
  async getCustomer(providerKind: BillingExternalProviderKind, externalCustomerId: string) { const row = this.rows.get(`${providerKind}:${externalCustomerId}`); return row ? { ...row } : null; }
  async saveCustomer(record: PersistedExternalCustomerRecord) { this.rows.set(`${record.providerKind}:${record.externalCustomerId}`, { ...record }); }
  async getCustomerBySubject(subjectKind: 'user', subjectId: string, providerKind?: BillingExternalProviderKind) {
    for (const row of this.rows.values()) {
      if (row.subjectKind === subjectKind && row.subjectId === subjectId && (!providerKind || row.providerKind === providerKind)) return { ...row };
    }
    return null;
  }
}

export class MemoryExternalBillingSubscriptionRepository implements ExternalBillingSubscriptionRepository {
  private rows = new Map<string, PersistedExternalSubscriptionRecord>();
  async getSubscription(providerKind: BillingExternalProviderKind, externalSubscriptionId: string) { const row = this.rows.get(`${providerKind}:${externalSubscriptionId}`); return row ? { ...row } : null; }
  async saveSubscription(record: PersistedExternalSubscriptionRecord) { this.rows.set(`${record.providerKind}:${record.externalSubscriptionId}`, { ...record }); }
  async getLatestSubscriptionForSubject(subjectKind: 'user', subjectId: string, providerKind?: BillingExternalProviderKind) { return (await this.listSubscriptionsForSubject(subjectKind, subjectId, providerKind))[0] ?? null; }
  async listSubscriptionsForSubject(subjectKind: 'user', subjectId: string, providerKind?: BillingExternalProviderKind) {
    return [...this.rows.values()]
      .filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId && (!providerKind || row.providerKind === providerKind))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.externalSubscriptionId.localeCompare(b.externalSubscriptionId))
      .map((row) => ({ ...row }));
  }
}

export class MemoryExternalBillingEventRepository implements ExternalBillingEventRepository {
  private rows = new Map<string, PersistedExternalEventRecord>();
  async getEvent(providerKind: BillingExternalProviderKind, externalEventId: string) { const row = this.rows.get(`${providerKind}:${externalEventId}`); return row ? { ...row } : null; }
  async saveEvent(record: PersistedExternalEventRecord) { this.rows.set(`${record.providerKind}:${record.externalEventId}`, { ...record }); }
  async markProcessed(providerKind: BillingExternalProviderKind, externalEventId: string, processingResultCode: string, updatedAt: string) {
    const key = `${providerKind}:${externalEventId}`;
    const current = this.rows.get(key);
    if (!current) return;
    this.rows.set(key, { ...current, processed: true, processingResultCode, updatedAt });
  }
  async listEventsForSubject(subjectKind: 'user', subjectId: string, limit?: number) {
    return [...this.rows.values()]
      .filter((row) => row.subjectKind === subjectKind && row.subjectId === subjectId)
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.externalEventId.localeCompare(b.externalEventId))
      .slice(0, cap(limit))
      .map((row) => ({ ...row }));
  }
  async listUnprocessedEvents(limit?: number) {
    return [...this.rows.values()]
      .filter((row) => !row.processed)
      .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.externalEventId.localeCompare(b.externalEventId))
      .slice(0, cap(limit))
      .map((row) => ({ ...row }));
  }
}

export class MemoryProviderPlanMappingRepository implements ProviderPlanMappingRepository {
  private rows = new Map<string, PersistedProviderPlanMappingRecord>();
  async getPlanMapping(providerKind: BillingExternalProviderKind, externalPriceId: string) { const row = this.rows.get(`${providerKind}:${externalPriceId}`); return row ? { ...row } : null; }
  async upsertPlanMapping(record: PersistedProviderPlanMappingRecord) { this.rows.set(`${record.providerKind}:${record.externalPriceId}`, { ...record }); }
  async listPlanMappings(providerKind?: BillingExternalProviderKind) {
    return [...this.rows.values()]
      .filter((row) => !providerKind || row.providerKind === providerKind)
      .sort((a, b) => a.providerKind.localeCompare(b.providerKind) || a.externalPriceId.localeCompare(b.externalPriceId))
      .map((row) => ({ ...row }));
  }
}

type CustomerRow = { external_customer_id: string; provider_kind: BillingExternalProviderKind; subject_kind: 'user'; subject_id: string; email: string | null; metadata_json: string; created_at: string; updated_at: string; };
type SubscriptionRow = { external_subscription_id: string; external_customer_id: string; provider_kind: BillingExternalProviderKind; subject_kind: 'user'; subject_id: string; external_price_id: string | null; external_product_id: string | null; mapped_plan_kind: BillingExternalSubscriptionRecord['mappedPlanKind']; provider_status: string; cancel_at_period_end: boolean; current_period_start: string | null; current_period_end: string | null; trial_starts_at: string | null; trial_ends_at: string | null; metadata_json: string; created_at: string; updated_at: string; };
type EventRow = { external_event_id: string; provider_kind: BillingExternalProviderKind; kind: BillingExternalEventKind; external_customer_id: string | null; external_subscription_id: string | null; subject_kind: 'user' | null; subject_id: string | null; occurred_at: string; payload_json: string; processed: boolean; processing_result_code: string | null; created_at: string; updated_at: string; };
type MappingRow = { provider_kind: BillingExternalProviderKind; external_price_id: string; mapped_plan_kind: BillingProviderPlanMapping['mappedPlanKind']; interval: BillingProviderPlanMapping['interval']; updated_at: string; };

const mapCustomerRow = (row: CustomerRow): PersistedExternalCustomerRecord => toCustomer({ externalCustomerId: row.external_customer_id, providerKind: row.provider_kind, subjectKind: row.subject_kind, subjectId: row.subject_id, email: row.email, metadataJson: row.metadata_json, createdAt: row.created_at, updatedAt: row.updated_at });
const mapSubscriptionRow = (row: SubscriptionRow): PersistedExternalSubscriptionRecord => toSubscription({ externalSubscriptionId: row.external_subscription_id, externalCustomerId: row.external_customer_id, providerKind: row.provider_kind, subjectKind: row.subject_kind, subjectId: row.subject_id, externalPriceId: row.external_price_id, externalProductId: row.external_product_id, mappedPlanKind: row.mapped_plan_kind, providerStatus: row.provider_status, cancelAtPeriodEnd: row.cancel_at_period_end, currentPeriodStart: row.current_period_start, currentPeriodEnd: row.current_period_end, trialStartsAt: row.trial_starts_at, trialEndsAt: row.trial_ends_at, metadataJson: row.metadata_json, createdAt: row.created_at, updatedAt: row.updated_at });
const mapEventRow = (row: EventRow): PersistedExternalEventRecord => toEvent({ externalEventId: row.external_event_id, providerKind: row.provider_kind, kind: row.kind, externalCustomerId: row.external_customer_id, externalSubscriptionId: row.external_subscription_id, subjectKind: row.subject_kind, subjectId: row.subject_id, occurredAt: row.occurred_at, payloadJson: row.payload_json, processed: row.processed, processingResultCode: row.processing_result_code, createdAt: row.created_at, updatedAt: row.updated_at });
const mapMappingRow = (row: MappingRow): PersistedProviderPlanMappingRecord => toMapping({ providerKind: row.provider_kind, externalPriceId: row.external_price_id, mappedPlanKind: row.mapped_plan_kind, interval: row.interval, updatedAt: row.updated_at });

export class SQLExternalBillingCustomerRepository implements ExternalBillingCustomerRepository { async getCustomer(providerKind: BillingExternalProviderKind, externalCustomerId: string) { const rows = await queryDb<CustomerRow>('SELECT external_customer_id,provider_kind,subject_kind,subject_id,email,metadata_json::text AS metadata_json,created_at,updated_at FROM app_billing_external_customers WHERE provider_kind=$1 AND external_customer_id=$2', [providerKind, externalCustomerId]); return rows[0] ? mapCustomerRow(rows[0]) : null; } async saveCustomer(r: PersistedExternalCustomerRecord) { await queryDb('INSERT INTO app_billing_external_customers (external_customer_id,provider_kind,subject_kind,subject_id,email,metadata_json,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8) ON CONFLICT (external_customer_id) DO UPDATE SET subject_kind=EXCLUDED.subject_kind,subject_id=EXCLUDED.subject_id,email=EXCLUDED.email,metadata_json=EXCLUDED.metadata_json,updated_at=EXCLUDED.updated_at', [r.externalCustomerId, r.providerKind, r.subjectKind, r.subjectId, r.email, r.metadataJson, r.createdAt, r.updatedAt]); } async getCustomerBySubject(subjectKind: 'user', subjectId: string, providerKind?: BillingExternalProviderKind) { const rows = providerKind ? await queryDb<CustomerRow>('SELECT external_customer_id,provider_kind,subject_kind,subject_id,email,metadata_json::text AS metadata_json,created_at,updated_at FROM app_billing_external_customers WHERE subject_kind=$1 AND subject_id=$2 AND provider_kind=$3 ORDER BY updated_at DESC, external_customer_id ASC LIMIT 1', [subjectKind, subjectId, providerKind]) : await queryDb<CustomerRow>('SELECT external_customer_id,provider_kind,subject_kind,subject_id,email,metadata_json::text AS metadata_json,created_at,updated_at FROM app_billing_external_customers WHERE subject_kind=$1 AND subject_id=$2 ORDER BY updated_at DESC, external_customer_id ASC LIMIT 1', [subjectKind, subjectId]); return rows[0] ? mapCustomerRow(rows[0]) : null; } }
export class SQLExternalBillingSubscriptionRepository implements ExternalBillingSubscriptionRepository {
  async getSubscription(providerKind: BillingExternalProviderKind, externalSubscriptionId: string) { const rows = await queryDb<SubscriptionRow>('SELECT external_subscription_id,external_customer_id,provider_kind,subject_kind,subject_id,external_price_id,external_product_id,mapped_plan_kind,provider_status,cancel_at_period_end,current_period_start,current_period_end,trial_starts_at,trial_ends_at,metadata_json::text AS metadata_json,created_at,updated_at FROM app_billing_external_subscriptions WHERE provider_kind=$1 AND external_subscription_id=$2', [providerKind, externalSubscriptionId]); return rows[0] ? mapSubscriptionRow(rows[0]) : null; }
  async saveSubscription(r: PersistedExternalSubscriptionRecord) { await queryDb('INSERT INTO app_billing_external_subscriptions (external_subscription_id,external_customer_id,provider_kind,subject_kind,subject_id,external_price_id,external_product_id,mapped_plan_kind,provider_status,cancel_at_period_end,current_period_start,current_period_end,trial_starts_at,trial_ends_at,metadata_json,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17) ON CONFLICT (external_subscription_id) DO UPDATE SET external_customer_id=EXCLUDED.external_customer_id,subject_kind=EXCLUDED.subject_kind,subject_id=EXCLUDED.subject_id,external_price_id=EXCLUDED.external_price_id,external_product_id=EXCLUDED.external_product_id,mapped_plan_kind=EXCLUDED.mapped_plan_kind,provider_status=EXCLUDED.provider_status,cancel_at_period_end=EXCLUDED.cancel_at_period_end,current_period_start=EXCLUDED.current_period_start,current_period_end=EXCLUDED.current_period_end,trial_starts_at=EXCLUDED.trial_starts_at,trial_ends_at=EXCLUDED.trial_ends_at,metadata_json=EXCLUDED.metadata_json,updated_at=EXCLUDED.updated_at', [r.externalSubscriptionId, r.externalCustomerId, r.providerKind, r.subjectKind, r.subjectId, r.externalPriceId, r.externalProductId, r.mappedPlanKind, r.providerStatus, r.cancelAtPeriodEnd, r.currentPeriodStart, r.currentPeriodEnd, r.trialStartsAt, r.trialEndsAt, r.metadataJson, r.createdAt, r.updatedAt]); }
  async getLatestSubscriptionForSubject(subjectKind: 'user', subjectId: string, providerKind?: BillingExternalProviderKind) { const rows = await this.listSubscriptionsForSubject(subjectKind, subjectId, providerKind); return rows[0] ?? null; }
  async listSubscriptionsForSubject(subjectKind: 'user', subjectId: string, providerKind?: BillingExternalProviderKind) { const rows = providerKind ? await queryDb<SubscriptionRow>('SELECT external_subscription_id,external_customer_id,provider_kind,subject_kind,subject_id,external_price_id,external_product_id,mapped_plan_kind,provider_status,cancel_at_period_end,current_period_start,current_period_end,trial_starts_at,trial_ends_at,metadata_json::text AS metadata_json,created_at,updated_at FROM app_billing_external_subscriptions WHERE subject_kind=$1 AND subject_id=$2 AND provider_kind=$3 ORDER BY updated_at DESC, external_subscription_id ASC', [subjectKind, subjectId, providerKind]) : await queryDb<SubscriptionRow>('SELECT external_subscription_id,external_customer_id,provider_kind,subject_kind,subject_id,external_price_id,external_product_id,mapped_plan_kind,provider_status,cancel_at_period_end,current_period_start,current_period_end,trial_starts_at,trial_ends_at,metadata_json::text AS metadata_json,created_at,updated_at FROM app_billing_external_subscriptions WHERE subject_kind=$1 AND subject_id=$2 ORDER BY updated_at DESC, external_subscription_id ASC', [subjectKind, subjectId]); return rows.map(mapSubscriptionRow); }
}
export class SQLExternalBillingEventRepository implements ExternalBillingEventRepository {
  async getEvent(providerKind: BillingExternalProviderKind, externalEventId: string) { const rows = await queryDb<EventRow>('SELECT external_event_id,provider_kind,kind,external_customer_id,external_subscription_id,subject_kind,subject_id,occurred_at,payload_json::text AS payload_json,processed,processing_result_code,created_at,updated_at FROM app_billing_external_events WHERE provider_kind=$1 AND external_event_id=$2', [providerKind, externalEventId]); return rows[0] ? mapEventRow(rows[0]) : null; }
  async saveEvent(r: PersistedExternalEventRecord) { await queryDb('INSERT INTO app_billing_external_events (external_event_id,provider_kind,kind,external_customer_id,external_subscription_id,subject_kind,subject_id,occurred_at,payload_json,processed,processing_result_code,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13) ON CONFLICT (provider_kind, external_event_id) DO UPDATE SET kind=EXCLUDED.kind,external_customer_id=EXCLUDED.external_customer_id,external_subscription_id=EXCLUDED.external_subscription_id,subject_kind=EXCLUDED.subject_kind,subject_id=EXCLUDED.subject_id,occurred_at=EXCLUDED.occurred_at,payload_json=EXCLUDED.payload_json,processed=EXCLUDED.processed,processing_result_code=EXCLUDED.processing_result_code,updated_at=EXCLUDED.updated_at', [r.externalEventId, r.providerKind, r.kind, r.externalCustomerId, r.externalSubscriptionId, r.subjectKind, r.subjectId, r.occurredAt, r.payloadJson, r.processed, r.processingResultCode, r.createdAt, r.updatedAt]); }
  async markProcessed(providerKind: BillingExternalProviderKind, externalEventId: string, processingResultCode: string, updatedAt: string) { await queryDb('UPDATE app_billing_external_events SET processed=true,processing_result_code=$3,updated_at=$4 WHERE provider_kind=$1 AND external_event_id=$2', [providerKind, externalEventId, processingResultCode, updatedAt]); }
  async listEventsForSubject(subjectKind: 'user', subjectId: string, limit?: number) { const rows = await queryDb<EventRow>('SELECT external_event_id,provider_kind,kind,external_customer_id,external_subscription_id,subject_kind,subject_id,occurred_at,payload_json::text AS payload_json,processed,processing_result_code,created_at,updated_at FROM app_billing_external_events WHERE subject_kind=$1 AND subject_id=$2 ORDER BY occurred_at DESC, external_event_id ASC LIMIT $3', [subjectKind, subjectId, cap(limit)]); return rows.map(mapEventRow); }
  async listUnprocessedEvents(limit?: number) { const rows = await queryDb<EventRow>('SELECT external_event_id,provider_kind,kind,external_customer_id,external_subscription_id,subject_kind,subject_id,occurred_at,payload_json::text AS payload_json,processed,processing_result_code,created_at,updated_at FROM app_billing_external_events WHERE processed=false ORDER BY occurred_at ASC, external_event_id ASC LIMIT $1', [cap(limit)]); return rows.map(mapEventRow); }
}
export class SQLProviderPlanMappingRepository implements ProviderPlanMappingRepository {
  async getPlanMapping(providerKind: BillingExternalProviderKind, externalPriceId: string) { const rows = await queryDb<MappingRow>('SELECT provider_kind,external_price_id,mapped_plan_kind,interval,updated_at FROM app_billing_provider_plan_mappings WHERE provider_kind=$1 AND external_price_id=$2', [providerKind, externalPriceId]); return rows[0] ? mapMappingRow(rows[0]) : null; }
  async upsertPlanMapping(r: PersistedProviderPlanMappingRecord) { await queryDb('INSERT INTO app_billing_provider_plan_mappings (provider_kind,external_price_id,mapped_plan_kind,interval,updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (provider_kind, external_price_id) DO UPDATE SET mapped_plan_kind=EXCLUDED.mapped_plan_kind,interval=EXCLUDED.interval,updated_at=EXCLUDED.updated_at', [r.providerKind, r.externalPriceId, r.mappedPlanKind, r.interval, r.updatedAt]); }
  async listPlanMappings(providerKind?: BillingExternalProviderKind) { const rows = providerKind ? await queryDb<MappingRow>('SELECT provider_kind,external_price_id,mapped_plan_kind,interval,updated_at FROM app_billing_provider_plan_mappings WHERE provider_kind=$1 ORDER BY provider_kind ASC, external_price_id ASC', [providerKind]) : await queryDb<MappingRow>('SELECT provider_kind,external_price_id,mapped_plan_kind,interval,updated_at FROM app_billing_provider_plan_mappings ORDER BY provider_kind ASC, external_price_id ASC'); return rows.map(mapMappingRow); }
}
