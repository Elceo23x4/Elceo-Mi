#!/usr/bin/env node
import { readMigrations, duplicatePrefixes, classifySql } from './migration-utils.mjs';
try{
 const {migrations, nonSql}=await readMigrations(process.env.ELCEO_SCHEMA_DIR);
 const files=migrations.map(m=>m.filename);
 if(new Set(files).size!==files.length) throw new Error('Duplicate exact filenames detected');
 console.log('Canonical migration order: full filename lexicographic');
 console.log('Ordered migrations (lexicographic):'); files.forEach(f=>console.log(` - ${f}`));
 if(nonSql.length) console.warn(`Ignored non-SQL schema directory files: ${nonSql.join(', ')}`);
 const dup=duplicatePrefixes(files); if(dup.length){console.warn('Warning: duplicate numeric prefixes detected; full filename lexicographic ordering remains canonical; duplicates are allowed only when migrations are additive/rehearsal-safe:'); dup.forEach(d=>console.warn(` - ${d.prefix}: ${d.files.join(', ')}`));}
 console.log('Migration classifications:'); for(const m of migrations) console.log(` - ${m.filename}: ${classifySql(m.sql).join(', ')}`);
 console.log(`Migration file ordering check complete. count=${files.length}`);
}catch(e){console.error(`Migration readiness check failed: ${e.message}`); process.exit(1);}
