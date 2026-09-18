import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FROZEN_BACKEND_COMMIT='20266494efd3a8d3a97c3ea9335c672e20fe7fa5';
export const FROZEN_FUNCTIONAL_TREE='6f81f55269031e0ec6467cd60283593dd5b7c2d3';
export const HANDOFF_VERSION='2026-09-18';
const METHODS=['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'];
const METHOD_RE=/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|as\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*[,}]/g;

function walk(dir){
  return readdirSync(dir).sort().flatMap((entry)=>{
    const full=join(dir,entry); const st=statSync(full);
    return st.isDirectory()?walk(full):entry==='route.ts'?[full]:[];
  });
}
function routePathFromFile(file,root){
  const rel=relative(root,file).split(sep).join('/').replace(/\/route\.ts$/,'');
  return `/api/${rel.replace(/\[(.+?)\]/g,'{$1}')}`;
}
function methodsOf(source){
  const methods=new Set();
  for(const m of source.matchAll(METHOD_RE)){const v=m[1]??m[2]??m[3]??m[4];if(v)methods.add(v);}
  return [...methods].sort((a,b)=>METHODS.indexOf(a)-METHODS.indexOf(b));
}
function familyOf(path){return path.split('/')[2]||'api';}
function policy(path,method,source){
  const mutates=!['GET','HEAD','OPTIONS'].includes(method);
  const internal=path.startsWith('/api/internal/')||path.startsWith('/api/ops/');
  const admin=path.startsWith('/api/admin/');
  const auth=path.startsWith('/api/auth/');
  const health=path.includes('/health');
  const blocked=/\/checkout|\/session|\/dispatch|\/provider-events|\/fixture-ingest/.test(path);
  let classification='authenticated_basic';
  let uiExposure='user_ui';
  let entitlement='none';
  let permission='none';
  if(auth||health){classification='no_product_entitlement_required';uiExposure=auth?'framework':'user_ui';}
  else if(internal){classification='internal_only';uiExposure='server_internal';permission=mutates?'admin.ops':'admin.read';}
  else if(admin){classification=mutates?'admin_ops_required':'admin_read_required';uiExposure=path.includes('/commercial/users/')?'super_admin_ui':'admin_ui';permission=path.includes('/commercial/users/')&&mutates?'super_admin':mutates?'admin.ops':'admin.read';}
  else if(path.startsWith('/api/dashboard/')){classification='kick_off_allowed';entitlement='dashboard.basic_or_focus_slice';}
  else if(path.startsWith('/api/journal/')){classification=path.includes('/influence/')?'focus_plan_required':'kick_off_allowed';entitlement=classification==='focus_plan_required'?'focus_plan':'journal.page';}
  else if(path.startsWith('/api/workspace/')){classification='focus_plan_required';entitlement='workspace';}
  else if(path.startsWith('/api/portfolio/')){classification='focus_plan_required';entitlement='portfolio.advanced';}
  else if(path.startsWith('/api/analytics/')){classification='focus_plan_required';entitlement='dashboard.full_cognition';}
  else if(path.startsWith('/api/coaching/')){classification='focus_plan_required';entitlement='dashboard.full_cognition';}
  else if(path.startsWith('/api/refresh/')){classification='focus_plan_required';entitlement='refresh.run';}
  else if(path.startsWith('/api/notifications/')){classification='focus_plan_required';entitlement='notification.advanced_preferences';}
  else if(path.startsWith('/api/billing/')){classification=blocked?'blocked_live_activation':'payment_readiness_required';entitlement='billing';}
  if(blocked&&!internal&&!admin&&path.startsWith('/api/billing/')) classification='blocked_live_activation';
  return {
    classification,uiExposure,entitlement,permission,
    authenticated:/requireAuthenticatedSubject|requireAppUserState|requireOnboardedAppUserState|requireFeatureAccess|auth\(/.test(source)||(!internal&&!admin&&!auth&&!health),
    internalToken:/requireInternalRouteAccess|requireInternalRequest|x-elceo-internal-token|internal-token/.test(source)||internal||admin,
    stepUp:/stepUp|step-up|challengeId|consume.*Challenge|verifiedChallenge/.test(source),
    idempotency:mutates&&/Idempotency-Key|idempotencyKey|requireSecurityDecision|completeSecurityDecision|getIdempotency/.test(source),
    securityDecision:/requireSecurityDecision|completeSecurityDecision|failSecurityDecision/.test(source),
    audit:/auditInternalMutation|recordSecurityAuditEvent|audit/.test(source),
    ownership:/assertRouteSubjectOwnership|subject\.subjectId|subject\.userId|owner/.test(source),
    mutation:mutates,
    liveActivationBlocked:blocked||/blocked_live_activation|blockedLive|live_activation_required/.test(source)
  };
}
export function buildHandoff(root=process.cwd()){
  const apiRoot=join(root,'apps/web/app/api');
  const routeFiles=walk(apiRoot);
  const inventory=[];
  for(const file of routeFiles){
    const source=readFileSync(file,'utf8'); const path=routePathFromFile(file,apiRoot); const methods=methodsOf(source);
    for(const method of methods){inventory.push({path,method,family:familyOf(path),routeFile:relative(root,file).split(sep).join('/'),...policy(path,method,source)});}
  }
  inventory.sort((a,b)=>`${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`));
  const paths={};
  for(const row of inventory){
    const p=paths[row.path]??={};
    const op={
      tags:[row.family],
      operationId:`${row.method.toLowerCase()}_${row.path.replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_|_$/g,'')}`,
      summary:`${row.method} ${row.path}`,
      responses:{
        '200':{description:'Successful ELCEO API response',content:{'application/json':{schema:{$ref:'#/components/schemas/ApiSuccessEnvelope'}}}},
        '400':{$ref:'#/components/responses/BadRequest'},
        '401':{$ref:'#/components/responses/Unauthorized'},
        '403':{$ref:'#/components/responses/Forbidden'},
        '409':{$ref:'#/components/responses/Conflict'},
        '422':{$ref:'#/components/responses/Unprocessable'},
        '424':{$ref:'#/components/responses/DependencyFailed'},
        '500':{$ref:'#/components/responses/InternalError'}
      },
      'x-elceo-ui-exposure':row.uiExposure,
      'x-elceo-policy':row.classification,
      'x-elceo-entitlement':row.entitlement,
      'x-elceo-permission':row.permission,
      'x-elceo-source':row.routeFile,
      'x-elceo-contract-note':'Field-level request/response constraints remain authoritative in the referenced route validator/type. This OpenAPI layer does not invent constraints not mechanically provable from the route tree.'
    };
    if(row.authenticated||row.internalToken) op.security=[row.internalToken?{internalToken:[]}:{sessionAuth:[]}];
    if(row.mutation) op.requestBody={required:false,content:{'application/json':{schema:{type:'object',additionalProperties:true,description:'Exact field constraints are defined by the route validator/type referenced by x-elceo-source.'}}}};
    p[row.method.toLowerCase()]=op;
  }
  const errorSchema={type:'object',required:['ok','error'],properties:{ok:{const:false},error:{type:'object',required:['code','message'],properties:{code:{type:'string'},message:{type:'string'},details:{}}}}};
  const errorResponse=(description)=>({description,content:{'application/json':{schema:{$ref:'#/components/schemas/ApiErrorEnvelope'}}}});
  const openapi={openapi:'3.1.0',info:{title:'ELCEO Frozen Backend API Handoff',version:HANDOFF_VERSION,description:`Generated from frozen backend baseline ${FROZEN_BACKEND_COMMIT}. Runtime validators remain authoritative for field-level constraints.`},paths,components:{securitySchemes:{sessionAuth:{type:'apiKey',in:'cookie',name:'session',description:'Server-resolved authenticated session; concrete NextAuth cookie name is environment/framework managed.'},internalToken:{type:'apiKey',in:'header',name:'x-elceo-internal-token'}},schemas:{ApiSuccessEnvelope:{type:'object',required:['ok','data'],properties:{ok:{const:true},data:{},meta:{}}},ApiErrorEnvelope:errorSchema},responses:{BadRequest:errorResponse('Bad request or validation failure'),Unauthorized:errorResponse('Authentication required'),Forbidden:errorResponse('Authenticated but not authorized/entitled'),Conflict:errorResponse('Conflict or idempotent replay conflict'),Unprocessable:errorResponse('Unprocessable request'),DependencyFailed:errorResponse('Upstream/dependency failure'),InternalError:errorResponse('Internal server failure')}}};
  return {inventory,openapi};
}
function mockRegistry(){
  return {
    'session.json':{ok:true,data:{authenticated:true,user:{id:'usr_demo_001',role:'user'},session:{state:'active',expiresAt:'2026-09-18T12:00:00.000Z'}}},
    'account-entitlements.json':{ok:true,data:{plan:'focus',status:'active',features:['dashboard.full_cognition','portfolio.advanced','notification.advanced_preferences'],usage:{period:'monthly'}}},
    'billing.json':{ok:true,data:{state:'active',plan:'focus',providerActivation:'environment_required',renewalAt:'2026-10-18T00:00:00.000Z',cancelAtPeriodEnd:false,reconciliationState:'settled'}},
    'dashboard.json':{ok:true,data:{asset:'eur_usd',directionalBias:{state:'mixed',baseCurrency:{currency:'EUR',pressure:'supportive'},quoteCurrency:{currency:'USD',pressure:'supportive'},relativePressure:'mixed'},confidence:{band:'medium',score:0.62,drivers:['evidence_quality','freshness'],cautions:['contradiction_window_open']},freshness:{state:'fresh'},marketRegime:'mixed',evidenceStack:[{kind:'macro',sourceAuthority:'official_first_party',state:'fresh'}],contradictions:[{kind:'fx_base_quote',severity:'moderate'}]}},
    'workspace.json':{ok:true,data:{state:'ready',freshness:'fresh',agenda:[],lastMaterializedAt:'2026-09-18T09:00:00.000Z'}},
    'journal.json':{ok:true,data:{items:[{caseId:'case_demo_001',asset:'xau_usd',state:'planned',openedAt:null}],nextCursor:null}},
    'portfolio.json':{ok:true,data:{watchlist:[{asset:'eur_usd',status:'active'}],positions:[],actions:[],snapshotState:'ready'}},
    'analytics.json':{ok:true,data:{state:'ready',topSetups:[],behaviors:[],generatedAt:'2026-09-18T09:00:00.000Z'}},
    'coaching.json':{ok:true,data:{state:'ready',focus:'discipline',insights:['Wait for evidence alignment before escalation.'],actionPlan:[]}},
    'notifications.json':{ok:true,data:{summary:{unread:1,total:3},inbox:[{id:'ntf_demo_001',topic:'market_context',state:'unread'}],deliveryHealth:'degraded_provider_activation_required'}},
    'refresh.json':{ok:true,data:{state:'completed',requestedAt:'2026-09-18T08:59:00.000Z',completedAt:'2026-09-18T09:00:00.000Z'}},
    'admin.json':{ok:true,data:{scope:'admin_read',systemState:'healthy',providerActivation:'environment_verification_required'}},
    'super-admin.json':{ok:true,data:{scope:'super_admin',stepUp:{required:true,state:'verified'},commercialControl:{targetUserId:'usr_demo_002',state:'eligible'}}},
    'error-unauthorized.json':{ok:false,error:{code:'unauthorized',message:'Authentication required'}},
    'error-entitlement.json':{ok:false,error:{code:'forbidden',message:'Required entitlement is not active',details:{reason:'focus_plan_required'}}},
    'error-dependency.json':{ok:false,error:{code:'dependency_failed',message:'Required dependency is unavailable'}}
  };
}
export function writeHandoff(root=process.cwd()){
  const {inventory,openapi}=buildHandoff(root); const out=join(root,'artifacts/ui-handoff'); mkdirSync(join(out,'mocks'),{recursive:true});
  writeFileSync(join(out,'route-inventory.json'),JSON.stringify({freezeCommit:FROZEN_BACKEND_COMMIT,functionalTree:FROZEN_FUNCTIONAL_TREE,routeMethodCount:inventory.length,routes:inventory},null,2)+'\n');
  writeFileSync(join(out,'openapi.json'),JSON.stringify(openapi,null,2)+'\n');
  for(const [name,value] of Object.entries(mockRegistry())) writeFileSync(join(out,'mocks',name),JSON.stringify(value,null,2)+'\n');
  const manifest={freezeCommit:FROZEN_BACKEND_COMMIT,functionalTree:FROZEN_FUNCTIONAL_TREE,handoffVersion:HANDOFF_VERSION,routeFileCount:new Set(inventory.map(x=>x.routeFile)).size,routeMethodCount:inventory.length,openApiOperationCount:Object.values(openapi.paths).reduce((n,p)=>n+Object.keys(p).length,0),browserSafeMethodCount:inventory.filter(x=>['user_ui','admin_ui','super_admin_ui','framework'].includes(x.uiExposure)).length,serverInternalMethodCount:inventory.filter(x=>x.uiExposure==='server_internal').length,mockCount:Object.keys(mockRegistry()).length};
  writeFileSync(join(out,'backend-freeze-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

if(process.argv[1]===fileURLToPath(import.meta.url)) console.log(JSON.stringify(writeHandoff(),null,2));
