import assert from 'node:assert/strict';
import { assertSafe, sanitize } from './sanitize-sec-g-k6-artifacts.mjs';

const fixture={metrics:{http_reqs:{count:10,p95:12}},setup_data:{sessions:[{email:'safe@example.test',cookie:'authjs.session-token=secret-value',password:'never-persist'}]},authorization:'Bearer secret',internalToken:'sec-g-ci-only-internal-token'};
const sanitized=sanitize(fixture),text=JSON.stringify(sanitized);
assert.deepEqual(sanitized.metrics,fixture.metrics);assert.equal(sanitized.setup_data.sessions[0].email,'safe@example.test');assert.equal(sanitized.setup_data.sessions[0].cookie,'[REDACTED]');assert.equal(sanitized.setup_data.sessions[0].password,'[REDACTED]');assert.equal(sanitized.authorization,'[REDACTED]');assert.equal(sanitized.internalToken,'[REDACTED]');assertSafe(text);
for(const secret of ['authjs.session-token=abc','next-auth.session-token=abc','Bearer abc.def','sec-g-ci-only-internal-token'])assert.throws(()=>assertSafe(secret),/sec_g_sensitive_auth_material/);
console.log('SEC-G k6 artifact sanitizer contract passed.');
