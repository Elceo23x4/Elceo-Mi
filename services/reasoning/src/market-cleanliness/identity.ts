import { canonicalHash, canonicalJson, deepCloneFreeze } from '../expectation-reality/identity';
const SET_KEYS=new Set(['sourceEvidenceIds','reasonCodes','warnings','limitations','hardConflictFlags','ambiguityFlags','sourceEvidenceReferences','sourceReferences']);
export function canonicalizeCleanliness<T>(value:T,key=''):T { if(Array.isArray(value)){ const items=value.map((item)=>canonicalizeCleanliness(item)); return (SET_KEYS.has(key)?items.sort((a,b)=>canonicalJson(a).localeCompare(canonicalJson(b))):items) as T; } if(value&&typeof value==='object'){ return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonicalizeCleanliness(v,k)])) as T; } return value; }
export const cleanlinessHash=(value:unknown)=>canonicalHash(canonicalizeCleanliness(value));
export const cleanlinessId=(prefix:string,value:unknown)=>`${prefix}_${cleanlinessHash(value).slice(0,32)}`;
export const immutableCleanliness=<T>(value:T):T=>deepCloneFreeze(canonicalizeCleanliness(value));
