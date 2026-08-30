import type { DashboardChartWorkspaceViewModel,KickOffDashboardViewModelV1 } from '@elceo/types';
import type { DashboardCommercialAccess } from './dashboard-commercial-authority';

type Features={evidenceScore:boolean;macroHeadlines:boolean};
export type DashboardPageExperience={kind:'denied'}|{kind:'warming'}|{kind:'kick_off';model:KickOffDashboardViewModelV1}|{kind:'focus_plan';workspace:DashboardChartWorkspaceViewModel};

/** Production page orchestration. Kick Off and denied branches return before the premium alert dependency. */
export async function resolveDashboardPageExperience(input:{userId:string;asset:string;access:DashboardCommercialAccess;readDashboard:(asset:string,signal:AbortSignal)=>Promise<DashboardChartWorkspaceViewModel|null>;readKickOff?:(asset:string,signal:AbortSignal,features:Features)=>Promise<KickOffDashboardViewModelV1|null>;evaluatePremiumAlerts:(input:{userId:string;current:DashboardChartWorkspaceViewModel})=>Promise<unknown>}):Promise<DashboardPageExperience>{
  if(input.access==='denied')return{kind:'denied'};
  const signal=new AbortController().signal;
  if(input.access!=='focus_plan'){
    if(!input.readKickOff||typeof input.access.features?.evidenceScore!=='boolean'||typeof input.access.features?.macroHeadlines!=='boolean')return{kind:'denied'};
    const model=await input.readKickOff(input.asset,signal,input.access.features);return model?{kind:'kick_off',model}:{kind:'warming'};
  }
  const workspace=await input.readDashboard(input.asset,signal);if(!workspace)return{kind:'warming'};await input.evaluatePremiumAlerts({userId:input.userId,current:workspace});return{kind:'focus_plan',workspace};
}
