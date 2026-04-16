import { linearDecayScore } from '../shared/decay';

export function computeFreshness(eventClass: 'macro_event' | 'news_article' | 'geopolitical_event' | 'market_quote', elapsedMinutes: number): number {
  const decayWindow =
    eventClass === 'market_quote' ? 15 : eventClass === 'news_article' ? 360 : eventClass === 'macro_event' ? 480 : 720;

  return linearDecayScore(elapsedMinutes, decayWindow);
}
