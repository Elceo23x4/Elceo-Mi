export type PaidBillingInterval = 'monthly'|'quarterly'|'yearly';

/** Adds a commercial calendar interval in UTC, clamping to the destination month's last day. */
export function fixedPaidPeriod(anchorIso:string, interval:PaidBillingInterval){
 const start=new Date(anchorIso);if(!Number.isFinite(start.getTime()))throw new Error('provider_success_time_invalid');
 const months=interval==='monthly'?1:interval==='quarterly'?3:12;
 const year=start.getUTCFullYear(),month=start.getUTCMonth()+months,day=start.getUTCDate();
 const lastDay=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 const end=new Date(start);end.setUTCDate(1);end.setUTCFullYear(year,month);end.setUTCDate(Math.min(day,lastDay));
 return {currentPeriodStart:start.toISOString(),currentPeriodEnd:end.toISOString()};
}
