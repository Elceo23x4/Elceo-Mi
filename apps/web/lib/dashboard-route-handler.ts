import { NextResponse } from 'next/server';
import type { DashboardChartWorkspaceViewModel, KickOffDashboardViewModelV1 } from '@elceo/types';
import type { withDashboardReadAdmission } from './inbound-read-admission';
import type { DashboardCommercialAccess } from './server/dashboard-commercial-authority';
type AuthState={session:{user?:{id?:string|null}};appState:{watchlist:{assets:string[]}}};
export function createDashboardGetHandler(dependencies:{authenticate:()=>Promise<AuthState>;readDashboard:(asset:string,signal:AbortSignal)=>Promise<DashboardChartWorkspaceViewModel|null>;readKickOff?:(asset:string,signal:AbortSignal,features:{evidenceScore:boolean;macroHeadlines:boolean})=>Promise<KickOffDashboardViewModelV1|null>;admit:typeof withDashboardReadAdmission;authorizeCommercial?:(userId:string)=>Promise<boolean>;resolveCommercialAccess?:(userId:string)=>Promise<DashboardCommercialAccess>}){
  return async function dashboardGet(_:Request,context:{params:Promise<{asset:string}>}){try{
    const{session,appState}=await dependencies.authenticate(),subject=session.user?.id;if(!subject)throw new Error('UNAUTHORIZED');
    const access=dependencies.resolveCommercialAccess?await dependencies.resolveCommercialAccess(subject):dependencies.authorizeCommercial&&!(await dependencies.authorizeCommercial(subject))?'denied':'focus_plan';
    if(access==='denied')return NextResponse.json({error:'subscription_required'},{status:403});
    const{asset}=await context.params,requestedAsset=decodeURIComponent(asset??'XAU/USD'),allowedAsset=appState.watchlist.assets.includes(requestedAsset)?requestedAsset:appState.watchlist.assets[0]??'XAU/USD';
    if(access!=='focus_plan'&&(!dependencies.readKickOff||typeof access.features?.evidenceScore!=='boolean'||typeof access.features?.macroHeadlines!=='boolean'))return NextResponse.json({error:'Dashboard data unavailable'},{status:500});
    const read=(signal:AbortSignal):Promise<DashboardChartWorkspaceViewModel|KickOffDashboardViewModelV1|null>=>access==='focus_plan'?dependencies.readDashboard(allowedAsset,signal):dependencies.readKickOff!(allowedAsset,signal,access.features);
    const admitted=await dependencies.admit(subject,read);if(admitted.ok===false)return NextResponse.json({error:admitted.status===429?'Request limit reached':'Dashboard data unavailable'},{status:admitted.status});if(!admitted.value)return NextResponse.json({error:'Dashboard data unavailable'},{status:503});return NextResponse.json(admitted.value);
  }catch(error){if(error instanceof Error&&error.message==='UNAUTHORIZED')return NextResponse.json({error:'Unauthorized'},{status:401});if(error instanceof Error&&error.message==='ONBOARDING_REQUIRED')return NextResponse.json({error:'Unauthorized'},{status:403});return NextResponse.json({error:'Dashboard data unavailable'},{status:500});}}
}
