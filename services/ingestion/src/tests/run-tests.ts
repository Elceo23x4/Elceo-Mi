import { runSourceReliabilityTests } from './source-reliability.test.js';
import { runEventRecencyTests } from './event-recency.test.js';
import { runEventRelevanceTests } from './event-relevance.test.js';
import { runEventDedupeTests, runEventMergeTests } from './event-dedupe.test.js';
import { runCompositeEventIngestionTests } from './composite-event-ingestion.test.js';

async function run(): Promise<void> {
  runSourceReliabilityTests();
  runEventRecencyTests();
  runEventRelevanceTests();
  runEventDedupeTests();
  runEventMergeTests();
  await runCompositeEventIngestionTests();
  console.log('ingestion tests passed');
}

run();
