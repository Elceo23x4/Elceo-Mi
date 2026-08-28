Object.assign(process.env, { ELCEO_ALLOW_TEST_COMMERCIAL_SNAPSHOT: '1' });

import('./route-runtime.test.js').then(({ runRouteRuntimeTests }) => runRouteRuntimeTests())
  .then(() => import('./d1c-route-consumer-acceptance.test.js'))
  .then(({ runD1cRouteConsumerAcceptance }) => runD1cRouteConsumerAcceptance())
  .then(() => import('./backend-authority-closure.test.js'))
  .then(({ runBackendAuthorityClosureAcceptance }) => runBackendAuthorityClosureAcceptance())
  .then(() => {
    console.log('web route runtime tests passed');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
