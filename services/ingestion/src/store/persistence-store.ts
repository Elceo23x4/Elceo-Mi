import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { DashboardCognitionViewModel, ProviderHealthRecord, AssetCognitionState, EvidenceAssembly } from '@elceo/types';
import type { InternalNormalizedEvent } from '@elceo/schemas';

export type PersistedState = {
  normalizedEvents: InternalNormalizedEvent[];
  sourceHealthSnapshots: ProviderHealthRecord[];
  cognitionByAsset: Record<string, AssetCognitionState>;
  chartViewModelByAsset: Record<string, DashboardCognitionViewModel>;
  evidenceByAsset: Record<string, EvidenceAssembly>;
  updatedAtUtc?: string;
};

export interface PersistenceStore {
  readState(): Promise<PersistedState>;
  appendNormalizedEvents(events: InternalNormalizedEvent[]): Promise<void>;
  writeSourceHealthSnapshot(rows: ProviderHealthRecord[]): Promise<void>;
  writeEvidence(assetCode: string, evidence: EvidenceAssembly): Promise<void>;
  writeCognition(assetCode: string, cognition: AssetCognitionState): Promise<void>;
  writeChartViewModel(assetCode: string, viewModel: DashboardCognitionViewModel): Promise<void>;
}

const baseState = (): PersistedState => ({
  normalizedEvents: [],
  sourceHealthSnapshots: [],
  cognitionByAsset: {},
  chartViewModelByAsset: {},
  evidenceByAsset: {}
});

export class InMemoryPersistenceStore implements PersistenceStore {
  private state: PersistedState = baseState();

  async readState(): Promise<PersistedState> {
    return this.state;
  }

  async appendNormalizedEvents(events: InternalNormalizedEvent[]): Promise<void> {
    this.state.normalizedEvents.push(...events);
    this.state.updatedAtUtc = new Date().toISOString();
  }

  async writeSourceHealthSnapshot(rows: ProviderHealthRecord[]): Promise<void> {
    this.state.sourceHealthSnapshots = rows;
    this.state.updatedAtUtc = new Date().toISOString();
  }

  async writeEvidence(assetCode: string, evidence: EvidenceAssembly): Promise<void> {
    this.state.evidenceByAsset[assetCode] = evidence;
    this.state.updatedAtUtc = new Date().toISOString();
  }

  async writeCognition(assetCode: string, cognition: AssetCognitionState): Promise<void> {
    this.state.cognitionByAsset[assetCode] = cognition;
    this.state.updatedAtUtc = new Date().toISOString();
  }

  async writeChartViewModel(assetCode: string, viewModel: DashboardCognitionViewModel): Promise<void> {
    this.state.chartViewModelByAsset[assetCode] = viewModel;
    this.state.updatedAtUtc = new Date().toISOString();
  }
}

export class FileSystemPersistenceStore implements PersistenceStore {
  constructor(private readonly filePath: string) {}

  private async readDiskState(): Promise<PersistedState> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as PersistedState;
      return { ...baseState(), ...parsed };
    } catch {
      return baseState();
    }
  }

  private async writeDiskState(next: PersistedState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(next, null, 2), 'utf8');
  }

  async readState(): Promise<PersistedState> {
    return this.readDiskState();
  }

  async appendNormalizedEvents(events: InternalNormalizedEvent[]): Promise<void> {
    const current = await this.readDiskState();
    current.normalizedEvents.push(...events);
    current.updatedAtUtc = new Date().toISOString();
    await this.writeDiskState(current);
  }

  async writeSourceHealthSnapshot(rows: ProviderHealthRecord[]): Promise<void> {
    const current = await this.readDiskState();
    current.sourceHealthSnapshots = rows;
    current.updatedAtUtc = new Date().toISOString();
    await this.writeDiskState(current);
  }

  async writeEvidence(assetCode: string, evidence: EvidenceAssembly): Promise<void> {
    const current = await this.readDiskState();
    current.evidenceByAsset[assetCode] = evidence;
    current.updatedAtUtc = new Date().toISOString();
    await this.writeDiskState(current);
  }

  async writeCognition(assetCode: string, cognition: AssetCognitionState): Promise<void> {
    const current = await this.readDiskState();
    current.cognitionByAsset[assetCode] = cognition;
    current.updatedAtUtc = new Date().toISOString();
    await this.writeDiskState(current);
  }

  async writeChartViewModel(assetCode: string, viewModel: DashboardCognitionViewModel): Promise<void> {
    const current = await this.readDiskState();
    current.chartViewModelByAsset[assetCode] = viewModel;
    current.updatedAtUtc = new Date().toISOString();
    await this.writeDiskState(current);
  }
}

let persistenceStore: PersistenceStore | null = null;

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

export function createPersistenceStore(env: Record<string, string | undefined> = runtimeEnv()): PersistenceStore {
  const mode = env.PERSISTENCE_MODE ?? 'filesystem';
  if (mode === 'memory') return new InMemoryPersistenceStore();

  const filePath = env.PERSISTENCE_FILE_PATH ?? '.elceo/persistence/ingestion-state.json';
  return new FileSystemPersistenceStore(filePath);
}

export function getPersistenceStore(): PersistenceStore {
  if (!persistenceStore) {
    persistenceStore = createPersistenceStore();
  }
  return persistenceStore;
}

export function setPersistenceStore(store: PersistenceStore): void {
  persistenceStore = store;
}

export async function appendNormalizedEvents(events: InternalNormalizedEvent[]): Promise<void> {
  await getPersistenceStore().appendNormalizedEvents(events);
}

export async function persistSourceHealthSnapshot(rows: ProviderHealthRecord[]): Promise<void> {
  await getPersistenceStore().writeSourceHealthSnapshot(rows);
}

export async function persistCognition(assetCode: string, cognition: AssetCognitionState): Promise<void> {
  await getPersistenceStore().writeCognition(assetCode, cognition);
}

export async function persistChartViewModel(assetCode: string, viewModel: DashboardCognitionViewModel): Promise<void> {
  await getPersistenceStore().writeChartViewModel(assetCode, viewModel);
}

export async function persistEvidence(assetCode: string, evidence: EvidenceAssembly): Promise<void> {
  await getPersistenceStore().writeEvidence(assetCode, evidence);
}

export async function readPersistedState(): Promise<PersistedState> {
  return getPersistenceStore().readState();
}
