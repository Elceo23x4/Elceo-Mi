import {canonicalHash,canonicalJson,deepCloneFreeze} from '../expectation-reality/identity';
export {canonicalHash,canonicalJson};
export function immutable<T extends object>(prefix:string,body:T):Readonly<T&{canonicalPayloadHash:string}>{const canonicalPayloadHash=canonicalHash(body);return deepCloneFreeze({...body,canonicalPayloadHash,...(!('datasetId' in body)&&!('configurationVersionId' in body)&&!('trialId' in body)?{}:{})});}
export const partitionHash=(ids:readonly string[])=>canonicalHash([...new Set(ids)].sort());
