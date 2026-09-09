import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const middleware=await readFile('apps/web/middleware.ts','utf8');
const config=await readFile('apps/web/next.config.mjs','utf8');
const migration=`${await readFile('infra/db/schema/0058_sec_f_tenant_rls.sql','utf8')}\n${await readFile('infra/db/schema/0059_sec_f_tenant_context_contract.sql','utf8')}`;
assert(!config.includes("script-src 'self' 'unsafe-inline'"));
for(const directive of ["object-src 'none'","base-uri 'self'","frame-ancestors 'none'","form-action 'self'","script-src 'self' 'nonce-","style-src-attr 'unsafe-inline'","https://cdn.onesignal.com","https://api.onesignal.com"])assert(middleware.includes(directive),directive);
assert(!middleware.match(/script-src[^;]*unsafe-inline/));
assert(!middleware.match(/productionCsp[^]*?script-src[^;]*unsafe-eval/));
assert(migration.includes('ENABLE ROW LEVEL SECURITY'));
async function routes(root){const out=[];for(const entry of await readdir(root,{withFileTypes:true})){const path=`${root}/${entry.name}`;if(entry.isDirectory())out.push(...await routes(path));else if(entry.name==='route.ts')out.push(path)}return out}
for(const file of await routes('apps/web/app/api')){
  if(!/\/api\/(portfolio|journal|notifications)\//.test(file))continue;
  const source=await readFile(file,'utf8');
  if(!/requireAuthenticatedSubject|requireFeatureAccess/.test(source))continue;
  assert(!source.includes('getApplicationStateRuntime()'),`${file} bypasses tenant application composition`);
  assert(!source.includes('getNotificationRuntimes()'),`${file} bypasses tenant notification composition`);
}
const appDb=await readFile('services/application-state/src/db/client.ts','utf8');
const notificationDb=await readFile('services/notifications/src/persistence/sql-notification-repository.ts','utf8');
const summaryRoute=await readFile('apps/web/app/api/notifications/summary/route.ts','utf8');
const healthRoute=await readFile('apps/web/app/api/notifications/health/route.ts','utf8');
const composition=await readFile('apps/web/lib/server/composition/runtime.ts','utf8');
assert(summaryRoute.includes('getNotificationFeedbackSummaryForSubject(subject.subjectKind, subject.subjectId)'), 'summary must use verified subject scope');
assert(healthRoute.includes('listTargetsWithDegradedHealthForSubject(subject.subjectKind, subject.subjectId'), 'health targets must use verified subject scope');
assert(healthRoute.includes('listRecentCriticalReceiptsForSubject(subject.subjectKind, subject.subjectId'), 'health receipts must use verified subject scope');
const tenantFeedbackType=composition.slice(composition.indexOf('type TenantNotificationFeedback'), composition.indexOf('function transactionalProxy'));
for(const unsafe of ['processProviderEvent','getProviderEventReplayById','getDeliveryReceiptReplayById','listReceiptReplayForTarget','listProviderEventReplayForTarget'])assert(!tenantFeedbackType.includes(unsafe), `tenant composition exposes system feedback method ${unsafe}`);
for(const source of [appDb,notificationDb])for(const proof of ['TENANT_DATABASE_URL','rolsuper','rolbypassrls','owns_protected',"set_config('elceo.tenant_subject_id'"])assert(source.includes(proof),proof);
console.log('SEC-F static CSP, route boundary, and RLS contract checks passed');
