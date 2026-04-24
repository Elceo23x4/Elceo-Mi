import { runAnalyticsCoreTests } from './analytics-core.test.js';

runAnalyticsCoreTests()
  .then(() => {
    console.log('analytics tests passed');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
