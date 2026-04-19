declare module 'node:crypto' {
  export function createHmac(algorithm: string, key: string): { update(value: string): { digest(encoding: 'hex' | 'base64'): string } };
  export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}

declare const Buffer: {
  from(input: string, encoding?: string): Uint8Array & { length: number; toString(encoding?: string): string };
};
