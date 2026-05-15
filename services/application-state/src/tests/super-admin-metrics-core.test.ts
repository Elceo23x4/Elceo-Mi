import { strict as assert } from 'node:assert';
import { validateSuperAdminMetricsSnapshot } from '@elceo/schemas';
import { getSuperAdminMetricsCoverageReport, getSuperAdminMetricsSnapshot } from '../super-admin-metrics/index';

export const runSuperAdminMetricsCoreTests=()=>{
  const a=getSuperAdminMetricsSnapshot({period:'all_time',asOf:'2026-05-15T00:00:00.000Z'});
  const b=getSuperAdminMetricsSnapshot({period:'all_time',asOf:'2026-05-15T00:00:00.000Z'});
  assert.deepEqual(a,b);
  assert.equal(validateSuperAdminMetricsSnapshot(a).ok,true);
  assert.equal(a.users.totalUsers>=a.users.activeUsers+a.users.suspendedUsers+a.users.bannedUsers,true);
  assert.equal(a.trials.kickOffTrialUsers>0,true);
  assert.equal(a.trials.expiredKickOffTrialUsers>0,true);
  assert.equal(a.subscriptions.subscribedUsers>0,true);
  assert.equal(a.subscriptions.activePaidUsers>0,true);
  assert.equal(a.gifts.giftedFocusPlanUsers>0,true);
  assert.equal(a.gifts.retractedGifts>0,true);
  assert.equal(a.planIntervalSplit.monthlyCount>0&&a.planIntervalSplit.quarterlyCount>0&&a.planIntervalSplit.yearlyCount>0,true);
  assert.equal(a.revenue.currency,'USD');
  assert.equal(['fixture_only','estimated'].includes(a.revenue.dataStatus),true);
  assert.equal(a.paymentReadiness.socialIdentifierCompleteUsers>0,true);
  assert.equal(a.restrictions.bannedUsers>=0&&a.restrictions.suspendedUsers>=0,true);
  assert.equal(JSON.stringify(a).toLowerCase().includes('ip_ban'),false);
  assert.equal(/token|secret|payload/i.test(JSON.stringify(a)),false);
  assert.equal(/buy|sell|hold|profit promise/i.test(JSON.stringify(a)),false);
  const c=getSuperAdminMetricsCoverageReport();
  assert.equal(c.includesIpBanMetrics,false);
};
