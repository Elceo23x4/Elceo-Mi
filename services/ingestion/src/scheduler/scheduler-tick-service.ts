import type { IngestionRunStatus } from '../runtime/execution-mode';
import { DEFAULT_INGESTION_RUNTIME_CONFIG, type IngestionRuntimeConfig } from '../runtime/execution-mode';
import type { CanonicalWorkerBoundaryService } from '../runtime/canonical-worker-boundary';
import type { IngestionPersistenceRepository } from '../persistence/contracts';
import type { IngestionRuntimeLeaseRepository } from './lease-repository';
import { getDefaultLeaseDurationMinutes } from './lease-repository';
import { buildDefaultSchedulePlan, getEnabledSchedulePlan, type IngestionSchedulePlanItem } from './schedule-plan';
import { planDueRuns } from './due-planner';
import { createScheduledIngestionRequest } from './trigger-context';

export type SchedulerDispatchReport = {
  requestKey: string;
  asset: string;
  timeframe: string;
  slotStartAt: string;
  dispatched: boolean;
  skippedReason: string | null;
  leaseAcquired: boolean;
  runStatus: IngestionRunStatus | null;
  runId: string | null;
};

export type SchedulerTickReport = {
  tickId: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  evaluatedPlanCount: number;
  dueRunCount: number;
  dispatchedCount: number;
  skippedLockedCount: number;
  skippedNotDueCount: number;
  successCount: number;
  partialSuccessCount: number;
  failedCount: number;
  dispatches: SchedulerDispatchReport[];
};

function resolveRuntimeConfig(config: Partial<IngestionRuntimeConfig> | undefined): IngestionRuntimeConfig {
  return {
    mode: config?.mode ?? DEFAULT_INGESTION_RUNTIME_CONFIG.mode,
    legacyFallbackOnCanonicalFailure: config?.legacyFallbackOnCanonicalFailure ?? DEFAULT_INGESTION_RUNTIME_CONFIG.legacyFallbackOnCanonicalFailure,
    strictCanonicalFailure: config?.strictCanonicalFailure ?? DEFAULT_INGESTION_RUNTIME_CONFIG.strictCanonicalFailure,
    boundaryVersion: config?.boundaryVersion ?? DEFAULT_INGESTION_RUNTIME_CONFIG.boundaryVersion
  };
}

function createTickId(nowIso: string): string {
  return `tick-${nowIso}-${Math.random().toString(36).slice(2, 10)}`;
}

export class IngestionSchedulerTickService {
  constructor(
    private readonly boundaryService: CanonicalWorkerBoundaryService,
    private readonly persistenceRepository: IngestionPersistenceRepository,
    private readonly leaseRepository: IngestionRuntimeLeaseRepository,
    private readonly schedulePlan: IngestionSchedulePlanItem[] = buildDefaultSchedulePlan()
  ) {}

  async runTick(params: { nowIso: string; runtimeConfig?: Partial<IngestionRuntimeConfig> }): Promise<SchedulerTickReport> {
    const startedAt = params.nowIso;
    const tickId = createTickId(startedAt);
    const runtimeConfig = resolveRuntimeConfig(params.runtimeConfig);
    const enabledPlan = getEnabledSchedulePlan(this.schedulePlan);

    await this.leaseRepository.cleanupExpiredLeases(startedAt);

    const due = await planDueRuns(startedAt, enabledPlan, this.persistenceRepository.runRepository, runtimeConfig.mode);

    const dispatches: SchedulerDispatchReport[] = [];
    let dispatchedCount = 0;
    let skippedLockedCount = 0;
    let successCount = 0;
    let partialSuccessCount = 0;
    let failedCount = 0;

    for (const duePlan of due) {
      const acquiredAt = startedAt;
      const expiresAtDate = new Date(acquiredAt);
      expiresAtDate.setUTCMinutes(expiresAtDate.getUTCMinutes() + getDefaultLeaseDurationMinutes(duePlan.frequency));

      const leaseAttempt = await this.leaseRepository.acquireLease({
        requestKey: duePlan.requestKey,
        asset: duePlan.asset,
        timeframe: duePlan.timeframe,
        mode: runtimeConfig.mode,
        triggerKind: 'scheduled',
        slotStartAt: duePlan.slotStartAt,
        slotEndAt: duePlan.slotEndAt,
        leaseHolder: tickId,
        acquiredAt,
        expiresAt: expiresAtDate.toISOString()
      });

      if (!leaseAttempt.acquired) {
        skippedLockedCount += 1;
        dispatches.push({
          requestKey: duePlan.requestKey,
          asset: duePlan.asset,
          timeframe: duePlan.timeframe,
          slotStartAt: duePlan.slotStartAt,
          dispatched: false,
          skippedReason: 'lease_locked',
          leaseAcquired: false,
          runStatus: null,
          runId: null
        });
        continue;
      }

      let runStatus: IngestionRunStatus | null = null;
      let runId: string | null = null;
      let skippedReason: string | null = null;

      try {
        const triggerContext = createScheduledIngestionRequest({
          asset: duePlan.asset,
          timeframe: duePlan.timeframe,
          requestedAt: acquiredAt,
          frequency: duePlan.frequency,
          slotStartAt: duePlan.slotStartAt,
          slotEndAt: duePlan.slotEndAt,
          mode: runtimeConfig.mode,
          schedulerTickId: tickId,
          notes: `lookback_hours:${duePlan.lookbackHours}`
        });

        const slotStart = new Date(duePlan.slotStartAt);
        const fromIso = new Date(slotStart.getTime() - duePlan.lookbackHours * 60 * 60 * 1000).toISOString();

        const result = await this.boundaryService.executeAssetWindow({
          asset: duePlan.asset,
          timeframe: duePlan.timeframe,
          asOf: duePlan.slotEndAt,
          fromIso,
          toIso: duePlan.slotEndAt,
          config: runtimeConfig,
          triggerContext
        });

        dispatchedCount += 1;
        runStatus = result.report.status;
        runId = result.report.runId;

        if (runStatus === 'success') successCount += 1;
        else if (runStatus === 'partial_success') partialSuccessCount += 1;
        else failedCount += 1;
      } catch (error) {
        dispatchedCount += 1;
        failedCount += 1;
        runStatus = 'failed';
        skippedReason = `dispatch_failure:${error instanceof Error ? error.message : 'unknown'}`;
      } finally {
        await this.leaseRepository.releaseLease(duePlan.requestKey, acquiredAt);
      }

      dispatches.push({
        requestKey: duePlan.requestKey,
        asset: duePlan.asset,
        timeframe: duePlan.timeframe,
        slotStartAt: duePlan.slotStartAt,
        dispatched: true,
        skippedReason,
        leaseAcquired: true,
        runStatus,
        runId
      });
    }

    const endedAt = new Date().toISOString();

    return {
      tickId,
      startedAt,
      endedAt,
      durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
      evaluatedPlanCount: enabledPlan.length,
      dueRunCount: due.length,
      dispatchedCount,
      skippedLockedCount,
      skippedNotDueCount: enabledPlan.length - due.length,
      successCount,
      partialSuccessCount,
      failedCount,
      dispatches
    };
  }
}
