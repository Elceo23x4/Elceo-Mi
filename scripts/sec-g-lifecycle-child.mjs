import { appendFile } from 'node:fs/promises';
import { installRuntimeSignalHandlers, registerRuntimeDrain } from '../packages/db-runtime/dist/index.js';
const marker=process.env.SEC_G_LIFECYCLE_MARKER;
if(!marker)throw new Error('marker_required');
registerRuntimeDrain({name:'test-worker',stop:()=>appendFile(marker,'stop\n'),drain:async()=>{await appendFile(marker,'drain-start\n');if(process.env.SEC_G_DRAIN_MODE==='timeout')await new Promise(()=>{});await appendFile(marker,'drain-complete\n');}});
installRuntimeSignalHandlers();
await appendFile(marker,'ready\n');
setInterval(()=>{},1000);
