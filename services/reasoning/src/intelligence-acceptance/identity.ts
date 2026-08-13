import { canonicalHash, canonicalJson } from '../expectation-reality/identity';
export { canonicalHash, canonicalJson };
export const partitionHash = (ids: readonly string[]) => canonicalHash([...new Set(ids)].sort());
