export type MacroContextRecord = {
  providerId: string;
  country: string;
  metric: string;
  value: number;
  period: string;
};

export interface MacroContextProvider {
  readonly providerId: string;
  getContext(countryCode: string): Promise<MacroContextRecord[]>;
}
