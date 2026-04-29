export type ElceoPlanKind = 'free' | 'premium' | 'admin_internal';
export type ElceoAccountState = 'active' | 'suspended' | 'restricted' | 'canceled';
export type ElceoFeatureKey =
  | 'workspace.read' | 'workspace.refresh' | 'journal.read' | 'journal.write' | 'journal.influence.generate'
  | 'portfolio.read' | 'portfolio.write' | 'portfolio.snapshot.generate' | 'analytics.read' | 'analytics.generate'
  | 'coaching.read' | 'coaching.generate' | 'notifications.read' | 'notifications.write'
  | 'notifications.targets.manage' | 'notifications.subscriptions.manage' | 'notifications.delivery.dispatch'
  | 'refresh.run' | 'admin.read' | 'admin.ops' | 'data.extended_macro' | 'data.cot' | 'data.central_bank_liquidity'
  | 'data.bank_health' | 'data.bank_earnings' | 'data.real_yields' | 'data.credit_stress' | 'data.auctions'
  | 'data.volatility_surface' | 'data.cross_market_rates' | 'data.macro_surprise_history';
export type FeatureAccessLevel = 'allowed' | 'blocked' | 'limited';
export type UsageCounterKey = 'workspace.refresh.run'|'journal.case.create'|'analytics.generate'|'coaching.generate'|'portfolio.snapshot.generate'|'notifications.verification.issue'|'refresh.run';
export type UsagePeriod = 'daily' | 'weekly' | 'monthly';
export type PlanUsageLimit = { counterKey: UsageCounterKey; period: UsagePeriod; maxCount: number };
export type PlanEntitlementProfile = { planKind: ElceoPlanKind; accountState: ElceoAccountState; allowedFeatures: ElceoFeatureKey[]; limitedFeatures: Array<{feature: ElceoFeatureKey; limitCounterKey: UsageCounterKey | null}>; blockedFeatures: ElceoFeatureKey[]; usageLimits: PlanUsageLimit[]; generatedAt: string };
export type FeatureAccessDecision = { decisionId:string; feature:ElceoFeatureKey; subjectKind:'user'; subjectId:string; planKind:ElceoPlanKind; accountState:ElceoAccountState; accessLevel:FeatureAccessLevel; reasonCode:string; usageCounterKey:UsageCounterKey|null; currentUsage:number|null; limitMax:number|null; decidedAt:string };
export type PersistableUsageCounter = { counterId:string; subjectKind:'user'; subjectId:string; counterKey:UsageCounterKey; period:UsagePeriod; periodStart:string; periodEnd:string; count:number; updatedAt:string };
export type ElceoAccountEntitlementState = { subjectKind:'user'; subjectId:string; planKind:ElceoPlanKind; accountState:ElceoAccountState; planStartedAt:string|null; planEndsAt:string|null; trialEndsAt:string|null; internalOverride:boolean; updatedAt:string };
