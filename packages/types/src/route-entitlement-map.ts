export type RouteEntitlementPolicy =
  | 'public_safe'
  | 'authenticated_basic'
  | 'kick_off_allowed'
  | 'focus_plan_required'
  | 'subscription_required_on_expiry'
  | 'admin_read_required'
  | 'admin_ops_required'
  | 'super_admin_required'
  | 'internal_only'
  | 'public_seo_safe'
  | 'blocked_live_activation'
  | 'payment_readiness_required'
  | 'notification_preference_owner_only'
  | 'no_product_entitlement_required'
  | 'needs_follow_up';

export type RouteEntitlementFeatureKey =
  | 'dashboard.chart' | 'dashboard.evidence_score' | 'dashboard.macro_headlines' | 'journal.page'
  | 'dashboard.full_cognition' | 'dashboard.news_narratives' | 'dashboard.risk_liquidity' | 'dashboard.contradiction_panel' | 'dashboard.confidence_decomposition' | 'dashboard.provider_readiness'
  | 'market_evidence.full_feed' | 'market_evidence.cognition_snapshot' | 'market_evidence.weighted_evidence'
  | 'portfolio.advanced' | 'journal.deep_analysis' | 'notification.advanced_preferences'
  | 'admin.metrics' | 'admin.operator_inspection' | 'admin.provider_activation' | 'admin.scheduled_ingestion' | 'admin.seo_preview' | 'admin.observability' | 'super_admin.commercial_controls'
  | 'checkout.focus_plan_prepare' | 'payment.korapay_checkout_readiness'
  | 'seo.public_contract_feed' | 'glossary.asset_explainer' | 'sitemap.robots.canonical';

export type RouteEntitlementRecord = { method: string; path: string; policy: RouteEntitlementPolicy; featureKey: RouteEntitlementFeatureKey | null; sensitivity: 'low'|'medium'|'high'|'critical'; requiredGuard: string; };
