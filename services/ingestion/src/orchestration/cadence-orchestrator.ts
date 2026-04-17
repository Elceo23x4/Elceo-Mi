import { nextRunAt, type PipelineName } from '../cadence/scheduler';
import { runIngestionTick } from '../worker';

const nextRunByPipeline = new Map<PipelineName, Date>();

export async function runCadenceCycle(now = new Date()): Promise<void> {
  const pipelines: PipelineName[] = ['market', 'macro', 'news', 'geopolitics', 'extraction', 'macroContext'];

  for (const pipeline of pipelines) {
    const next = nextRunByPipeline.get(pipeline);
    if (!next || next <= now) {
      await runIngestionTick();
      nextRunByPipeline.set(pipeline, nextRunAt(pipeline, now));
    }
  }
}

export function getCadenceSnapshot(): Record<string, string> {
  return Object.fromEntries(Array.from(nextRunByPipeline.entries()).map(([k, v]) => [k, v.toISOString()]));
}
