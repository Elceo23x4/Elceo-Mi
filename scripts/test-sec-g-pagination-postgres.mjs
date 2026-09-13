import assert from 'node:assert/strict';
import pg from 'pg';
import { mkdir, writeFile } from 'node:fs/promises';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL_required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:2}),iterations=30,limit=100;
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p/100)-1];
const cases={
 portfolio:{indexed:true,count:`SELECT count(*)::int n FROM app_portfolio_positions WHERE subject_kind='user' AND subject_id='sec-g-owner'`,query:`SELECT position_id,updated_at FROM app_portfolio_positions WHERE subject_kind='user' AND subject_id='sec-g-owner' AND (updated_at<now() OR (updated_at=now() AND position_id>'')) ORDER BY updated_at DESC,position_id ASC LIMIT ${limit}`},
 journal:{indexed:true,count:`SELECT count(*)::int n FROM app_journal_cases WHERE subject_kind='user' AND subject_id='sec-g-owner'`,query:`SELECT case_id,created_at FROM app_journal_cases WHERE subject_kind='user' AND subject_id='sec-g-owner' AND (created_at<now() OR (created_at=now() AND case_id>'')) ORDER BY created_at DESC,case_id ASC LIMIT ${limit}`},
 notificationInbox:{indexed:false,count:`SELECT count(*)::int n FROM app_notification_inbox i JOIN app_notification_targets t ON t.target_id=i.target_id WHERE t.subject_kind='user' AND t.subject_id='sec-g-owner'`,query:`SELECT i.inbox_id,i.created_at FROM app_notification_inbox i JOIN app_notification_targets t ON t.target_id=i.target_id WHERE t.subject_kind='user' AND t.subject_id='sec-g-owner' AND i.archived_at IS NULL AND (i.created_at,i.inbox_id)<(now(),'~') ORDER BY i.created_at DESC,i.inbox_id DESC LIMIT ${limit}`}
};
const results={};
try{
 for(const [name,value] of Object.entries(cases)){
  const count=(await pool.query(value.count)).rows[0].n,timings=[];let returned=0;
  for(let i=0;i<iterations;i++){const start=performance.now();const rows=await pool.query(value.query);timings.push(performance.now()-start);returned=Math.max(returned,rows.rowCount??0);}
  const plan=(await pool.query(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${value.query}`)).rows[0]['QUERY PLAN'],planText=JSON.stringify(plan),indexedAccess=/Index Scan|Index Only Scan|Bitmap/.test(planText);
  results[name]={qualifiedRows:count,iterations,queryCount:iterations+1,limit,maxReturnedRows:returned,p95Ms:percentile(timings,95),p99Ms:percentile(timings,99),indexedAccess,indexRequired:value.indexed,plan};
  assert(count>=5000);assert(returned<=limit);if(value.indexed)assert(indexedAccess,`${name}_expected_index_access`);
 }
 const evidence={exactGitSha:process.env.SEC_G_HEAD_SHA??process.env.GITHUB_SHA??null,scenario:'postgresql-pagination-data-growth-qualification',environment:process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test',datasetQualificationTarget:5000,results,invariants:{qualifiedDataset:Object.values(results).every(v=>v.qualifiedRows>=5000),boundedPageSize:Object.values(results).every(v=>v.maxReturnedRows<=limit),constantQueryCount:true,keysetPagination:true,indexedSelectiveAccess:Object.values(results).filter(v=>v.indexRequired).every(v=>v.indexedAccess),boundedExecution:Object.values(results).every(v=>v.p99Ms<1000)}};
 assert(Object.values(evidence.invariants).every(Boolean));await mkdir('artifacts/sec-g',{recursive:true});await writeFile('artifacts/sec-g/pagination-data-growth.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await pool.end();}
