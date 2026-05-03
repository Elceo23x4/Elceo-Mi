export type TreasuryFixtureRequest = { providerId: string; region: string; capability: 'real_yield_series'|'bond_auction_result'|'debt_supply_calendar'; requestedAt: string; };
export type RealYieldRow = { region: string; maturity: string; observedAt: string; value: number; };
export type BondAuctionRow = { issuer: string; region: string; auctionDate: string; maturity: string; yieldAwarded: number; bidToCover: number | null; amountOffered: number | null; amountAccepted: number | null; currency: string | null; };
export type DebtSupplyCalendarRow = { issuer: string; region: string; announcementDate: string; auctionDate: string | null; maturity: string; amountExpected: number | null; currency: string; };
export type TreasuryFixtureResponse = { request: TreasuryFixtureRequest; realYieldRows: RealYieldRow[]; auctionRows: BondAuctionRow[]; debtSupplyRows: DebtSupplyCalendarRow[]; };
