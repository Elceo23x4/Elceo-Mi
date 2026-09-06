import {jsonError,jsonSuccess,parseJsonBody,withApiErrorBoundary} from '@/lib/server/api';
import {requireInternalRouteAccess} from '@/lib/server/auth';
import {requireFeatureAccess} from '@/lib/server/access';
import {auditInternalMutation,completeSecurityDecision,failSecurityDecision,getSecurityActorFromRequest,requireSecurityDecision} from '@/lib/server/security';
import {getSuperAdminCommercialRouteScope,updateFocusPlanPrice} from '@elceo/application-state';
const routePath=getSuperAdminCommercialRouteScope('focus_plan_price_update');
export const POST=withApiErrorBoundary(async(request:Request)=>{
 requireInternalRouteAccess(request);const access=await requireFeatureAccess('admin.ops',{request});if(!access.ok)return access.response;
 const body=await parseJsonBody(request) as Record<string,unknown>;if(typeof body.stepUpChallengeId!=='string'||typeof body.idempotencyKey!=='string')return jsonError('forbidden','Step-up and idempotency required',['step_up_required'],403);
 const interval=body.billingInterval;if(interval!=='monthly'&&interval!=='quarterly'&&interval!=='yearly')return jsonError('validation_error','Invalid interval',['invalid_interval'],400);
 const actor=getSecurityActorFromRequest(request,'admin');const security=await requireSecurityDecision({request,routePath,method:'POST',actionKind:'admin_write',actor,subjectId:access.subject.subjectId,requestBody:body});if(!security.ok)return security.response;
 try{const result=await updateFocusPlanPrice({actorSuperAdminId:access.subject.userId,stepUpChallengeId:body.stepUpChallengeId,billingInterval:interval,currency:String(body.currency??''),amountMinor:String(body.amountMinor??''),effectiveFrom:String(body.effectiveFrom??new Date().toISOString()),reasonCode:String(body.reasonCode??''),operatorNote:String(body.operatorNote??''),idempotencyKey:body.idempotencyKey});const response={action:'focus_plan_price_update',routeScope:routePath,...result};await completeSecurityDecision({decision:security.decision,idempotencyKey:security.idempotencyKey,requestHash:security.requestHash,responseBody:response,responseEnvelope:{ok:true,data:response},httpStatus:200});await auditInternalMutation({actor,subjectId:access.subject.subjectId,actionKind:'admin_write',routePath,method:'POST',request,idempotencyKey:security.idempotencyKey,metadata:{action:'focus_plan_price_update',stepUpStatus:'verified'}});return jsonSuccess(response);}catch(error){await failSecurityDecision({idempotencyKey:security.idempotencyKey,errorMessage:error instanceof Error?error.message:'unknown'});throw error;}
});
