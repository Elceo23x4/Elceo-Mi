export const serializeMetadata=(value:Record<string,unknown>):string=>JSON.stringify(value);
export const deserializeMetadata=(json:string):Record<string,unknown>=>{const p=JSON.parse(json); if(!p||typeof p!=='object'||Array.isArray(p)) throw new Error('invalid metadata json'); return p as Record<string,unknown>;};
