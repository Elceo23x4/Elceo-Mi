import { validateZoneSignificance } from '@elceo/schemas';
import type { CanonicalAssetSymbol, Timeframe, ZoneSignificance } from '@elceo/types';

export interface ReasoningZoneInputProvider {
  loadZones(asset: CanonicalAssetSymbol, timeframe: Timeframe, asOf: string): Promise<ZoneSignificance[]>;
}

export class EmptyReasoningZoneInputProvider implements ReasoningZoneInputProvider {
  async loadZones(_asset: CanonicalAssetSymbol, _timeframe: Timeframe, _asOf: string): Promise<ZoneSignificance[]> {
    return [];
  }
}

export function validateZonesOrThrow(zones: ZoneSignificance[]): ZoneSignificance[] {
  return zones.map((zone, index) => {
    const validated = validateZoneSignificance(zone, `zones[${index}].`);
    if (validated.ok === false) {
      throw new Error(`invalid zone payload: ${validated.errors.join('; ')}`);
    }
    return validated.value;
  });
}
