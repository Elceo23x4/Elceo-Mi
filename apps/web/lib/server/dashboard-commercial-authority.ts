import { evaluateCommercialFeatureAccess } from '@elceo/application-state';
import type { UserCommercialEntitlementSnapshot } from '@elceo/types';

export type DashboardCommercialAccess='focus_plan'|'denied'|{access:'kick_off';features:{evidenceScore:boolean;macroHeadlines:boolean}};

/** One server-owned commercial meaning shared by the dashboard page and API. */
export function resolveDashboardCommercialAccess(snapshot:UserCommercialEntitlementSnapshot,evaluate:typeof evaluateCommercialFeatureAccess=evaluateCommercialFeatureAccess):DashboardCommercialAccess{
  if(evaluate({snapshot,featureKey:'premium.full_access'}).decision==='allow')return'focus_plan';
  if(evaluate({snapshot,featureKey:'dashboard.chart'}).decision!=='allow')return'denied';
  return{access:'kick_off',features:{evidenceScore:evaluate({snapshot,featureKey:'dashboard.evidence_score'}).decision==='allow',macroHeadlines:evaluate({snapshot,featureKey:'dashboard.macro_headlines'}).decision==='allow'}};
}
