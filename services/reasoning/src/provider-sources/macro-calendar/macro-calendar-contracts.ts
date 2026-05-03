export type MacroCalendarFixtureRequest={providerId:string;region:string|null;requestedAt:string;startDate:string|null;endDate:string|null};
export type MacroCalendarEventRow={eventId:string;region:string;countryOrBloc:string;eventName:string;eventCategory:'inflation'|'labor_market'|'growth_activity'|'policy'|'other';scheduledFor:string;actual:number|null;consensus:number|null;previous:number|null;unit:string|null;importanceScore:number};
export type MacroCalendarFixtureResponse={request:MacroCalendarFixtureRequest;rows:MacroCalendarEventRow[]};
