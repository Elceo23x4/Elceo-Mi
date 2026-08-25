import type { RedisClientType } from 'redis';
import type { CanonicalArtifactRead } from './contracts';
import { buildCognitionMarketCoordinationHash,buildMaterializationScopeHash } from './identity';
import { MARKET_COGNITION_CONTRACT_VERSION } from './production-cognition';
import { RedisAdaptiveOwnershipStore } from './redis-store';
import { FencedMaterializationRepository,ReadOptimizedImmutableMaterializationStore,SqlImmutableMaterializationStore,createImmutableReadMetrics } from './repository';

type SqlPool=ConstructorParameters<typeof SqlImmutableMaterializationStore>[0];
export type CanonicalReadMetrics=ReturnType<typeof createImmutableReadMetrics>&{logicalConsumerReads:number;currentPointerReads:number;availableReads:number;staleReads:number;unavailableReads:number};
export type CanonicalCognitionReader={read<T>(asset:string,horizon:string):Promise<CanonicalArtifactRead<T>>;readonly metrics:CanonicalReadMetrics};
/** Read-only composition: deliberately has no scheduler, provider or compute dependency. Clients remain caller-owned. */
export function createProductionCanonicalCognitionReader(input:{redisClient:RedisClientType;sqlPool:SqlPool;cacheLimits:{maxEntries:number;maxSerializedBytes:number};namespace?:string}):CanonicalCognitionReader{const metrics=Object.assign(createImmutableReadMetrics(),{logicalConsumerReads:0,currentPointerReads:0,availableReads:0,staleReads:0,unavailableReads:0}),ownership=new RedisAdaptiveOwnershipStore(input.redisClient,input.namespace),hot=new ReadOptimizedImmutableMaterializationStore(new SqlImmutableMaterializationStore(input.sqlPool),input.cacheLimits,metrics),repository=new FencedMaterializationRepository(ownership,hot);return{metrics,async read<T>(asset:string,horizon:string){metrics.logicalConsumerReads++;metrics.currentPointerReads++;const result=await repository.readCurrent<T>(buildCognitionMarketCoordinationHash({asset,horizon,cognitionContractVersion:MARKET_COGNITION_CONTRACT_VERSION}),buildMaterializationScopeHash({asset,horizon,kind:'cognition'}));if(result.state==='available')metrics.availableReads++;else if(result.state==='stale')metrics.staleReads++;else metrics.unavailableReads++;return result}}}
