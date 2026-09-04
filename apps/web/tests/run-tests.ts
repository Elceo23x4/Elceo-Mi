Object.assign(process.env, { ELCEO_ALLOW_TEST_COMMERCIAL_SNAPSHOT: '1' });

import('./route-runtime.test.js').then(({ runRouteRuntimeTests }) => runRouteRuntimeTests())
  .then(() => import('./d1c-route-consumer-acceptance.test.js'))
  .then(({ runD1cRouteConsumerAcceptance }) => runD1cRouteConsumerAcceptance())
  .then(() => import('./kick-off-dashboard-acceptance.test.js'))
  .then(({ runKickOffDashboardAcceptance }) => runKickOffDashboardAcceptance())
  .then(() => import('./kick-off-final-authority-acceptance.test.js'))
  .then(({ runKickOffFinalAuthorityAcceptance }) => runKickOffFinalAuthorityAcceptance())
  .then(() => import('./notification-authority-contract.test.js'))
  .then(({ runNotificationAuthorityContractTests }) => runNotificationAuthorityContractTests())
  .then(() => import('./backend-authority-closure.test.js'))
  .then(({ runBackendAuthorityClosureAcceptance }) => runBackendAuthorityClosureAcceptance())
  .then(() => import('./billing-http-contract.test.js'))
  .then(({ runBillingHttpContractAcceptance }) => runBillingHttpContractAcceptance())
  .then(() => import('./pwa-icon-route.test.js'))
  .then(({ runPwaIconRouteTests }) => runPwaIconRouteTests())
  .then(() => import('./onesignal-browser-client.test.js'))
  .then(({ runOneSignalBrowserClientTests }) => runOneSignalBrowserClientTests())
  .then(() => import('./sentry-privacy-policy.test.js'))
  .then(({ runSentryPrivacyPolicyTests }) => runSentryPrivacyPolicyTests())
  .then(() => {
    console.log('web route runtime tests passed');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
