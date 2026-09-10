import { mkdir, readFile, writeFile } from 'node:fs/promises';

const dir='artifacts/sec-g';
const profiles=['smoke','ci','capacity-discovery'];
const scenarioNames=['account_read','dashboard_read','portfolio_read','portfolio_mutation','journal_read','journal_mutation','notification_inbox','notification_summary','analytics_read','watchlist_read'];
const configured={
 smoke:{durationSeconds:10,reads:{executor:'constant-vus',vus:1},mutations:{executor:'constant-arrival-rate',ratePerSecond:1,preAllocatedVUs:2,maxVUs:5}},
 ci:{durationSeconds:30,reads:{executor:'constant-vus',vus:5},mutations:{executor:'constant-arrival-rate',ratePerSecond:2,preAllocatedVUs:2,maxVUs:5}},
 'capacity-discovery':{durationSeconds:105,reads:{executor:'ramping-vus',stages:[{seconds:30,target:5},{seconds:30,target:20},{seconds:30,target:40},{seconds:15,target:0}]},mutations:{executor:'constant-arrival-rate',ratePerSecond:2,preAllocatedVUs:2,maxVUs:5}}
};
const mutationScenarios=new Set(['portfolio_mutation','journal_mutation']);
const percentile=(values,p)=>{if(values.length===0)return null;const ordered=[...values].sort((a,b)=>a-b);const rank=Math.min(ordered.length-1,Math.max(0,Math.ceil((p/100)*ordered.length)-1));return Number(ordered[rank].toFixed(3));};
const isoMs=(value)=>{const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:null;};

const profileEvidence={};
let totalAuthFailures=0;
let totalUnexpected=0;
let totalRequests=0;
for(const profile of profiles){
 const path=`${dir}/k6-${profile}-samples.json`;
 const text=await readFile(path,'utf8');
 const byScenario=new Map(scenarioNames.map(name=>[name,{durations:[],statuses:{},firstAt:null,lastAt:null}]));
 let authFailures=0;
 for(const line of text.split(/\r?\n/)){
  if(!line.trim())continue;
  let row;try{row=JSON.parse(line);}catch{continue;}
  if(row.type!=='Point'||!row.data)continue;
  const scenario=row.data.tags?.scenario_name;
  if(row.metric==='auth_failure')authFailures+=Number(row.data.value)||0;
  if(row.metric!=='http_req_duration'||!byScenario.has(scenario))continue;
  const bucket=byScenario.get(scenario),duration=Number(row.data.value),status=String(row.data.tags?.status??'0'),at=isoMs(row.data.time);
  if(Number.isFinite(duration))bucket.durations.push(duration);
  bucket.statuses[status]=(bucket.statuses[status]??0)+1;
  if(at!==null){bucket.firstAt=bucket.firstAt===null?at:Math.min(bucket.firstAt,at);bucket.lastAt=bucket.lastAt===null?at:Math.max(bucket.lastAt,at);}
 }
 const scenarios={};
 for(const name of scenarioNames){
  const bucket=byScenario.get(name),requests=Object.values(bucket.statuses).reduce((a,b)=>a+b,0),successfulBusinessOps=Object.entries(bucket.statuses).reduce((sum,[status,count])=>sum+(Number(status)>=200&&Number(status)<300?count:0),0),expectedBackpressure=Object.entries(bucket.statuses).reduce((sum,[status,count])=>sum+(profile==='capacity-discovery'&&(status==='429'||status==='503')?count:0),0),transportFailures=bucket.statuses['0']??0,unexpected4xx5xx=Object.entries(bucket.statuses).reduce((sum,[status,count])=>{const code=Number(status);if(code<400)return sum;return sum+((profile==='capacity-discovery'&&(code===429||code===503))?0:count);},0),spanMs=bucket.firstAt!==null&&bucket.lastAt!==null?Math.max(1,bucket.lastAt-bucket.firstAt):configured[profile].durationSeconds*1000;
  scenarios[name]={
   configuredConcurrency:mutationScenarios.has(name)?configured[profile].mutations:configured[profile].reads,
   requests,
   successfulBusinessOps,
   achievedRps:Number((requests/(spanMs/1000)).toFixed(3)),
   p50Ms:percentile(bucket.durations,50),
   p95Ms:percentile(bucket.durations,95),
   p99Ms:percentile(bucket.durations,99),
   statusDistribution:bucket.statuses,
   expectedBackpressure,
   unexpected4xx5xx,
   transportFailures
  };
  totalUnexpected+=unexpected4xx5xx+transportFailures;
  totalRequests+=requests;
 }
 totalAuthFailures+=authFailures;
 const sourceSummary=JSON.parse(await readFile(`${dir}/k6-${profile}-summary.json`,'utf8'));
 profileEvidence[profile]={configured:configured[profile],auth:{realCredentialUsers:5,authFailures},scenarios,thresholds:sourceSummary.metrics?Object.fromEntries(Object.entries(sourceSummary.metrics).filter(([,value])=>value?.thresholds).map(([name,value])=>[name,value.thresholds])):{}};
}
const acceptance={
 testedHeadSha:process.env.SEC_G_HEAD_SHA??null,
 profilesExecuted:profiles,
 realNextAuthCredentialUsers:5,
 authFailures:totalAuthFailures,
 requests:totalRequests,
 unexpectedResponses:totalUnexpected,
 accepted:totalAuthFailures===0&&totalUnexpected===0&&profiles.every(profile=>scenarioNames.every(name=>profileEvidence[profile].scenarios[name].successfulBusinessOps>0))
};
if(!acceptance.accepted)throw new Error(`sec_g_k6_acceptance_failed:${JSON.stringify(acceptance)}`);
await mkdir(dir,{recursive:true});
await writeFile(`${dir}/k6-summary.json`,JSON.stringify({acceptance,profiles:profileEvidence},null,2));
await writeFile(`${dir}/k6-samples.json`,JSON.stringify({testedHeadSha:acceptance.testedHeadSha,profiles:Object.fromEntries(profiles.map(profile=>[profile,{source:`k6-${profile}-samples.json`,scenarios:profileEvidence[profile].scenarios}]))},null,2));
console.log(JSON.stringify(acceptance));
