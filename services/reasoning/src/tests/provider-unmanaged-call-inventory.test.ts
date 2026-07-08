import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

type InventoryClass = 'through_provider_api_gate'|'fixture_only_behind_gate'|'dry_run_only_behind_gate'|'replay_only_behind_gate'|'operator_inspection_only'|'descriptor_only'|'test_only'|'remaining_unmanaged_call';
const roots = ['services/reasoning','services/ingestion','services/application-state','apps/web/app/api','packages/providers'];
const runtimeProviderCallPattern = /(new\s+(TiingoMarketDataAdapter|CftcCotAdapter)\b|persistAdapterFetchAndNormalize\s*\(|\.fetch\s*\([^)]*ProviderSourceRequest|fetchLiveTiingoBars\s*\()/;

export function runProviderUnmanagedCallInventoryTests(){
  const repoRoot = findRepoRoot(process.cwd());
  const rows = walkRuntimeFiles(repoRoot).filter((file) => runtimeProviderCallPattern.test(readFileSync(file,'utf8'))).map((file) => classify(file, readFileSync(file,'utf8')));
  const remaining = rows.filter((row) => row.classification === 'remaining_unmanaged_call');
  assert.deepEqual(remaining, []);
  const scheduled = rows.find((row) => row.file === 'services/reasoning/src/scheduled-ingestion/scheduled-ingestion-service.ts');
  assert.equal(scheduled?.classification, 'through_provider_api_gate');
  assert.ok(rows.some((row) => row.classification === 'fixture_only_behind_gate'));
}
function walkRuntimeFiles(cwd:string): string[] {
  const out:string[]=[];
  const visit=(dir:string)=>{ for(const entry of readdirSync(dir)){ const path=join(dir,entry); if(entry==='node_modules'||entry.startsWith('dist')||entry==='.next') continue; const stat=statSync(path); if(stat.isDirectory()) visit(path); else if(path.endsWith('.ts')||path.endsWith('.tsx')) out.push(path); } };
  for(const root of roots) visit(join(cwd,root));
  return out;
}
function classify(absFile:string, source:string): { file:string; classification:InventoryClass } {
  const file = relative(findRepoRoot(process.cwd()), absFile);
  if(file.includes('/tests/') || file.endsWith('.test.ts')) return { file, classification:'test_only' };
  if(file.startsWith('packages/providers/')) return { file, classification:'descriptor_only' };
  if(file.includes('/provider-sources/') && !file.includes('scheduled-ingestion')) return { file, classification:'fixture_only_behind_gate' };
  if(file === 'services/reasoning/src/runtime/canonical-market-intelligence-boundary.ts' && source.includes('runTiingoFixtureIngestion') && source.includes("mode: 'fixture'")) return { file, classification:'fixture_only_behind_gate' };
  if(source.includes('ProviderApiGateSnapshot') || source.includes('buildProviderApiGateSnapshot')) return { file, classification:'operator_inspection_only' };
  if(source.includes('resolveProviderRuntimeRequest') && source.includes('providerCallMode') && source.indexOf('resolveProviderRuntimeRequest') < source.search(runtimeProviderCallPattern)) return { file, classification:'through_provider_api_gate' };
  if(source.includes('dry_run_no_external_call')) return { file, classification:'dry_run_only_behind_gate' };
  if(source.includes('replay_captured_payload')) return { file, classification:'replay_only_behind_gate' };
  return { file, classification:'remaining_unmanaged_call' };
}

function findRepoRoot(start:string): string { let dir=start; for(let i=0;i<6;i+=1){ try{ if(statSync(join(dir,'package.json')).isFile() && statSync(join(dir,'services')).isDirectory() && statSync(join(dir,'apps')).isDirectory()) return dir; }catch{ /* keep walking upward */ } dir=dirname(dir); } return start; }
