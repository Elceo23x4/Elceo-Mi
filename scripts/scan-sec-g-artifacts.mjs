import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertSafe } from './sanitize-sec-g-k6-artifacts.mjs';

const root=resolve(process.env.SEC_G_ARTIFACT_DIR??'artifacts/sec-g');
async function walk(path){
 const info=await stat(path);
 if(info.isDirectory())return (await readdir(path)).flatMap(name=>[`${path}/${name}`]);
 return [path];
}
const pending=[root],files=[];
while(pending.length){const path=pending.pop();for(const entry of await walk(path)){const info=await stat(entry);if(info.isDirectory())pending.push(entry);else files.push(entry);}}
for(const path of files)assertSafe(await readFile(path,'utf8'),path.slice(root.length+1));
const evidence={exactGitSha:process.env.SEC_G_HEAD_SHA??process.env.GITHUB_SHA??null,scenario:'sec-g-sensitive-artifact-scan',environment:process.env.GITHUB_ACTIONS==='true'?'github-actions-test':'local-test',scannedAt:new Date().toISOString(),scannedFiles:files.length,accepted:true};
await writeFile(resolve(root,'sensitive-artifact-scan.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
