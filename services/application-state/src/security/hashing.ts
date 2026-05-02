import { createHash } from 'crypto';
const hash = (s: string): string => createHash('sha256').update(s).digest('hex');
export const hashRequestBody = (body: string): string => hash(body);
export const hashResponseBody = (body: string): string => hash(body);
export const hashIpAddress = (ip: string): string => hash(ip);
export const hashUserAgent = (ua: string): string => hash(ua);
