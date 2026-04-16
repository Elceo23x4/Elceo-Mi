<<<<<<< HEAD
import type { MacroContextProvider, MacroContextRecord } from '../interfaces/MacroContextProvider';

export class ImfMacroContextAdapter implements MacroContextProvider {
  readonly providerId = 'imf';

  async getContext(countryCode: string): Promise<MacroContextRecord[]> {
    return [{ providerId: this.providerId, country: countryCode, metric: 'gdp_growth', value: 0, period: 'latest' }];
  }
}
=======
export {};
>>>>>>> origin/main
