import { runChartIntelligenceTests } from './chart-intelligence.test.js';
import { runCanonicalDashboardProjectionTests } from './canonical-dashboard-projection.test.js';

runChartIntelligenceTests();
runCanonicalDashboardProjectionTests();
console.log('chart-intelligence deterministic contract tests passed');
