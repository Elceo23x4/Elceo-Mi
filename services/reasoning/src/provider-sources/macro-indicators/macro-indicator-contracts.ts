export type MacroIndicatorFixtureRequest={providerId:string;region:string|null;capability:string;requestedAt:string};
export type MacroIndicatorRow={region:string;countryOrBloc:string;indicatorName:string;indicatorCategory:'inflation'|'labor_market'|'growth_activity'|'economic_indicator';observedAt:string;period:string;actual:number;consensus:number|null;previous:number|null;unit:string|null};
export type MacroSurpriseRow={region:string;indicatorName:string;observedAt:string;actual:number;consensus:number|null;previous:number|null;surprise:number};
export type MacroIndicatorFixtureResponse={request:MacroIndicatorFixtureRequest;indicatorRows:MacroIndicatorRow[];surpriseRows:MacroSurpriseRow[]};
