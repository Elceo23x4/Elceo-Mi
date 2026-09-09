import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';

const base=__ENV.SEC_G_BASE_URL||'http://127.0.0.1:3000',profile=__ENV.SEC_G_PROFILE||'smoke',cookie=__ENV.SEC_G_SESSION_COOKIE||'';
const unexpected=new Rate('unexpected_server_error'),statuses=new Counter('status_distribution'),latency=new Trend('scenario_latency',true);
const routes={
 account_read:['GET','/api/account/state'],dashboard_read:['GET','/api/dashboard/BTC%2FUSD'],portfolio_read:['GET','/api/portfolio/positions'],portfolio_mutation:['POST','/api/portfolio/positions'],journal_read:['GET','/api/journal/cases'],journal_mutation:['POST','/api/journal/cases'],notification_inbox:['GET','/api/notifications/inbox'],ops_read:['GET','/api/admin/ops'],provider_ingestion:['POST','/api/internal/market-evidence/tiingo/fixture-ingest'],mixed_user:['GET','/api/workspace/current']
};
const duration=profile==='smoke'?'10s':'30s',vus=profile==='smoke'?1:5;
const scenario=(name)=>profile==='capacity-discovery'?{executor:'ramping-vus',exec:'workload',stages:[{duration:'30s',target:5},{duration:'30s',target:20},{duration:'30s',target:40},{duration:'15s',target:0}],tags:{scenario_name:name}}:{executor:'constant-vus',exec:'workload',vus,duration,tags:{scenario_name:name}};
export const options={scenarios:Object.fromEntries(Object.keys(routes).map((name)=>[name,scenario(name)])),thresholds:{checks:['rate==1'],unexpected_server_error:['rate==0']}};
const bodies={portfolio_mutation:JSON.stringify({positionId:`sec-g-${__VU}-${__ITER}`,asset:'BTC/USD',side:'long',quantity:1,averageEntryPrice:50000,openedAt:'2026-01-01T00:00:00.000Z'}),journal_mutation:JSON.stringify({caseId:`sec-g-${__VU}-${__ITER}`,asset:'BTC/USD',timeframe:'H1',direction:'long',status:'planned'}),provider_ingestion:JSON.stringify({asset:'BTC/USD',timeframe:'H1',from:'2026-01-01T00:00:00.000Z',to:'2026-01-01T01:00:00.000Z'})};
export function workload(){const name=exec.scenario.name,[method,path]=routes[name],response=http.request(method,`${base}${path}`,bodies[name]||null,{headers:{cookie,'content-type':'application/json','idempotency-key':`sec-g-${name}-${__VU}-${__ITER}`},tags:{scenario_name:name}});const failed=response.status>=500;unexpected.add(failed);statuses.add(1,{scenario_name:name,status:String(response.status)});latency.add(response.timings.duration,{scenario_name:name});check(response,{'authenticated canonical response':(r)=>r.status>=200&&r.status<500});}
