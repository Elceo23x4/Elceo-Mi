import pg from 'pg';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL_required');
const domain=process.env.SEC_G_BACKLOG_DOMAIN;if(!['ingestion','notification'].includes(domain))throw new Error('SEC_G_BACKLOG_DOMAIN_required');
const prefix=process.env.SEC_G_BACKLOG_PREFIX;if(!prefix)throw new Error('SEC_G_BACKLOG_PREFIX_required');
const token=process.env.SEC_G_BACKLOG_TOKEN??`${domain}-${process.pid}`;
const mode=process.env.SEC_G_BACKLOG_MODE??'drain';
const holdMs=Number(process.env.SEC_G_HOLD_MS??'10000');
const limit=Number(process.env.SEC_G_BACKLOG_LIMIT??'10');
const claimTtlMs=Number(process.env.SEC_G_BACKLOG_CLAIM_TTL_MS??'1000');
if(!Number.isInteger(claimTtlMs)||claimTtlMs<250)throw new Error('SEC_G_BACKLOG_CLAIM_TTL_MS_invalid');
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();

async function claim(){
 if(domain==='notification')return (await db.query(`WITH candidates AS (SELECT outbox_id FROM app_notification_outbox WHERE outbox_id LIKE $1 AND ((status IN ('staged','failed') AND available_at<=now()) OR (status='dispatching' AND claim_expires_at<=now())) ORDER BY outbox_id FOR UPDATE SKIP LOCKED LIMIT $2) UPDATE app_notification_outbox o SET status='dispatching',claim_token=$3,claim_generation=claim_generation+1,claimed_at=now(),claim_expires_at=now()+($4::int * interval '1 millisecond'),last_attempt_at=now(),updated_at=now() FROM candidates c WHERE o.outbox_id=c.outbox_id RETURNING o.outbox_id,o.claim_token,o.claim_generation,o.claim_expires_at`,[`${prefix}%`,limit,token,claimTtlMs])).rows;
 return (await db.query(`WITH candidates AS (SELECT outbox_id FROM app_ingestion_outbox WHERE outbox_id LIKE $1 AND ((status IN ('pending','failed') AND available_at<=now()) OR (status='publishing' AND claim_expires_at<=now())) ORDER BY outbox_id FOR UPDATE SKIP LOCKED LIMIT $2) UPDATE app_ingestion_outbox o SET status='publishing',claim_token=$3,claim_generation=claim_generation+1,claimed_at=now(),claim_expires_at=now()+($4::int * interval '1 millisecond'),last_attempt_at=now(),updated_at=now() FROM candidates c WHERE o.outbox_id=c.outbox_id RETURNING o.outbox_id,o.claim_token,o.claim_generation,o.claim_expires_at`,[`${prefix}%`,limit,token,claimTtlMs])).rows;
}
async function complete(row){
 if(domain==='notification'){
  const updated=await db.query(`UPDATE app_notification_outbox SET status='delivered',delivered_at=now(),attempt_count=attempt_count+1,claim_token=NULL,claimed_at=NULL,claim_expires_at=NULL,updated_at=now() WHERE outbox_id=$1 AND claim_token=$2 AND claim_generation=$3 RETURNING outbox_id`,[row.outbox_id,row.claim_token,row.claim_generation]);
  if(updated.rowCount===1)await db.query(`INSERT INTO app_notification_outbox_attempts(attempt_id,outbox_id,channel,attempted_at,status,error_code,error_message,provider_kind,provider_message_id,receipt_status,response_meta_json) VALUES($1,$2,'email',now(),'success',NULL,NULL,'sec-g-fixture',$2,'delivered','{}') ON CONFLICT(attempt_id) DO NOTHING`,[`sec-g-attempt:${row.outbox_id}:${row.claim_generation}`,row.outbox_id]);return updated.rowCount;
 }
 const updated=await db.query(`UPDATE app_ingestion_outbox SET status='published',published_at=now(),claim_token=NULL,claimed_at=NULL,claim_expires_at=NULL,updated_at=now(),last_error_code=NULL,last_error_message=NULL WHERE outbox_id=$1 AND claim_token=$2 AND claim_generation=$3 RETURNING outbox_id`,[row.outbox_id,row.claim_token,row.claim_generation]);
 if(updated.rowCount===1)await db.query(`INSERT INTO app_ingestion_outbox_attempts(attempt_id,outbox_id,attempted_at,transport,success,error_code,error_message) VALUES($1,$2,now(),'sec-g-fixture',true,NULL,NULL) ON CONFLICT(attempt_id) DO NOTHING`,[`sec-g-attempt:${row.outbox_id}:${row.claim_generation}`,row.outbox_id]);return updated.rowCount;
}

if(mode==='hold'){
 const rows=await claim();if(rows.length===0)throw new Error('sec_g_backlog_holder_claim_empty');process.stdout.write(`${JSON.stringify({event:'claimed',domain,pid:process.pid,rows:rows.map(row=>({outboxId:row.outbox_id,token:row.claim_token,generation:Number(row.claim_generation),expiresAt:new Date(row.claim_expires_at).toISOString()}))})}\n`);
 const timer=setTimeout(async()=>{await db.end();process.exit(0);},holdMs);timer.unref();process.on('SIGTERM',async()=>{clearTimeout(timer);await db.end().catch(()=>{});process.exit(0);});await new Promise(()=>{});
}else{
 let claimed=0,completed=0,batches=0;const generations=[];for(;;){const rows=await claim();if(rows.length===0)break;batches++;claimed+=rows.length;for(const row of rows){generations.push(Number(row.claim_generation));completed+=await complete(row);}}
 process.stdout.write(`${JSON.stringify({event:'drained',domain,pid:process.pid,claimed,completed,batches,generations})}\n`);await db.end();
}
