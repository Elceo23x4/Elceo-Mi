export type CommoditiesMetalsFixtureCapability = 'energy_commodity_series' | 'precious_metals_flow_indicator';
export type CommoditiesMetalsFixtureRequest = { providerId: string; region: string | null; asset: string | null; capability: CommoditiesMetalsFixtureCapability; requestedAt: string; };
export type EnergyCommodityRow = { asset: string; region: string; observedAt: string; commodityName: string; value: number; unit: string; providerId: string | null; };
export type PreciousMetalsFlowRow = { asset: string; region: string; observedAt: string; flowType: string; value: number; unit: string; providerId: string | null; };
export type CommoditiesMetalsFixtureResponse = { request: CommoditiesMetalsFixtureRequest; energyRows: EnergyCommodityRow[]; metalsFlowRows: PreciousMetalsFlowRow[]; };
