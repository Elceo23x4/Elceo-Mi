import type { MacroContextProvider, MacroContextRecord } from '../interfaces/MacroContextProvider';

export class WorldBankMacroContextAdapter implements MacroContextProvider {
  readonly providerId = 'worldbank';

  async getContext(countryCode: string): Promise<MacroContextRecord[]> {
    return [{ providerId: this.providerId, country: countryCode, metric: 'inflation', value: 0, period: 'latest' }];
  }
}
