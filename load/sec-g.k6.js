import http from 'k6/http';
import { check, fail } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';

const base=(__ENV.SEC_G_BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const profile=__ENV.SEC_G_PROFILE||'smoke';
const runtimeCredentials=JSON.parse(open('../.sec-g-runtime-credentials.json'));
const unexpected=new Rate('unexpected_response'),statuses=new Counter('status_distribution'),latency=new Trend('scenario_latency',true),authFailures=new Rate('auth_failure'),boundedBackpressure=new Counter('bounded_backpressure');
const routes={
 account_read:['GET','/api/account/state'],
 dashboard_read:['GET','/api/dashboard/BTC%2FUSD'],
 portfolio_read:['GET','/api/portfolio/positions'],
 portfolio_mutation:['POST','/api/portfolio/positions'],
 journal_read:['GET','/api/journal/cases'],
 journal_mutation:['POST','/api/journal/cases'],
 notification_inbox:['GET','/api/notifications/inbox'],
 notification_summary:['GET','/api/notifications/summary'],
 analytics_read:['GET','/api/analytics/latest'],
 watchlist_read:['GET','/api/portfolio/watchlist']
};
const mutationScenarios=new Set(['portfolio_mutation','journal_mutation']);
const duration=profile==='smoke'?'10s':'30s',vus=profile==='smoke'?1:5;
function scenario(name){
 if(mutationScenarios.has(name)){
  const rate=profile==='smoke'?1:2;
  return {executor:'constant-arrival-rate',exec:'workload',rate,timeUnit:'1s',duration,preAllocatedVUs:2,maxVUs:5,tags:{scenario_name:name}};
 }
 if(profile==='capacity-discovery')return {executor:'ramping-vus',exec:'workload',stages:[{duration:'30s',target:5},{duration:'30s',target:20},{duration:'30s',target:40},{duration:'15s',target:0}],tags:{scenario_name:name}};
 return {executor:'constant-vus',exec:'workload',vus,duration,tags:{scenario_name:name}};
}
export const options={scenarios:Object.fromEntries(Object.keys(routes).map((name)=>[name,scenario(name)])),thresholds:{checks:['rate==1'],unexpected_response:['rate==0'],auth_failure:['rate==0'],'scenario_latency{scenario_name:account_read}':['p(95)<1500','p(99)<3000'],'scenario_latency{scenario_name:dashboard_read}':['p(95)<2500','p(99)<5000'],'scenario_latency{scenario_name:portfolio_read}':['p(95)<1500','p(99)<3000'],'scenario_latency{scenario_name:journal_read}':['p(95)<1500','p(99)<3000']}};

function formEncode(values){return Object.entries(values).map(([key,value])=>`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');}
function cookieHeader(jar){const cookies=jar.cookiesForURL(base);return Object.entries(cookies).flatMap(([name,values])=>values.map(value=>`${name}=${value}`)).join('; ');}
function authenticate(user){
 const jar=http.cookieJar();jar.clear(base);
 const csrf=http.get(`${base}/api/auth/csrf`,{tags:{scenario_name:'auth_setup'}});const csrfBody=csrf.json();
 if(csrf.status!==200||!csrfBody||!csrfBody.csrfToken)fail(`sec_g_csrf_failed:${csrf.status}`);
 const login=http.post(`${base}/api/auth/callback/credentials`,formEncode({csrfToken:csrfBody.csrfToken,email:user.email,password:user.passphrase,callbackUrl:`${base}/api/auth/session`,redirect:'false'}),{headers:{'content-type':'application/x-www-form-urlencoded'},redirects:0,tags:{scenario_name:'auth_setup'}});
 const cookie=cookieHeader(jar);const session=http.get(`${base}/api/auth/session`,{headers:{cookie},tags:{scenario_name:'auth_setup'}});let sessionBody=null;try{sessionBody=session.json();}catch{}
 const authenticated=(login.status===200||login.status===302)&&session.status===200&&Boolean(sessionBody?.user?.id)&&Boolean(cookie);authFailures.add(!authenticated,{scenario_name:'auth_setup'});check(session,{'real NextAuth credential session established':()=>authenticated});if(!authenticated)fail(`sec_g_authentication_failed:login=${login.status}:session=${session.status}`);jar.clear(base);return {email:user.email,cookie,userId:sessionBody.user.id};
}
export function setup(){if(!Array.isArray(runtimeCredentials.users)||runtimeCredentials.users.length===0)fail('sec_g_runtime_credentials_missing');return {sessions:runtimeCredentials.users.map(authenticate)};}

function requestBody(name){
 if(name==='portfolio_mutation')return JSON.stringify({asset:'BTC/USD',timeframe:'H1',direction:'long',entryPrice:50000,size:1,thesisHealth:'stable',note:`SEC-G empirical ${__VU}-${__ITER}`});
 if(name==='journal_mutation')return JSON.stringify({asset:'BTC/USD',timeframe:'H1',title:`SEC-G empirical ${__VU}-${__ITER}`,direction:'long',setupType:'breakout',conviction:'standard',thesis:'SEC-G authenticated empirical workload'});
 return null;
}
function isBoundedCapacityBackpressure(status){return profile==='capacity-discovery'&&(status===429||status===503);}
export function workload(data){
 const name=exec.scenario.name,[method,path]=routes[name],session=data.sessions[(__VU-1)%data.sessions.length],body=requestBody(name);
 const headers={cookie:session.cookie,'content-type':'application/json','idempotency-key':`sec-g-${name}-${__VU}-${__ITER}`};
 if(mutationScenarios.has(name)){headers.origin=base;headers['sec-fetch-site']='same-origin';}
 const response=http.request(method,`${base}${path}`,body,{headers,tags:{scenario_name:name}});
 const businessSuccess=response.status>=200&&response.status<300,bounded=isBoundedCapacityBackpressure(response.status),accepted=businessSuccess||bounded;
 unexpected.add(!accepted,{scenario_name:name});if(bounded)boundedBackpressure.add(1,{scenario_name:name,status:String(response.status)});statuses.add(1,{scenario_name:name,status:String(response.status)});latency.add(response.timings.duration,{scenario_name:name});check(response,{'authenticated canonical response or bounded capacity backpressure':()=>accepted});
}
