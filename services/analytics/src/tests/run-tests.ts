import { runAnalyticsCoreTests } from './analytics-core.test.js';
import { runCoachingCoreTests } from './coaching-core.test.js';

runAnalyticsCoreTests()
  .then(() => runCoachingCoreTests())
  .then(() => {
    console.log('analytics tests passed');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
