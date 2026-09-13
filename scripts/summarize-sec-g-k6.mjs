import { mkdir, readFile, writeFile } from 'node:fs/promises';

const dir='artifacts/sec-g';
const head=process.env.SEC_G_HEAD_SHA??process.env.GITHUB_SHA??null;
if(!head)throw new Error('SEC_G_HEAD_SHA_required');
const environment=process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test';
const profiles=['smoke','ci','capacity-discovery'];
const scenarioNames=['account_read','dashboard_read','portfolio_read','portfolio_mutation','journal_read','journal_mutation','notification_inbox','notification_summary','analytics_read','watchlist_read','admin_read','provider_ingestion'];
const configured={
 smoke:{durationSeconds:10,reads:{executor:'constant-vus',vus:1},mutations:{executor:'constant-arrival-rate',ratePerSecond:1,preAllocatedVUs:2,maxVUs:5}},
 ci:{durationSeconds:30,reads:{executor:'constant-vus',vus:5},mutations:{executor:'constant-arrival-rate',ratePerSecond:2,preAllocatedVUs:2,maxVUs:5}},
 'capacity-discovery':{durationSeconds:105,reads:{executor:'ramping-vus',stages:[{seconds:30,target:5},{seconds:30,target:20},{seconds:30,target:40},{seconds:15,target:0}]},mutations:{executor:'constant-arrival-rate',ratePerSecond:2,preAllocatedVUs:2,maxVUs:5}}
};
const mutationScenarios=new Set(['portfolio_mutation','journal_mutation']);
const percentile=(values,p)=>{if(values.length===0)return null;const ordered=[...values].sort((a,b)=>a-b);const rank=Math.min(ordered.length-1,Math.max(0,Math.ceil((p/100)*ordered.length)-1));return Number(ordered[rank].toFixed(3));};
const isoMs=(value)=>{const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:null;};

const profileEvidence={};
let totalAuthFailures=0,totalUnexpected=0,totalRequests=0,totalSuccessfulBusinessOps=0,totalBoundedBackpressure=0;
let globalFirstAt=null,globalLastAt=null;
for(const profile of profiles){
 const path=`${dir}/k6-${profile}-samples.json`;
 const text=await readFile(path,'utf8');
 const byScenario=new Map(scenarioNames.map(name=>[name,{durations:[],statuses:{},firstAt:null,lastAt:null}]));
 let authFailures=0,profileFirstAt=null,profileLastAt=null;
 for(const line of text.split(/\r?\n/)){
  if(!line.trim())continue;
  let row;try{row=JSON.parse(line);}catch{continue;}
  if(row.type!=='Point'||!row.data)continue;
  const scenario=row.data.tags?.scenario_name;
  const at=isoMs(row.data.time);
  if(at!==null){profileFirstAt=profileFirstAt===null?at:Math.min(profileFirstAt,at);profileLastAt=profileLastAt===null?at:Math.max(profileLastAt,at);globalFirstAt=globalFirstAt===null?at:Math.min(globalFirstAt,at);globalLastAt=globalLastAt===null?at:Math.max(globalLastAt,at);}
  if(row.metric==='auth_failure')authFailures+=Number(row.data.value)||0;
  if(row.metric!=='http_req_duration'||!byScenario.has(scenario))continue;
  const bucket=byScenario.get(scenario),duration=Number(row.data.value),status=String(row.data.tags?.status??'0');
  if(Number.isFinite(duration))bucket.durations.push(duration);
  bucket.statuses[status]=(bucket.statuses[status]??0)+1;
  if(at!==null){bucket.firstAt=bucket.firstAt===null?at:Math.min(bucket.firstAt,at);bucket.lastAt=bucket.lastAt===null?at:Math.max(bucket.lastAt,at);}
 }
 const scenarios={};
 for(const name of scenarioNames){
  const bucket=byScenario.get(name);
  const requests=Object.values(bucket.statuses).reduce((a,b)=>a+b,0);
  const successfulBusinessOps=Object.entries(bucket.statuses).reduce((sum,[status,count])=>sum+(Number(status)>=200&&Number(status)<300?count:0),0);
  const expectedBackpressure=Object.entries(bucket.statuses).reduce((sum,[status,count])=>sum+(profile==='capacity-discovery'&&(status==='429'||status==='503')?count:0),0);
  const transportFailures=bucket.statuses['0']??0;
  const unexpected4xx=Object.entries(bucket.statuses).reduce((sum,[status,count])=>{const code=Number(status);if(code<400||code>=500)return sum;return sum+((profile==='capacity-discovery'&&(code===429))?0:count);},0);
  const unexpected5xx=Object.entries(bucket.statuses).reduce((sum,[status,count])=>{const code=Number(status);if(code<500)return sum;return sum+((profile==='capacity-discovery'&&code===503)?0:count);},0);
  const spanMs=bucket.firstAt!==null&&bucket.lastAt!==null?Math.max(1,bucket.lastAt-bucket.firstAt):configured[profile].durationSeconds*1000;
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
   unexpected4xx,
   unexpected5xx,
   transportFailures
  };
  totalUnexpected+=unexpected4xx+unexpected5xx+transportFailures;
  totalRequests+=requests;
  totalSuccessfulBusinessOps+=successfulBusinessOps;
  totalBoundedBackpressure+=expectedBackpressure;
 }
 totalAuthFailures+=authFailures;
 const sourceSummary=JSON.parse(await readFile(`${dir}/k6-${profile}-summary.json`,'utf8'));
 profileEvidence[profile]={
  exactGitSha:head,
  environment,
  startedAt:profileFirstAt===null?null:new Date(profileFirstAt).toISOString(),
  endedAt:profileLastAt===null?null:new Date(profileLastAt).toISOString(),
  configured:configured[profile],
  auth:{realCredentialUsers:5,authFailures},
  scenarios,
  thresholds:sourceSummary.metrics?Object.fromEntries(Object.entries(sourceSummary.metrics).filter(([,value])=>value?.thresholds).map(([name,value])=>[name,value.thresholds])):{}
 };
}
const capacityScenarioValues=Object.values(profileEvidence['capacity-discovery'].scenarios);
const maxConfiguredReadVus=Math.max(...configured['capacity-discovery'].reads.stages.map(stage=>stage.target));
const maxObservedScenarioRps=Math.max(...capacityScenarioValues.map(value=>value.achievedRps));
const acceptance={
 exactGitSha:head,
 scenario:'authenticated-k6-smoke-ci-capacity-discovery',
 environment,
 startedAt:globalFirstAt===null?null:new Date(globalFirstAt).toISOString(),
 endedAt:globalLastAt===null?null:new Date(globalLastAt).toISOString(),
 profilesExecuted:profiles,
 realNextAuthCredentialUsers:5,
 authFailures:totalAuthFailures,
 requests:totalRequests,
 successfulBusinessOperations:totalSuccessfulBusinessOps,
 boundedCapacityBackpressure:totalBoundedBackpressure,
 unexpectedResponses:totalUnexpected,
 maximumControlledLoad:{configuredReadVus:maxConfiguredReadVus,mutationArrivalRatePerSecond:configured['capacity-discovery'].mutations.ratePerSecond,maxObservedScenarioRps},
 accepted:totalAuthFailures===0&&totalUnexpected===0&&profiles.every(profile=>scenarioNames.every(name=>profileEvidence[profile].scenarios[name].successfulBusinessOps>0))
};
if(!acceptance.accepted)throw new Error(`sec_g_k6_acceptance_failed:${JSON.stringify(acceptance)}`);
await mkdir(dir,{recursive:true});
await writeFile(`${dir}/k6-summary.json`,JSON.stringify({acceptance,profiles:profileEvidence},null,2));
await writeFile(`${dir}/k6-samples.json`,JSON.stringify({exactGitSha:head,scenario:'k6-derived-per-scenario-measurements',environment,startedAt:acceptance.startedAt,endedAt:acceptance.endedAt,profiles:Object.fromEntries(profiles.map(profile=>[profile,{source:`k6-${profile}-samples.json`,scenarios:profileEvidence[profile].scenarios}]))},null,2));
for(const [filename,name] of [['admin-workload.json','admin_read'],['provider-ingestion-workload.json','provider_ingestion']])await writeFile(`${dir}/${filename}`,JSON.stringify({exactGitSha:head,scenario:`authenticated-${name.replaceAll('_','-')}-empirical-workload`,environment,profiles:Object.fromEntries(profiles.map(profile=>[profile,profileEvidence[profile].scenarios[name]])),invariants:{executedAllProfiles:profiles.every(profile=>profileEvidence[profile].scenarios[name].requests>0),successfulBusinessResponses:profiles.every(profile=>profileEvidence[profile].scenarios[name].successfulBusinessOps>0),zeroAuthorizationFailures:profiles.every(profile=>profileEvidence[profile].scenarios[name].unexpected4xx===0),zeroUnexpectedServerErrors:profiles.every(profile=>profileEvidence[profile].scenarios[name].unexpected5xx===0),zeroTransportFailures:profiles.every(profile=>profileEvidence[profile].scenarios[name].transportFailures===0)}},null,2));
console.log(JSON.stringify(acceptance));
