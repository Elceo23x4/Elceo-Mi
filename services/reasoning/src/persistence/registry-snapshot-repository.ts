import { validateMarketEvidenceRegistrySnapshot, validateSeoContentArchitectureSnapshot } from '@elceo/schemas';
import type { MarketEvidenceRegistrySnapshot, SeoContentArchitectureSnapshot } from '@elceo/types';

export type PersistedMarketEvidenceRegistrySnapshotRecord = {
  snapshotId: string;
  generatedAt: string;
  registryJson: string;
  evidenceTypeCount: number;
  sourceCount: number;
  assetInfluenceCount: number;
  createdAt: string;
};

export type PersistedSeoContentArchitectureSnapshotRecord = {
  snapshotId: string;
  generatedAt: string;
  architectureJson: string;
  keywordCount: number;
  pageCount: number;
  internalLinkRuleCount: number;
  createdAt: string;
};

export type MarketEvidenceRegistrySnapshotRepository = {
  saveSnapshot(record: PersistedMarketEvidenceRegistrySnapshotRecord): Promise<void>;
  getSnapshotById(snapshotId: string): Promise<PersistedMarketEvidenceRegistrySnapshotRecord | null>;
  getLatestSnapshot(): Promise<PersistedMarketEvidenceRegistrySnapshotRecord | null>;
  listRecentSnapshots(limit?: number): Promise<PersistedMarketEvidenceRegistrySnapshotRecord[]>;
};

export type SeoContentArchitectureSnapshotRepository = {
  saveSnapshot(record: PersistedSeoContentArchitectureSnapshotRecord): Promise<void>;
  getSnapshotById(snapshotId: string): Promise<PersistedSeoContentArchitectureSnapshotRecord | null>;
  getLatestSnapshot(): Promise<PersistedSeoContentArchitectureSnapshotRecord | null>;
  listRecentSnapshots(limit?: number): Promise<PersistedSeoContentArchitectureSnapshotRecord[]>;
};

type QueryRow = Record<string, unknown>;
type PoolLike = { query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryRow[] }> };
let poolPromise: Promise<PoolLike> | null = null;

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

async function getPool(): Promise<PoolLike> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const module = await import('pg');
      return new module.Pool({ connectionString: runtimeEnv().DATABASE_URL }) as unknown as PoolLike;
    })();
  }
  return poolPromise;
}
async function queryDb<T extends QueryRow = QueryRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = await getPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

const orderRecords = <T extends { generatedAt: string; snapshotId: string }>(rows: T[]): T[] =>
  rows.sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt) || a.snapshotId.localeCompare(b.snapshotId));

export class MemoryMarketEvidenceRegistrySnapshotRepository implements MarketEvidenceRegistrySnapshotRepository {
  private readonly rows = new Map<string, PersistedMarketEvidenceRegistrySnapshotRecord>();
  async saveSnapshot(record: PersistedMarketEvidenceRegistrySnapshotRecord): Promise<void> { this.rows.set(record.snapshotId, record); }
  async getSnapshotById(snapshotId: string): Promise<PersistedMarketEvidenceRegistrySnapshotRecord | null> { return this.rows.get(snapshotId) ?? null; }
  async getLatestSnapshot(): Promise<PersistedMarketEvidenceRegistrySnapshotRecord | null> { return (await this.listRecentSnapshots(1))[0] ?? null; }
  async listRecentSnapshots(limit = 25): Promise<PersistedMarketEvidenceRegistrySnapshotRecord[]> { return orderRecords([...this.rows.values()]).slice(0, limit); }
}

export class MemorySeoContentArchitectureSnapshotRepository implements SeoContentArchitectureSnapshotRepository {
  private readonly rows = new Map<string, PersistedSeoContentArchitectureSnapshotRecord>();
  async saveSnapshot(record: PersistedSeoContentArchitectureSnapshotRecord): Promise<void> { this.rows.set(record.snapshotId, record); }
  async getSnapshotById(snapshotId: string): Promise<PersistedSeoContentArchitectureSnapshotRecord | null> { return this.rows.get(snapshotId) ?? null; }
  async getLatestSnapshot(): Promise<PersistedSeoContentArchitectureSnapshotRecord | null> { return (await this.listRecentSnapshots(1))[0] ?? null; }
  async listRecentSnapshots(limit = 25): Promise<PersistedSeoContentArchitectureSnapshotRecord[]> { return orderRecords([...this.rows.values()]).slice(0, limit); }
}

type MarketEvidenceRow = { snapshot_id: string; generated_at: string; registry_json: string; evidence_type_count: number; source_count: number; asset_influence_count: number; created_at: string; };
type SeoRow = { snapshot_id: string; generated_at: string; architecture_json: string; keyword_count: number; page_count: number; internal_link_rule_count: number; created_at: string; };

const mapMarketEvidenceRow = (row: MarketEvidenceRow): PersistedMarketEvidenceRegistrySnapshotRecord => ({ snapshotId: row.snapshot_id, generatedAt: row.generated_at, registryJson: row.registry_json, evidenceTypeCount: row.evidence_type_count, sourceCount: row.source_count, assetInfluenceCount: row.asset_influence_count, createdAt: row.created_at });
const mapSeoRow = (row: SeoRow): PersistedSeoContentArchitectureSnapshotRecord => ({ snapshotId: row.snapshot_id, generatedAt: row.generated_at, architectureJson: row.architecture_json, keywordCount: row.keyword_count, pageCount: row.page_count, internalLinkRuleCount: row.internal_link_rule_count, createdAt: row.created_at });

export class SqlMarketEvidenceRegistrySnapshotRepository implements MarketEvidenceRegistrySnapshotRepository {
  async saveSnapshot(record: PersistedMarketEvidenceRegistrySnapshotRecord): Promise<void> { await queryDb(`INSERT INTO app_market_evidence_registry_snapshots (snapshot_id, generated_at, registry_json, evidence_type_count, source_count, asset_influence_count, created_at) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7) ON CONFLICT (snapshot_id) DO UPDATE SET generated_at=EXCLUDED.generated_at, registry_json=EXCLUDED.registry_json, evidence_type_count=EXCLUDED.evidence_type_count, source_count=EXCLUDED.source_count, asset_influence_count=EXCLUDED.asset_influence_count, created_at=EXCLUDED.created_at`, [record.snapshotId, record.generatedAt, record.registryJson, record.evidenceTypeCount, record.sourceCount, record.assetInfluenceCount, record.createdAt]); }
  async getSnapshotById(snapshotId: string): Promise<PersistedMarketEvidenceRegistrySnapshotRecord | null> { const rows = await queryDb<MarketEvidenceRow>(`SELECT snapshot_id, generated_at::text, registry_json::text as registry_json, evidence_type_count, source_count, asset_influence_count, created_at::text FROM app_market_evidence_registry_snapshots WHERE snapshot_id = $1`, [snapshotId]); return rows[0] ? mapMarketEvidenceRow(rows[0]) : null; }
  async getLatestSnapshot(): Promise<PersistedMarketEvidenceRegistrySnapshotRecord | null> { const rows = await queryDb<MarketEvidenceRow>(`SELECT snapshot_id, generated_at::text, registry_json::text as registry_json, evidence_type_count, source_count, asset_influence_count, created_at::text FROM app_market_evidence_registry_snapshots ORDER BY generated_at DESC, snapshot_id ASC LIMIT 1`); return rows[0] ? mapMarketEvidenceRow(rows[0]) : null; }
  async listRecentSnapshots(limit = 25): Promise<PersistedMarketEvidenceRegistrySnapshotRecord[]> { const rows = await queryDb<MarketEvidenceRow>(`SELECT snapshot_id, generated_at::text, registry_json::text as registry_json, evidence_type_count, source_count, asset_influence_count, created_at::text FROM app_market_evidence_registry_snapshots ORDER BY generated_at DESC, snapshot_id ASC LIMIT $1`, [limit]); return rows.map(mapMarketEvidenceRow); }
}

export class SqlSeoContentArchitectureSnapshotRepository implements SeoContentArchitectureSnapshotRepository {
  async saveSnapshot(record: PersistedSeoContentArchitectureSnapshotRecord): Promise<void> { await queryDb(`INSERT INTO app_seo_content_architecture_snapshots (snapshot_id, generated_at, architecture_json, keyword_count, page_count, internal_link_rule_count, created_at) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7) ON CONFLICT (snapshot_id) DO UPDATE SET generated_at=EXCLUDED.generated_at, architecture_json=EXCLUDED.architecture_json, keyword_count=EXCLUDED.keyword_count, page_count=EXCLUDED.page_count, internal_link_rule_count=EXCLUDED.internal_link_rule_count, created_at=EXCLUDED.created_at`, [record.snapshotId, record.generatedAt, record.architectureJson, record.keywordCount, record.pageCount, record.internalLinkRuleCount, record.createdAt]); }
  async getSnapshotById(snapshotId: string): Promise<PersistedSeoContentArchitectureSnapshotRecord | null> { const rows = await queryDb<SeoRow>(`SELECT snapshot_id, generated_at::text, architecture_json::text as architecture_json, keyword_count, page_count, internal_link_rule_count, created_at::text FROM app_seo_content_architecture_snapshots WHERE snapshot_id = $1`, [snapshotId]); return rows[0] ? mapSeoRow(rows[0]) : null; }
  async getLatestSnapshot(): Promise<PersistedSeoContentArchitectureSnapshotRecord | null> { const rows = await queryDb<SeoRow>(`SELECT snapshot_id, generated_at::text, architecture_json::text as architecture_json, keyword_count, page_count, internal_link_rule_count, created_at::text FROM app_seo_content_architecture_snapshots ORDER BY generated_at DESC, snapshot_id ASC LIMIT 1`); return rows[0] ? mapSeoRow(rows[0]) : null; }
  async listRecentSnapshots(limit = 25): Promise<PersistedSeoContentArchitectureSnapshotRecord[]> { const rows = await queryDb<SeoRow>(`SELECT snapshot_id, generated_at::text, architecture_json::text as architecture_json, keyword_count, page_count, internal_link_rule_count, created_at::text FROM app_seo_content_architecture_snapshots ORDER BY generated_at DESC, snapshot_id ASC LIMIT $1`, [limit]); return rows.map(mapSeoRow); }
}

export function assertValidMarketEvidenceSnapshot(snapshot: MarketEvidenceRegistrySnapshot): void { const result = validateMarketEvidenceRegistrySnapshot(snapshot); if (result.ok === false) throw new Error(`invalid_market_evidence_registry_snapshot:${result.errors.join(';')}`); }
export function assertValidSeoContentArchitectureSnapshot(snapshot: SeoContentArchitectureSnapshot): void { const result = validateSeoContentArchitectureSnapshot(snapshot); if (result.ok === false) throw new Error(`invalid_seo_content_architecture_snapshot:${result.errors.join(';')}`); }
