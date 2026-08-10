import type { NarrativeComponentName } from './contracts';
export const NARRATIVE_DECAY_POLICY_VERSION = 'narrative-decay-v1' as const;
export const NARRATIVE_COMPONENT_WEIGHTS:Readonly<Record<NarrativeComponentName,number>>={primary_reaction_persistence:30,follow_through_continuity:20,related_market_persistence:15,revision_impact:10,cognition_persistence:10,analog_decay_context:10,provenance_quality:5};
export const MATERIAL_MOVE_VOL_UNITS=0.35;
export const ACTIVE_QUALIFIED_SCORE=45;
export const LOW_PERSISTENCE_SCORE=30;
export const HALF_LIFE_RATIO=0.5;
export const round=(n:number,d=4)=>Number(n.toFixed(d));
export const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
