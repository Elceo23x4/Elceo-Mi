import type { MacroContextProvider, MacroContextRecord } from '../interfaces/MacroContextProvider';

export class OecdMacroContextAdapter implements MacroContextProvider {
  readonly providerId = 'oecd';

  async getContext(countryCode: string): Promise<MacroContextRecord[]> {
    return [{ providerId: this.providerId, country: countryCode, metric: 'policy_rate', value: 0, period: 'latest' }];
  }
}
