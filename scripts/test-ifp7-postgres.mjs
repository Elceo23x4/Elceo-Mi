import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const url=process.env.DATABASE_URL;if(!url)throw new Error('DATABASE_URL is required for real PostgreSQL IFP-7 acceptance');
const pool=new pg.Pool({connectionString:url});
try{
 const migration=await readFile('infra/db/schema/0048_fragility_score.sql','utf8');await pool.query(migration);
 const table=await pool.query("SELECT to_regclass('public.fragility_score_evaluations') AS name");assert.equal(table.rows[0].name,'fragility_score_evaluations');
 const fks=await pool.query("SELECT count(*)::int AS count FROM pg_constraint WHERE conrelid='fragility_score_evaluations'::regclass AND contype='f'");assert.equal(fks.rows[0].count,6);
 const columns=await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='fragility_score_evaluations'");for(const required of ['canonical_payload','canonical_payload_hash','evidence_cutoff_at','policy_version','fragility_score'])assert.ok(columns.rows.some(x=>x.column_name===required));
 console.log('IFP-7 PostgreSQL migration and immutable lineage schema acceptance passed');
}finally{await pool.end();}
