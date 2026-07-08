#!/usr/bin/env node
import { readMigrations } from './migration-utils.mjs';
export const LEDGER_TABLE='elceo_migration_rehearsal_ledger';
export class MockDb{constructor(opts={}){this.ledger=new Map(opts.ledger??[]);this.executed=[];this.failOn=opts.failOn;} async query(sql,params=[]){this.executed.push({sql,params}); if(this.failOn&&String(sql).includes(this.failOn)) throw new Error(`mock failure on ${this.failOn}`); return {rows:[]};}}
export async function rehearse({schemaDir=process.env.ELCEO_SCHEMA_DIR,dryRun=process.env.ELCEO_MIGRATION_DRY_RUN==='1',databaseUrl=process.env.DATABASE_URL,db=null}={}){
 const {migrations}=await readMigrations(schemaDir); const summary={applied:0,skipped:0,failed:0,ordered:migrations.map(m=>m.filename),ledger:[]};
 if(dryRun){console.log('Dry-run/order-only migration rehearsal. No database connection used.'); summary.ordered.forEach(f=>console.log(` - ${f}`)); return summary;}
 if(!process.env.ELCEO_MIGRATION_REHEARSAL&&!db) throw new Error('Refusing to run without ELCEO_MIGRATION_REHEARSAL=1');
 if(!databaseUrl&&!db) throw new Error('DATABASE_URL is required unless using an injected test DB or dry-run');
 if(!db) throw new Error('No built-in production driver is bundled; use a local/staging executor wrapper or dry-run in CI');
 await db.query(`CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (filename text primary key, checksum text not null, applied_at timestamptz not null, duration_ms integer not null, status text not null, error_message text)`);
 for(const m of migrations){const existing=db.ledger?.get(m.filename); if(existing){ if(existing.checksum!==m.checksum) throw new Error(`Checksum drift for ${m.filename}`); summary.skipped++; summary.ledger.push({filename:m.filename,status:'skipped'}); continue; }
  const start=Date.now(); try{ await db.query(m.sql); const duration_ms=Date.now()-start; db.ledger?.set(m.filename,{checksum:m.checksum,status:'applied'}); await db.query(`INSERT INTO ${LEDGER_TABLE} (filename,checksum,applied_at,duration_ms,status,error_message) VALUES ($1,$2,NOW(),$3,'applied',NULL)`,[m.filename,m.checksum,duration_ms]); summary.applied++; summary.ledger.push({filename:m.filename,status:'applied',duration_ms}); }
  catch(e){summary.failed++; const duration_ms=Date.now()-start; await db.query(`INSERT INTO ${LEDGER_TABLE} (filename,checksum,applied_at,duration_ms,status,error_message) VALUES ($1,$2,NOW(),$3,'failed',$4)`,[m.filename,m.checksum,duration_ms,e.message]).catch(()=>{}); summary.ledger.push({filename:m.filename,status:'failed',error_message:e.message}); throw Object.assign(new Error(`Migration failed at ${m.filename}: ${e.message}`),{summary});}
 }
 console.log(`Migration rehearsal summary: applied=${summary.applied} skipped=${summary.skipped} failed=${summary.failed}`); return summary;
}
if(import.meta.url===`file://${process.argv[1]}`){rehearse().catch(e=>{console.error(`Migration rehearsal failed: ${e.message}`); process.exit(1);});}
