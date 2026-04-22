import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { IngestionExecutionMode } from '../runtime/execution-mode';
import type { IngestionRunRepository, PersistedIngestionRun } from '../persistence/contracts';
import { compareFrequencyGranularity, floorIsoToScheduleSlot, getSlotEnd } from './frequency';
import type { IngestionScheduleFrequency } from './frequency';
import type { IngestionSchedulePlanItem } from './schedule-plan';
import { buildScheduledRequestKey } from './request-key';

export type ScheduledRunPlan = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  frequency: IngestionScheduleFrequency;
  slotStartAt: string;
  slotEndAt: string;
  lookbackHours: number;
  priority: number;
  requestKey: string;
};

function matchesSatisfiedSlot(run: PersistedIngestionRun, slotStartAt: string): boolean {
  return (
    run.triggerKind === 'scheduled' &&
    run.slotStartAt === slotStartAt &&
    (run.status === 'success' || run.status === 'partial_success') &&
    (run.activeBoundary === 'canonical' || run.activeBoundary === 'legacy')
  );
}

async function hasSatisfiedRunForSlot(
  runRepository: IngestionRunRepository,
  asset: CanonicalAssetSymbol,
  timeframe: Timeframe,
  slotStartAt: string
): Promise<boolean> {
  const recent = await runRepository.listRecentRuns({ limit: 50, asset, timeframe, triggerKind: 'scheduled' });
  return recent.some((run) => matchesSatisfiedSlot(run, slotStartAt));
}

export async function planDueRuns(
  nowIso: string,
  schedulePlan: IngestionSchedulePlanItem[],
  runRepository: IngestionRunRepository,
  mode: IngestionExecutionMode
): Promise<ScheduledRunPlan[]> {
  const duePlans: ScheduledRunPlan[] = [];

  for (const planItem of schedulePlan) {
    if (!planItem.enabled) continue;

    const slotStartAt = floorIsoToScheduleSlot(nowIso, planItem.frequency);
    const slotEndAt = getSlotEnd(slotStartAt, planItem.frequency);

    const satisfied = await hasSatisfiedRunForSlot(runRepository, planItem.asset, planItem.timeframe, slotStartAt);
    if (satisfied) continue;

    duePlans.push({
      asset: planItem.asset,
      timeframe: planItem.timeframe,
      frequency: planItem.frequency,
      slotStartAt,
      slotEndAt,
      lookbackHours: planItem.lookbackHours,
      priority: planItem.priority,
      requestKey: buildScheduledRequestKey(planItem.asset, planItem.timeframe, planItem.frequency, slotStartAt, mode)
    });
  }

  duePlans.sort((left, right) => {
    if (left.priority !== right.priority) return right.priority - left.priority;

    const granularityCompare = compareFrequencyGranularity(left.frequency, right.frequency);
    if (granularityCompare !== 0) return granularityCompare;

    const assetCompare = left.asset.localeCompare(right.asset);
    if (assetCompare !== 0) return assetCompare;

    return left.timeframe.localeCompare(right.timeframe);
  });

  return duePlans;
}
