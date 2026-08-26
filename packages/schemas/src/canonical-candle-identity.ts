import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';

type CandleSlotIdentityInput = { provider: string; asset: CanonicalAssetSymbol; timeframe: Timeframe; observedAt: string };
type CandleContentIdentityInput = CandleSlotIdentityInput & { open: number; high: number; low: number; close: number; volume: number | null };

// Synchronous SHA-256 keeps schema validation usable at every canonical boundary,
// including browser-safe consumers where node:crypto is unavailable.
function sha256(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < paddedLength; offset += 64) {
    const w = new Array<number>(64);
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) { const a=w[i-15]!,b=w[i-2]!; w[i]=(((rotr(a,7)^rotr(a,18)^(a>>>3))+w[i-16]!+(rotr(b,17)^rotr(b,19)^(b>>>10))+w[i-7]!)>>>0); }
    let [a,b,c,d,e,f,g,hh] = h;
    for (let i=0;i<64;i++){const s1=rotr(e!,6)^rotr(e!,11)^rotr(e!,25),ch=(e!&f!)^(~e!&g!),t1=(hh!+s1+ch+k[i]!+w[i]!)>>>0,s0=rotr(a!,2)^rotr(a!,13)^rotr(a!,22),maj=(a!&b!)^(a!&c!)^(b!&c!),t2=(s0+maj)>>>0;hh=g;g=f;f=e;e=(d!+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    for (const [i,v] of [a,b,c,d,e,f,g,hh].entries()) h[i]=(h[i]!+v!)>>>0;
  }
  return h.map((v) => v.toString(16).padStart(8, '0')).join('');
}

function canonicalSlot(input: CandleSlotIdentityInput): string {
  return JSON.stringify(['canonical_market_candle_v1', input.provider, input.asset, input.timeframe, new Date(input.observedAt).toISOString()]);
}

export function buildCanonicalCandleObservationId(input: CandleSlotIdentityInput): string {
  return `market_candle:${sha256(canonicalSlot(input))}`;
}

export function buildCanonicalCandleContentHash(input: CandleContentIdentityInput): string {
  return `sha256:${sha256(JSON.stringify([canonicalSlot(input), input.open, input.high, input.low, input.close, input.volume]))}`;
}
