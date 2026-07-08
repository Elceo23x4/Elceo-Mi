import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const DEFAULT_SCHEMA_DIR = path.resolve('infra/db/schema');
export function lexSort(a,b){return a.localeCompare(b,'en',{numeric:false,sensitivity:'variant'});}
export function prefixOf(f){return f.match(/^(\d{4})_/)?.[1] ?? null;}
export async function readMigrationFiles(schemaDir=DEFAULT_SCHEMA_DIR){
  let entries;
  try { entries = await fs.readdir(schemaDir,{withFileTypes:true}); } catch(e){ throw new Error(`schema directory missing/unreadable: ${schemaDir}: ${e.message}`); }
  const nonSql = entries.filter(e=>e.isFile()&&!e.name.endsWith('.sql')).map(e=>e.name).sort(lexSort);
  const files = entries.filter(e=>e.isFile()&&e.name.endsWith('.sql')).map(e=>e.name).sort(lexSort);
  if(!files.length) throw new Error(`no SQL migrations found in ${schemaDir}`);
  return {schemaDir, files, nonSql};
}
export async function readMigrations(schemaDir=DEFAULT_SCHEMA_DIR){
  const {files, nonSql} = await readMigrationFiles(schemaDir);
  return {nonSql, migrations: await Promise.all(files.map(async filename=>{
    const fullPath=path.join(schemaDir,filename); const sql=await fs.readFile(fullPath,'utf8');
    return {filename, fullPath, sql, checksum: crypto.createHash('sha256').update(sql).digest('hex')};
  }))};
}
export function duplicatePrefixes(files){const m=new Map(); for(const f of files){const p=prefixOf(f); if(!p) continue; m.set(p,[...(m.get(p)??[]),f]);} return [...m.entries()].filter(([,v])=>v.length>1).map(([prefix,files])=>({prefix,files}));}
export function classifySql(sql){const s=sql.toUpperCase(); const flags=[]; if(/DROP\s+TABLE|DROP\s+COLUMN|\bTRUNCATE\b|DELETE\s+FROM\s+\w+\s*(;|$)/i.test(sql)) flags.push('destructive'); if(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/i.test(sql)) flags.push('create-if-not-exists'); else if(/CREATE\s+TABLE/i.test(sql)) flags.push('create-only'); if(/ALTER\s+TABLE[\s\S]*ADD\s+COLUMN/i.test(sql)) flags.push('alter-additive'); if(/CREATE\s+(UNIQUE\s+)?INDEX/i.test(sql)) flags.push('index-additive'); if(/CREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|TRIGGER)|POLICY/i.test(sql)) flags.push('policy/trigger/function'); if(/INSERT\s+INTO|UPDATE\s+\w+/i.test(sql)) flags.push('backfill'); return flags.length?[...new Set(flags)]:['unknown'];}
export function buildSchemaModel(migrations){const tables=new Map(); const duplicateTables=[]; const missingRefs=[]; for(const m of migrations){ for(const mt of m.sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.]+)\s*\(([\s\S]*?)\);/gi)){const table=mt[1].split('.').pop(); if(tables.has(table)) duplicateTables.push(`${m.filename}:${table}`); const cols=new Set(); for(const part of mt[2].split(/,\n|,/)){const c=part.trim().match(/^"?([a-zA-Z_][\w]*)"?\s+/)?.[1]; if(c&&!/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|EXCLUDE)$/i.test(c)) cols.add(c);} tables.set(table,cols);} for(const mt of m.sql.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\w.]+)/gi)){const table=mt[1].split('.').pop(); if(!tables.has(table)) missingRefs.push(`${m.filename}: ALTER TABLE before create: ${table}`);} for(const stmt of m.sql.matchAll(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\w.]+)([\s\S]*?);/gi)){const table=stmt[1].split('.').pop(); if(tables.has(table)){ for(const col of stmt[2].matchAll(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-zA-Z_]\w*)"?/gi)) tables.get(table).add(col[1]); }}}
 return {tables, duplicateTables, missingRefs};}
