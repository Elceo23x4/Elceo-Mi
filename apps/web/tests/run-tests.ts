Object.assign(process.env, { ELCEO_ALLOW_TEST_COMMERCIAL_SNAPSHOT: '1' });

import('./route-runtime.test.js').then(({ runRouteRuntimeTests }) => runRouteRuntimeTests())
  .then(() => {
    console.log('web route runtime tests passed');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
