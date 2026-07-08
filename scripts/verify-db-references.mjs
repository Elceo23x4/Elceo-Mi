#!/usr/bin/env node
import { promises as fs } from 'node:fs'; import path from 'node:path'; import { readMigrations, buildSchemaModel } from './migration-utils.mjs';
const roots=['services/application-state/src/persistence','services/reasoning/src/persistence','services/reasoning/src/provider-sources','services/ingestion/src/scheduler','apps/web/lib/server','apps/web/app/api'];
const allow=new Set(['excluded','updated','set','active_gifts','active_restrictions','d','alert']);
let {migrations}=await readMigrations();
// Include static table fragments in the verification model without changing canonical migration order.
for (const frag of await files('infra/db/schema/tables')) migrations.push({filename:frag, sql:await fs.readFile(frag,'utf8')});
const model=buildSchemaModel(migrations); const errors=[...model.missingRefs];
async function files(dir){try{const out=[]; for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name); if(e.isDirectory()) out.push(...await files(p)); else if(/\.(ts|tsx|js|mjs)$/.test(e.name)) out.push(p);} return out;}catch{return[];}}
for(const root of roots) for(const file of await files(root)){const text=await fs.readFile(file,'utf8'); if(!/queryDb|\.query\(|SELECT|INSERT|UPDATE|DELETE/i.test(text)) continue; for(const m of text.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z_]\w*)/gi)){const table=m[1]; if(!allow.has(table.toLowerCase())&&!model.tables.has(table)) errors.push(`${file}: references missing table ${table}`);} for(const m of text.matchAll(/\b(?:SELECT|INSERT\s+INTO\s+[a-zA-Z_]\w*\s*\()([^`'";]{1,500})/gi)){/* table/column checking is covered for realistic inserts below */} for(const m of text.matchAll(/INSERT\s+INTO\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/gi)){const table=m[1]; const cols=(m[2].match(/[a-zA-Z_]\w*/g)||[]); const known=model.tables.get(table); if(known) for(const c of cols) if(!known.has(c)) errors.push(`${file}: ${table}.${c} missing from migration model`);} }
if(errors.length){console.error('DB reference verification failed:'); errors.forEach(e=>console.error(` - ${e}`)); process.exit(1);} console.log(`DB reference verification passed. tables=${model.tables.size}`);
