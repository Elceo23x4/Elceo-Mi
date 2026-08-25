import type { RedisClientType } from 'redis';
import type { CanonicalArtifactRead } from './contracts';
import { buildCognitionMarketCoordinationHash,buildMaterializationScopeHash } from './identity';
import { RedisAdaptiveOwnershipStore } from './redis-store';
import { FencedMaterializationRepository,ReadOptimizedImmutableMaterializationStore,SqlImmutableMaterializationStore,createImmutableReadMetrics } from './repository';

type SqlPool=ConstructorParameters<typeof SqlImmutableMaterializationStore>[0];
export type CanonicalCognitionReader={read<T>(asset:string,horizon:string):Promise<CanonicalArtifactRead<T>>;readonly metrics:ReturnType<typeof createImmutableReadMetrics>};
/** Read-only composition: deliberately has no scheduler, provider or compute dependency. */
export function createProductionCanonicalCognitionReader(input:{redisClient:RedisClientType;sqlPool:SqlPool;cacheLimits:{maxEntries:number;maxSerializedBytes:number};namespace?:string}):CanonicalCognitionReader{const metrics=createImmutableReadMetrics(),ownership=new RedisAdaptiveOwnershipStore(input.redisClient,input.namespace),hot=new ReadOptimizedImmutableMaterializationStore(new SqlImmutableMaterializationStore(input.sqlPool),input.cacheLimits,metrics),repository=new FencedMaterializationRepository(ownership,hot);return{metrics,read:<T>(asset:string,horizon:string)=>repository.readCurrent<T>(buildCognitionMarketCoordinationHash({asset,horizon,cognitionContractVersion:'market-cognition-snapshot-v1'}),buildMaterializationScopeHash({asset,horizon,kind:'cognition'}))}}
