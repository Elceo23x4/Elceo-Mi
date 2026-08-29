import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function runBackendAuthorityClosureAcceptance(){
 const dashboard=readFileSync(resolve(process.cwd(),'app/(app)/dashboard/page.tsx'),'utf8');
 assert.match(dashboard,/readCanonicalDashboardWorkspace/);
 assert.doesNotMatch(dashboard,/getDashboardData|readPersistedState|chartViewModelByAsset|@elceo\/ingestion|provider execution|compute/i);
 const api=readFileSync(resolve(process.cwd(),'app/api/billing/checkout/route.ts'),'utf8');
 const portal=readFileSync(resolve(process.cwd(),'app/api/billing/portal/route.ts'),'utf8');
 assert.doesNotMatch(api,/x-elceo-commercial-snapshot|targetPlan !== 'premium'/);
 assert.doesNotMatch(portal,/@elceo\/billing|BillingService|BILLING_PROVIDER/);
 assert.match(readFileSync(resolve(process.cwd(),'../..','services/application-state/src/payment-providers/sandbox-adapter.ts'),'utf8'),/mode','subscription/);
}
