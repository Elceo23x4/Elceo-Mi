import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(process.env.SEC_G_ARTIFACT_DIR??'artifacts/sec-g');
const evidence=JSON.parse(await readFile(resolve(root,'notification-recovery.json'),'utf8'));
assert.equal(evidence.providerSpecific?.resend?.deterministicIdentityAcrossReclaim,true,'sec_g_resend_reclaim_identity_missing');
assert.equal(evidence.providerSpecific?.oneSignal?.deterministicIdentityAcrossReclaim,true,'sec_g_onesignal_reclaim_identity_missing');
assert.equal(evidence.providerSpecific?.postmark?.blindResendPrevented,true,'sec_g_postmark_ambiguity_not_fenced');
console.log(JSON.stringify({scenario:'sec-g-notification-provider-evidence',accepted:true}));
