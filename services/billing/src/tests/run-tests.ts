import { runKoraPayReadinessTests } from './korapay-readiness.test.js';
import { runSubscriptionEntitlementTests } from './subscription-entitlement.test.js';

void Promise.all([runSubscriptionEntitlementTests(), runKoraPayReadinessTests()]).then(() => {
  console.log('billing tests passed');
});
