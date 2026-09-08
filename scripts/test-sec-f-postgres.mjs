import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';import{readFile,readdir}from'node:fs/promises';import pg from'pg';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL_required');
const base=new URL(process.env.DATABASE_URL),adminUrl=new URL(base);adminUrl.pathname='/postgres';
const dbName=`elceo_sec_f_${randomUUID().replaceAll('-','')}`,role=`sec_f_runtime_${randomUUID().replaceAll('-','')}`,password=randomUUID();
const admin=new pg.Client({connectionString:adminUrl.toString()});await admin.connect();await admin.query(`CREATE DATABASE ${dbName}`);
const ownerUrl=new URL(base);ownerUrl.pathname=`/${dbName}`;const owner=new pg.Client({connectionString:ownerUrl.toString()});let failure;
try{
 await owner.connect();for(const file of(await readdir('infra/db/schema')).filter(x=>/^\d{4}.*\.sql$/.test(x)).sort())await owner.query(await readFile(`infra/db/schema/${file}`,'utf8'));
 await owner.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; GRANT CONNECT ON DATABASE ${dbName} TO ${role}; GRANT USAGE ON SCHEMA public,elceo_security TO ${role}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
 const now='2026-09-08T00:00:00Z';
 for(const [id,subject]of[['case-a','A'],['case-b','B']])await owner.query(`INSERT INTO app_journal_cases(case_id,subject_kind,subject_id,asset,timeframe,title,status,direction,conviction,thesis,setup_type,take_profit_planned_json,execution_checklist_json,execution_notes_json,outcome,what_went_well_json,what_went_wrong_json,lessons_json,behavior_tags_json,follow_up_actions_json,tags_json,created_at,updated_at,case_json) VALUES($1,'user',$2,'BTC','H1','case','draft','long','standard','thesis','breakout','[]','[]','[]','pending','[]','[]','[]','[]','[]','[]',$3,$3,'{}')`,[id,subject,now]);
 await owner.query(`INSERT INTO app_journal_case_revisions(revision_id,case_id,revision_type,next_status,changed_at,changed_by_kind,changed_by_id,summary,snapshot_json) VALUES('rev-b','case-b','created','draft',$1,'user','B','created','{}')`,[now]);
 for(const [id,subject]of[['target-a','A'],['target-b','B']])await owner.query(`INSERT INTO app_notification_targets(target_id,subject_kind,subject_id,channel,target_kind,address_json,status,verified_at,disabled_at,created_at,updated_at) VALUES($1,'user',$2,'email','email_address','{}','pending',null,null,$3,$3)`,[id,subject,now]);
 await owner.query(`INSERT INTO app_notification_verifications(verification_id,verification_key,target_id,subject_kind,subject_id,channel,verification_kind,token_hash,issued_at,expires_at,consumed_at,status,attempt_count,last_attempt_at,created_at,updated_at) VALUES('verify-b','key-b','target-b','user','B','email','initial','hash',$1,$1,null,'pending',0,null,$1,$1)`,[now]);
 const runtimeUrl=new URL(ownerUrl);runtimeUrl.username=role;runtimeUrl.password=password;const runtime=new pg.Client({connectionString:runtimeUrl.toString()});await runtime.connect();
 await runtime.query('BEGIN');await runtime.query(`SELECT set_config('app.authenticated_subject_id','A',true)`);
 assert.deepEqual((await runtime.query('SELECT case_id FROM app_journal_cases ORDER BY case_id')).rows,[{case_id:'case-a'}]);
 assert.equal((await runtime.query("UPDATE app_journal_cases SET title='attack' WHERE case_id='case-b'")).rowCount,0);assert.equal((await runtime.query("DELETE FROM app_journal_cases WHERE case_id='case-b'")).rowCount,0);
 await assert.rejects(runtime.query(`INSERT INTO app_notification_targets(target_id,subject_kind,subject_id,channel,target_kind,address_json,status,created_at,updated_at) VALUES('forged','user','B','email','email_address','{}','pending',$1,$1)`,[now]),/row-level security/);
 assert.equal((await runtime.query('SELECT count(*)::int n FROM app_journal_case_revisions')).rows[0].n,0);assert.equal((await runtime.query('SELECT count(*)::int n FROM app_notification_verifications')).rows[0].n,0);
 await runtime.query('ROLLBACK');await runtime.query('BEGIN');assert.equal((await runtime.query('SELECT count(*)::int n FROM app_journal_cases')).rows[0].n,0);await runtime.query(`SELECT set_config('app.authenticated_subject_id','B',true)`);assert.equal((await runtime.query('SELECT count(*)::int n FROM app_journal_cases')).rows[0].n,1);await runtime.query('COMMIT');
 await runtime.end();console.log('SEC-F restricted-role RLS proof passed: own access, foreign SELECT/UPDATE/DELETE/INSERT and child reads denied; transaction context reset');
}catch(error){failure=error;}finally{await owner.end().catch(()=>{});await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1`,[dbName]).catch(()=>{});await admin.query(`DROP DATABASE IF EXISTS ${dbName}`).catch(()=>{});await admin.query(`DROP ROLE IF EXISTS ${role}`).catch(()=>{});await admin.end();}
if(failure)throw failure;
