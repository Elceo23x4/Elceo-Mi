import { runRouteRuntimeTests } from './route-runtime.test.js';

runRouteRuntimeTests()
  .then(() => {
    console.log('web route runtime tests passed');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
