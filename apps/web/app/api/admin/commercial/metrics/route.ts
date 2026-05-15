import { validateSuperAdminMetricsQuery } from '@elceo/schemas';
import { withApiErrorBoundary, jsonError, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { requireFeatureAccess } from '@/lib/server/access';

const fixture={totalUsers:120,activeUsers:107,suspendedUsers:8,bannedUsers:5,subscribedUsers:52,activePaidUsers:45,expiredPaidUsers:7,resubscribedUsers:9,subscriptionRequiredUsers:68,kickOffTrialUsers:33,activeKickOffTrialUsers:18,expiredKickOffTrialUsers:15,giftedFocusPlanUsers:12,activeGifts:7,expiredGifts:3,retractedGifts:2,socialIdentifierCompleteUsers:95,missingSocialIdentifierUsers:25,paymentReadyUsers:90,paymentBlockedUsers:30,monthlyCount:29,quarterlyCount:14,yearlyCount:9,totalRevenue:3150,mrr:3150};
const snapshot=(period:'monthly'|'quarterly'|'yearly'|'all_time',asOf:string)=>({generatedAt:asOf,period,dataStatus:'fixture_only',users:{totalUsers:fixture.totalUsers,activeUsers:fixture.activeUsers,suspendedUsers:fixture.suspendedUsers,bannedUsers:fixture.bannedUsers},subscriptions:{subscribedUsers:fixture.subscribedUsers,activePaidUsers:fixture.activePaidUsers,expiredPaidUsers:fixture.expiredPaidUsers,resubscribedUsers:fixture.resubscribedUsers,subscriptionRequiredUsers:fixture.subscriptionRequiredUsers},trials:{kickOffTrialUsers:fixture.kickOffTrialUsers,activeKickOffTrialUsers:fixture.activeKickOffTrialUsers,expiredKickOffTrialUsers:fixture.expiredKickOffTrialUsers},revenue:{currency:'USD',dataStatus:'fixture_only',totalRevenue:fixture.totalRevenue,monthlyRecurringRevenue:fixture.mrr,revenueByInterval:{monthly:2030,quarterly:700,yearly:420},revenueByPlan:{kick_off:0,focus_plan:fixture.totalRevenue}},gifts:{giftedFocusPlanUsers:fixture.giftedFocusPlanUsers,activeGifts:fixture.activeGifts,expiredGifts:fixture.expiredGifts,retractedGifts:fixture.retractedGifts},restrictions:{suspendedUsers:fixture.suspendedUsers,bannedUsers:fixture.bannedUsers},paymentReadiness:{socialIdentifierCompleteUsers:fixture.socialIdentifierCompleteUsers,missingSocialIdentifierUsers:fixture.missingSocialIdentifierUsers,paymentReadyUsers:fixture.paymentReadyUsers,paymentBlockedUsers:fixture.paymentBlockedUsers},planIntervalSplit:{monthlyCount:fixture.monthlyCount,quarterlyCount:fixture.quarterlyCount,yearlyCount:fixture.yearlyCount},conversion:{totalUsers:fixture.totalUsers,subscribedUsers:fixture.subscribedUsers,activePaidUsers:fixture.activePaidUsers,kickOffTrialUsers:fixture.kickOffTrialUsers,conversionRate:Number((fixture.subscribedUsers/fixture.totalUsers).toFixed(4))}});

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.read', { request });
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const query = { period: url.searchParams.get('period') ?? 'all_time', asOf: url.searchParams.get('asOf') ?? new Date().toISOString() };
  const validated = validateSuperAdminMetricsQuery(query);
  if ('errors' in validated) return jsonError('validation_error', 'Validation failed', validated.errors, 400);
  return jsonSuccess({ snapshot: snapshot(validated.value.period, validated.value.asOf) });
});
