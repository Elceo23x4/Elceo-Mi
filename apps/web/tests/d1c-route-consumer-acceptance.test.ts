import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { DashboardChartWorkspaceViewModel } from '@elceo/types';
import { createDashboardGetHandler } from '../lib/dashboard-route-handler';
import type { withDashboardReadAdmission } from '../lib/inbound-read-admission';

const request=new Request('https://elceo.test/api/dashboard/forbidden');
const workspace={dashboard:{},chart:{}} as DashboardChartWorkspaceViewModel;

export async function runD1cRouteConsumerAcceptance(){
  const routeSource=await readFile('app/api/dashboard/[asset]/route.ts','utf8');
  assert.match(routeSource,/readCanonicalDashboardWorkspace/);
  assert.doesNotMatch(routeSource,/getDashboardData|@elceo\/ingestion/);
  let reads=0,postgresReads=0,admissionCalls:string[]=[];
  const auth=async()=>({session:{user:{id:'subject-a'}},appState:{watchlist:{assets:['XAU/USD','BTC/USD']}}});
  let admitted=0;const limit=2;
  const admission=(async(subject:string,work:(signal:AbortSignal)=>Promise<DashboardChartWorkspaceViewModel|null>)=>{admissionCalls.push(subject);if(admitted++>=limit)return{ok:false as const,status:429 as const,reason:'rate_limited'};return{ok:true as const,value:await work(new AbortController().signal)}}) as typeof withDashboardReadAdmission;
  const handler=createDashboardGetHandler({authenticate:auth,admit:admission,readDashboard:async asset=>{reads++;postgresReads++;assert.equal(asset,'XAU/USD','watchlist fallback remains authoritative');return workspace}});
  assert.equal((await handler(request,{params:Promise.resolve({asset:'not-allowed'})})).status,200);
  assert.equal((await handler(request,{params:Promise.resolve({asset:'not-allowed'})})).status,200);
  const beforeRejected={reads,postgresReads};const rejected=await handler(request,{params:Promise.resolve({asset:'not-allowed'})});
  assert.equal(rejected.status,429);assert.deepEqual({reads,postgresReads},beforeRejected,'N+1 rejection occurs before passive reader/PostgreSQL');
  assert.deepEqual(admissionCalls,['subject-a','subject-a','subject-a'],'admission remains subject scoped');
  const deny=(error:string)=>createDashboardGetHandler({authenticate:async()=>{throw new Error(error)},admit:admission,readDashboard:async()=>{throw new Error('must_not_read')}});
  assert.equal((await deny('UNAUTHORIZED')(request,{params:Promise.resolve({asset:'XAU%2FUSD'})})).status,401);
  assert.equal((await deny('ONBOARDING_REQUIRED')(request,{params:Promise.resolve({asset:'XAU%2FUSD'})})).status,403);
  console.log('D1-C route consumer acceptance passed: N=2 N+1=429 reader_delta=0 postgres_delta=0 auth=401 onboarding=403 watchlist=preserved');
}
