import type { RedisClientType } from 'redis';
import type { MarketCognitionSnapshot } from '@elceo/types';
import type { AdaptiveMaterializationMetrics,ScheduledProviderExecutor,TrustedAdaptiveExecutionContext } from './contracts';
import { RedisAdaptiveOwnershipStore } from './redis-store';
import { FencedMaterializationRepository,SqlImmutableMaterializationStore } from './repository';
import { CanonicalEvidenceMaterializationService } from './evidence';
import { CanonicalCognitionMaterializationService } from './service';
import { AdaptiveMaterializationScheduler } from './scheduler';
import { AdaptiveMaterializationOrchestrator,type CanonicalDashboardDerivative } from './orchestrator';
import { ProductionAggregateInputResolver,type ProductionEvidenceScope } from './production-aggregate';
import { PGS4_PRODUCTION_COGNITION_CONFIGURATION } from './production-cognition';
import { buildMarketCognitionSnapshot } from '../market-cognition/market-cognition-builder';
type SqlPool=ConstructorParameters<typeof SqlImmutableMaterializationStore>[0];
export function createProductionAdaptiveMaterializationRuntime(input:{redisClient:RedisClientType;sqlPool:SqlPool;providerGateExecutor:ScheduledProviderExecutor;trustedExecutionContext:TrustedAdaptiveExecutionContext;evidenceScopes:(asset:string,horizon:string)=>readonly ProductionEvidenceScope[];metrics:AdaptiveMaterializationMetrics;namespace?:string;materializeDashboardDerivative?:CanonicalDashboardDerivative<MarketCognitionSnapshot>}){const ownership=new RedisAdaptiveOwnershipStore(input.redisClient,input.namespace),immutable=new SqlImmutableMaterializationStore(input.sqlPool),repository=new FencedMaterializationRepository(ownership,immutable),aggregate=new ProductionAggregateInputResolver(repository,input.evidenceScopes),cognition=new CanonicalCognitionMaterializationService<MarketCognitionSnapshot>(repository,ownership,PGS4_PRODUCTION_COGNITION_CONFIGURATION,async cognitionInput=>{if(!cognitionInput.weightedSnapshot)throw new Error('resolved_canonical_reasoning_input_required');return buildMarketCognitionSnapshot(cognitionInput.weightedSnapshot,new Date(cognitionInput.evaluatedAt).toISOString())}),evidence=new CanonicalEvidenceMaterializationService(repository,'normalized-market-evidence-v1',input.metrics),scheduler=new AdaptiveMaterializationScheduler(ownership,input.providerGateExecutor,input.trustedExecutionContext,input.metrics),orchestrator=new AdaptiveMaterializationOrchestrator(scheduler,evidence,cognition,(asset,horizon,evaluatedAt)=>aggregate.resolve(asset,horizon,evaluatedAt),input.materializeDashboardDerivative);return{ownership,immutable,repository,aggregate,evidence,cognition,scheduler,orchestrator}}
