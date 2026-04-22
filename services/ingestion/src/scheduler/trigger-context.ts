import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { IngestionExecutionMode } from '../runtime/execution-mode';
import { buildManualRequestKey, buildReplayRequestKey, buildScheduledRequestKey } from './request-key';

export type IngestionTriggerKind = 'scheduled' | 'manual' | 'replay' | 'backfill' | 'shadow_compare';

export type IngestionTriggerContext = {
  triggerKind: IngestionTriggerKind;
  requestedAt: string;
  requestKey: string;
  slotStartAt: string | null;
  slotEndAt: string | null;
  schedulerTickId: string | null;
  requestedBy: string | null;
  notes: string | null;
};

export function assertValidTriggerContext(context: IngestionTriggerContext): void {
  if (context.triggerKind === 'scheduled' && (!context.slotStartAt || !context.slotEndAt)) {
    throw new Error('scheduled trigger requires slotStartAt and slotEndAt');
  }

  if (context.slotStartAt && Number.isNaN(Date.parse(context.slotStartAt))) {
    throw new Error('slotStartAt must be a valid ISO timestamp');
  }

  if (context.slotEndAt && Number.isNaN(Date.parse(context.slotEndAt))) {
    throw new Error('slotEndAt must be a valid ISO timestamp');
  }

  if (Number.isNaN(Date.parse(context.requestedAt))) {
    throw new Error('requestedAt must be a valid ISO timestamp');
  }
}

export function createManualIngestionRequest(params: {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  requestedAt: string;
  requestedBy?: string | null;
  notes?: string | null;
}): IngestionTriggerContext {
  return {
    triggerKind: 'manual',
    requestedAt: params.requestedAt,
    requestKey: buildManualRequestKey(params.asset, params.timeframe, params.requestedAt),
    slotStartAt: null,
    slotEndAt: null,
    schedulerTickId: null,
    requestedBy: params.requestedBy ?? null,
    notes: params.notes ?? null
  };
}

export function createReplayIngestionRequest(params: {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  requestedAt: string;
  replayReference: string;
  requestedBy?: string | null;
  notes?: string | null;
}): IngestionTriggerContext {
  return {
    triggerKind: 'replay',
    requestedAt: params.requestedAt,
    requestKey: buildReplayRequestKey(params.asset, params.timeframe, params.replayReference),
    slotStartAt: null,
    slotEndAt: null,
    schedulerTickId: null,
    requestedBy: params.requestedBy ?? null,
    notes: params.notes ?? null
  };
}

export function createScheduledIngestionRequest(params: {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  requestedAt: string;
  frequency: string;
  slotStartAt: string;
  slotEndAt: string;
  mode: IngestionExecutionMode;
  schedulerTickId: string;
  notes?: string | null;
}): IngestionTriggerContext {
  return {
    triggerKind: 'scheduled',
    requestedAt: params.requestedAt,
    requestKey: buildScheduledRequestKey(params.asset, params.timeframe, params.frequency, params.slotStartAt, params.mode),
    slotStartAt: params.slotStartAt,
    slotEndAt: params.slotEndAt,
    schedulerTickId: params.schedulerTickId,
    requestedBy: 'scheduler',
    notes: params.notes ?? null
  };
}

export function createDefaultTriggerContext(params: {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  requestedAt: string;
}): IngestionTriggerContext {
  return createManualIngestionRequest({
    asset: params.asset,
    timeframe: params.timeframe,
    requestedAt: params.requestedAt,
    requestedBy: 'runtime_default',
    notes: 'default_trigger_context'
  });
}
