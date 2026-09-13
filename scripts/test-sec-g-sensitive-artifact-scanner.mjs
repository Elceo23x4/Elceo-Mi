import assert from 'node:assert/strict';
import { assertSafe, sanitize } from './sanitize-sec-g-k6-artifacts.mjs';

const unsafe={metrics:{requests:12},setup_data:{cookie:'authjs.session-token=fake-secret',csrfToken:'fake-csrf',password:'fake-password'},headers:{authorization:'Bearer fake-token','x-elceo-internal-token':'fake-internal'}};
assert.throws(()=>assertSafe(JSON.stringify(unsafe),'synthetic-unsafe.json'),/sec_g_sensitive_auth_material/);
const safe=sanitize(unsafe);assert.deepEqual(safe.metrics,unsafe.metrics);assert.doesNotThrow(()=>assertSafe(JSON.stringify(safe),'synthetic-safe.json'));
assert.doesNotThrow(()=>assertSafe(JSON.stringify({endpoint:'/api/auth/csrf',passwordHash:'argon2id'}),'harmless-labels.json'));
console.log('SEC-G sensitive artifact scanner contract passed.');
