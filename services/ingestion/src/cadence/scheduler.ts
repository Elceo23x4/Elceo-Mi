import { ingestionCadenceMinutes } from '@elceo/config';

export type PipelineName = 'market' | 'macro' | 'news' | 'geopolitics' | 'extraction' | 'macroContext';

const cadenceByPipeline: Record<PipelineName, number> = {
  market: ingestionCadenceMinutes.marketQuotes,
  macro: ingestionCadenceMinutes.macroCalendar,
  news: ingestionCadenceMinutes.news,
  geopolitics: ingestionCadenceMinutes.geopolitics,
  extraction: ingestionCadenceMinutes.extraction,
  macroContext: ingestionCadenceMinutes.macroContext
};

export function nextRunAt(pipeline: PipelineName, from = new Date()): Date {
  return new Date(from.getTime() + cadenceByPipeline[pipeline] * 60_000);
}
