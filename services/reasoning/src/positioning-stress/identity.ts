import { canonicalHash, canonicalJson, deepCloneFreeze } from '../expectation-reality/identity';
const SET_KEYS=new Set(['warnings','limitations','reasonCodes','sourceReferences','sourceEvidenceReferences','sourcePositioningEvidenceIds']);
export function canonicalizePositioning<T>(value:T,key=''):T{if(Array.isArray(value)){const a=value.map(v=>canonicalizePositioning(v));if(!SET_KEYS.has(key))return a as T;const s=a.sort((x,y)=>canonicalJson(x).localeCompare(canonicalJson(y)));return s.filter((v,i)=>!i||canonicalJson(v)!==canonicalJson(s[i-1])) as T;}if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonicalizePositioning(v,k)])) as T;return value;}
export const positioningHash=(v:unknown)=>canonicalHash(canonicalizePositioning(v));
export const positioningId=(prefix:string,v:unknown)=>`${prefix}_${positioningHash(v).slice(0,32)}`;
export const immutablePositioning=<T>(v:T):T=>deepCloneFreeze(canonicalizePositioning(v));
