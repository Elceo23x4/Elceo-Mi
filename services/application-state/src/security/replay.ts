import type { SecurityActorKind, SecurityIdempotencyReplayResult, SecurityIdempotencyResponseRecord } from '@elceo/types';
import { SecurityQueryService } from './query-service';

export const getIdempotencyReplayResult = (queryService: SecurityQueryService, idempotencyKey: string, requestHash: string, asOfIso?: string): Promise<SecurityIdempotencyReplayResult> =>
  queryService.getIdempotencyReplayResult(idempotencyKey, requestHash, asOfIso);

export const listIdempotencyResponsesForActor = (queryService: SecurityQueryService, actorKind: SecurityActorKind, actorId: string, limit?: number): Promise<SecurityIdempotencyResponseRecord[]> =>
  queryService.listIdempotencyResponsesForActor(actorKind, actorId, limit);
