import { runSubscriptionEntitlementTests } from './subscription-entitlement.test.js';

void runSubscriptionEntitlementTests().then(() => {
  console.log('billing tests passed');
});
