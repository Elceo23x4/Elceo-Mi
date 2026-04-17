import { providerPriority } from '@elceo/config';
import type { MacroContextProvider, MacroContextRecord } from '../interfaces/MacroContextProvider';

export class MacroContextCompositeAdapter {
  constructor(private readonly providers: Record<string, MacroContextProvider>) {}

  async getContext(countryCode: string): Promise<MacroContextRecord[]> {
    const result: MacroContextRecord[] = [];

    for (const providerKey of providerPriority.macroContext) {
      const provider = this.providers[providerKey];
      if (!provider) continue;
      try {
        const rows = await provider.getContext(countryCode);
        result.push(...rows);
      } catch {
        continue;
      }
    }

    return result;
  }
}
