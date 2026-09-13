import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const sensitiveKey=/^(cookie|set-cookie|authorization|password|passphrase|session|sessionToken|csrfToken|internalToken|x-elceo-internal-token)$/i;
const sensitiveValue=/(?:authjs|next-auth)\.(?:session-token|csrf-token)\s*=|\bBearer\s+[A-Za-z0-9._~-]+|sec-g-ci-only-internal-token/i;
const serializedSensitiveKey=/["'](?:cookie|set-cookie|authorization|password|passphrase|sessionToken|csrfToken|internalToken|x-elceo-internal-token)["']\s*:\s*["'](?!\[REDACTED\])/i;
export const sanitize=(value,key='')=>{
 if(sensitiveKey.test(key))return '[REDACTED]';
 if(typeof value==='string')return sensitiveValue.test(value)?'[REDACTED]':value;
 if(Array.isArray(value))return value.map(item=>sanitize(item));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([childKey,child])=>[childKey,sanitize(child,childKey)]));
 return value;
};
export const assertSafe=(text,path='artifact')=>assert(!sensitiveValue.test(text)&&!serializedSensitiveKey.test(text),`sec_g_sensitive_auth_material:${path}`);

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){for(const path of process.argv.slice(2)){const parsed=JSON.parse(await readFile(path,'utf8')),safe=JSON.stringify(sanitize(parsed),null,2);assertSafe(safe,path);await writeFile(path,`${safe}\n`);console.log(`sanitized:${path}`);}}
