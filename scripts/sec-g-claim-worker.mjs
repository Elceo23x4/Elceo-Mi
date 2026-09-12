import pg from 'pg';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL_required');
const outboxId=process.env.SEC_G_OUTBOX_ID;if(!outboxId)throw new Error('SEC_G_OUTBOX_ID_required');
const token=process.env.SEC_G_CLAIM_TOKEN;if(!token)throw new Error('SEC_G_CLAIM_TOKEN_required');
const holdMs=Number(process.env.SEC_G_HOLD_MS??'10000');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
const claim=(await client.query(`WITH candidate AS (
  SELECT outbox_id FROM app_notification_outbox
  WHERE outbox_id=$1 AND ((status IN ('staged','failed') AND available_at<=now()) OR (status='dispatching' AND claim_expires_at<=now()))
  FOR UPDATE SKIP LOCKED
)
UPDATE app_notification_outbox o
SET status='dispatching',claim_token=$2,claim_generation=claim_generation+1,claimed_at=now(),claim_expires_at=now()+interval '250 milliseconds'
FROM candidate c WHERE o.outbox_id=c.outbox_id
RETURNING o.claim_token,o.claim_generation,o.claim_expires_at`,[outboxId,token])).rows[0];
if(!claim)throw new Error('sec_g_worker_claim_failed');
process.stdout.write(`${JSON.stringify({event:'claimed',token:claim.claim_token,generation:Number(claim.claim_generation),expiresAt:claim.claim_expires_at})}\n`);
const timer=setTimeout(async()=>{await client.end();process.exit(0);},holdMs);timer.unref();
process.on('SIGTERM',async()=>{clearTimeout(timer);await client.end().catch(()=>{});process.exit(0);});
await new Promise(()=>{});
