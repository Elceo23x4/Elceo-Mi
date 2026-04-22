export type AdapterFailureDiagnostic = {
  adapterName: string;
  stage: 'fetch';
  message: string;
  occurredAt: string;
};

export type InvalidEventDiagnostic = {
  adapterName: string;
  stage: 'validate';
  eventId: string | null;
  message: string;
  fieldPath: string | null;
  occurredAt: string;
};

export type MergeDiagnostic = {
  dedupeKey: string;
  mergedEventIds: string[];
  primaryEventId: string;
  confirmationCount: number;
};

export type DroppedEventDiagnostic = {
  reason: 'invalid' | 'duplicate_secondary' | 'adapter_failure' | 'bridge_failure';
  eventId: string | null;
  adapterName: string | null;
  message: string;
};

export type CompositeIngestionDiagnostics = {
  adapterFailures: AdapterFailureDiagnostic[];
  invalidEvents: InvalidEventDiagnostic[];
  merges: MergeDiagnostic[];
  droppedEvents: DroppedEventDiagnostic[];
  totalFetched: number;
  totalValidated: number;
  totalMergedGroups: number;
  totalOutput: number;
};
