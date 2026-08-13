import type { DatasetManifest, SplitManifest } from './contracts';
import { canonicalHash, partitionHash } from './identity';

const time = (value: string | undefined, error: string) => {
  const parsed = Date.parse(value ?? '');
  if (!Number.isFinite(parsed)) throw new Error(error);
  return parsed;
};
export function finalizeSplit(
  draft: Omit<
    SplitManifest,
    | 'splitId'
    | 'calibrationPartitionHash'
    | 'embargoPartitionHash'
    | 'holdoutPartitionHash'
    | 'canonicalPayloadHash'
  >,
): SplitManifest {
  const calibrationEventIds = [...new Set(draft.calibrationEventIds)].sort();
  const embargoEventIds = [...new Set(draft.embargoEventIds)].sort();
  const holdoutEventIds = [...new Set(draft.holdoutEventIds)].sort();
  const all = [...calibrationEventIds, ...embargoEventIds, ...holdoutEventIds];
  if (new Set(all).size !== all.length) throw new Error('partition_overlap');
  if (!calibrationEventIds.length || !embargoEventIds.length || !holdoutEventIds.length)
    throw new Error('partition_missing');
  for (const id of all) {
    if (!draft.eventFamilies[id] || !draft.eventTimes[id] || !draft.outcomeWindowEnds[id])
      throw new Error('split_event_metadata_missing');
    time(draft.eventTimes[id], 'split_invalid_timestamp');
    time(draft.outcomeWindowEnds[id], 'split_invalid_timestamp');
  }
  const family = new Set(calibrationEventIds.map((id) => draft.eventFamilies[id]));
  if (holdoutEventIds.some((id) => family.has(draft.eventFamilies[id])))
    throw new Error('event_family_cross_split');
  const calibrationEnd = Math.max(
    ...calibrationEventIds.map((id) =>
      time(draft.outcomeWindowEnds[id], 'split_invalid_timestamp'),
    ),
  );
  const embargoStart = Math.min(
    ...embargoEventIds.map((id) => time(draft.eventTimes[id], 'split_invalid_timestamp')),
  );
  const embargoEnd = Math.max(
    ...embargoEventIds.map((id) => time(draft.outcomeWindowEnds[id], 'split_invalid_timestamp')),
  );
  const holdoutStart = Math.min(
    ...holdoutEventIds.map((id) => time(draft.eventTimes[id], 'split_invalid_timestamp')),
  );
  if (!(calibrationEnd < embargoStart && embargoStart <= embargoEnd && embargoEnd < holdoutStart))
    throw new Error('split_not_chronological');
  if (holdoutStart - calibrationEnd < draft.maximumOutcomeHorizonMs)
    throw new Error('embargo_or_outcome_window_violation');
  const body = {
    ...draft,
    calibrationEventIds,
    embargoEventIds,
    holdoutEventIds,
    calibrationPartitionHash: partitionHash(calibrationEventIds),
    embargoPartitionHash: partitionHash(embargoEventIds),
    holdoutPartitionHash: partitionHash(holdoutEventIds),
  };
  const hash = canonicalHash(body);
  return Object.freeze({
    ...body,
    splitId: `ifp8-split-${hash.slice(0, 32)}`,
    canonicalPayloadHash: hash,
  });
}
export function verifyManifestSplit(manifest: DatasetManifest, split: SplitManifest): void {
  if (
    split.datasetId !== manifest.datasetId ||
    split.calibrationPartitionHash !== manifest.calibrationPartitionHash ||
    split.embargoPartitionHash !== manifest.embargoPartitionHash ||
    split.holdoutPartitionHash !== manifest.holdoutPartitionHash
  )
    throw new Error('manifest_split_hash_mismatch');
}
