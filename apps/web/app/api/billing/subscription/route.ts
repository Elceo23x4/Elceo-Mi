import { NextResponse } from 'next/server';
import { requireAppUserState } from '../../../../lib/auth/session';
import { commercialCompatibilityPlan, evaluateUserCommercialEntitlement, resolveUserCommercialEntitlementSnapshot } from '@elceo/application-state';
export async function GET(){try{const{session}=await requireAppUserState();const snapshot=await resolveUserCommercialEntitlementSnapshot(session.user.id);return NextResponse.json({commercial:{planCode:snapshot.activePlanCode,status:evaluateUserCommercialEntitlement(snapshot),trialStartedAt:snapshot.trialStartedAt},compatibility:{planKind:commercialCompatibilityPlan(snapshot)}},{headers:{'cache-control':'no-store'}});}catch{return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'cache-control':'no-store'}})}}
