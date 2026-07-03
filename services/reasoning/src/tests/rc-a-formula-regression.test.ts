import assert from 'node:assert/strict';
import { resolveAssetContextualEvidenceDirection } from '../asset-direction-resolution/index.js';
import { resolveFxRelativeStrength } from '../fx-relative-strength/index.js';
import { normalizeMacroSurprise } from '../macro-surprise-normalization/index.js';
import { runMarketGoldenScenarioSuite } from '../golden-scenarios/index.js';

const expectedGoldenProjection = [
  {
    "scenarioId": "c6r9_us_cpi_upside_dxy_support",
    "pass": true,
    "observedDirection": "bullish",
    "expectedDirection": "bullish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "low"
  },
  {
    "scenarioId": "c6r9_us_cpi_upside_xau_pressure",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "bearish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "macro_vs_price_reaction",
      "rates_vs_gold"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "high"
  },
  {
    "scenarioId": "c6r9_us_cpi_upside_nasdaq_pressure",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "bearish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "low"
  },
  {
    "scenarioId": "c6r9_us_cpi_downside_eurusd_quote_relief",
    "pass": true,
    "observedDirection": "bullish",
    "expectedDirection": "bullish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict",
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_us_cpi_same_actual_higher_forecast_gbpusd",
    "pass": true,
    "observedDirection": "bullish",
    "expectedDirection": "bullish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict",
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_us_unemployment_above_forecast_labor_weakness",
    "pass": true,
    "observedDirection": "bearish",
    "expectedDirection": "bearish",
    "confidence": 4.337777777777781,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "low"
  },
  {
    "scenarioId": "c6r9_jobless_claims_above_forecast_labor_weakness",
    "pass": true,
    "observedDirection": "bearish",
    "expectedDirection": "bearish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict",
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_rate_decision_above_forecast_hawkish",
    "pass": true,
    "observedDirection": "bullish",
    "expectedDirection": "bullish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict",
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_rate_decision_below_forecast_dovish",
    "pass": true,
    "observedDirection": "bearish",
    "expectedDirection": "bearish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "low"
  },
  {
    "scenarioId": "c6r9_eurusd_ecb_hawkish_fed_neutral",
    "pass": true,
    "observedDirection": "bullish",
    "expectedDirection": "bullish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict",
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_gbpusd_boe_hawkish_us_growth_strong",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict",
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_usdjpy_fed_hawkish_boj_hawkish_conflict",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict",
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_usdchf_riskoff_safe_haven_conflict",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "safe_haven_conflict"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_audusd_china_demand_weakness",
    "pass": true,
    "observedDirection": "bearish",
    "expectedDirection": "bearish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict",
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_nzdusd_riskoff_pressure",
    "pass": true,
    "observedDirection": "bearish",
    "expectedDirection": "bearish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_usdcad_oil_shock_positive_for_cad_quote",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "bearish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "commodity_cross_asset",
      "fx_base_quote_conflict"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_nasdaq_bullish_vix_rising_tension",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 18.30275555555555,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "risk_vs_volatility"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_sp500_bullish_credit_stress_tension",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "risk_vs_credit"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_equities_bullish_breadth_deteriorates",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 17.854755555555556,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "equities_vs_breadth"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_xau_bullish_real_yields_usd_rising",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 9.300855555555557,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "rates_vs_gold"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "high"
  },
  {
    "scenarioId": "c6r9_btc_bullish_funding_overheated",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 20.146655555555554,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "crypto_vs_derivatives"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_btc_bullish_liquidity_deteriorates",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "crypto_vs_derivatives"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_de30_energy_shock_margin_pressure",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "bearish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "commodity_cross_asset"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_macro_bullish_confirmed_price_reaction",
    "pass": true,
    "observedDirection": "bullish",
    "expectedDirection": "bullish",
    "confidence": 33.33777777777778,
    "confidenceTier": "low",
    "contradictionFamilies": [],
    "priceReactionStatus": "confirmed",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "none"
  },
  {
    "scenarioId": "c6r9_macro_bullish_rejected_price_reaction",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 7.337777777777781,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "rejected",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "low"
  },
  {
    "scenarioId": "c6r9_macro_bullish_absorbed_price_reaction",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict",
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "absorbed",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_macro_bullish_reversed_price_reaction",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "macro_vs_price_reaction"
    ],
    "priceReactionStatus": "reversed",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "low"
  },
  {
    "scenarioId": "c6r9_official_macro_vs_unknown_scraped_source",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "bullish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "macro_vs_price_reaction",
      "source_disagreement"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "extraction_quality_low",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "provider_not_configured",
      "scraped_source_risk",
      "source_authority_low",
      "source_independence_unverified",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "low"
  },
  {
    "scenarioId": "c6r9_duplicate_same_headline_news_burst",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "source_disagreement"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "duplicate_source_risk",
      "extraction_quality_low",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_not_configured",
      "scraped_source_risk",
      "source_authority_low",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "low"
  },
  {
    "scenarioId": "c6r9_fixture_only_provider_high_extraction_capped",
    "pass": true,
    "observedDirection": "bullish",
    "expectedDirection": "bullish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [
      "fx_base_quote_conflict"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_fixture_only",
      "source_authority_low",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  },
  {
    "scenarioId": "c6r9_xau_missing_critical_dependency_gap",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "mixed",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "missing_critical_asset_dependency",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_fixture_only",
      "source_authority_low",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "none"
  },
  {
    "scenarioId": "c6r9_dxy_diagnostic_limited_basket_context",
    "pass": true,
    "observedDirection": "bullish",
    "expectedDirection": "bullish",
    "confidence": 0,
    "confidenceTier": "very_low",
    "contradictionFamilies": [],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "none"
  },
  {
    "scenarioId": "c6r9_vix_diagnostic_risk_context_limited",
    "pass": true,
    "observedDirection": "mixed",
    "expectedDirection": "bullish",
    "confidence": 35,
    "confidenceTier": "low",
    "contradictionFamilies": [
      "risk_vs_volatility"
    ],
    "priceReactionStatus": "unknown",
    "providerReliabilityWarnings": [
      "diagnostic_only_provider_context",
      "evidence_class_provider_mismatch",
      "partial_asset_dependency_coverage",
      "pending_empirical_reliability_backtesting",
      "pending_golden_scenario_expansion",
      "pending_live_provider_activation",
      "provider_activation_gap",
      "provider_dry_run_only",
      "unknown_provider"
    ],
    "requiredReasonCodesPresent": true,
    "requiredWarningsPresent": true,
    "observedSeverity": "moderate"
  }
] as const;

const m = (value: Record<string, unknown>) => JSON.stringify(value);

export function runRcAFormulaRegressionTests(): void {
  const fedDxy = resolveAssetContextualEvidenceDirection({asset:'dxy', evidenceClass:'central_bank_policy', metadataJson:m({direction:'hawkish',policyIssuerRegion:'united_states',driverKind:'central_bank_policy'}), policyIssuerRegion:'united_states'});
  assert.deepEqual({direction:fedDxy.resolvedDirection, confidence:fedDxy.confidence, warnings:fedDxy.warnings, reasons:fedDxy.reasonCodes}, {direction:'bullish', confidence:76, warnings:['pending_fx_relative_strength','requires_price_confirmation','pending_macro_surprise_normalization','provider_activation_gap'], reasons:['policy_tone_asset_context','causality_map_requirement']});
  const fedEur = resolveAssetContextualEvidenceDirection({asset:'eur_usd', evidenceClass:'central_bank_policy', metadataJson:m({direction:'hawkish',policyIssuerRegion:'united_states',driverKind:'central_bank_policy'}), policyIssuerRegion:'united_states'});
  assert.deepEqual({direction:fedEur.resolvedDirection, pressureTarget:fedEur.pressureTarget, confidence:fedEur.confidence}, {direction:'bearish', pressureTarget:'quote_currency', confidence:33});
  const ecbEur = resolveAssetContextualEvidenceDirection({asset:'eur_usd', evidenceClass:'central_bank_policy', metadataJson:m({direction:'hawkish',issuer:'ECB',region:'eurozone',driverKind:'central_bank_policy'})});
  assert.deepEqual({direction:ecbEur.resolvedDirection, pressureTarget:ecbEur.pressureTarget, confidence:ecbEur.confidence}, {direction:'bullish', pressureTarget:'base_currency', confidence:33});
  const missing = resolveAssetContextualEvidenceDirection({asset:'dxy', evidenceClass:'central_bank_policy', metadataJson:m({direction:'hawkish',driverKind:'central_bank_policy'})});
  assert.deepEqual({direction:missing.resolvedDirection, confidence:missing.confidence, unresolvedReason:missing.unresolvedReason}, {direction:'mixed', confidence:34, unresolvedReason:'policy_issuer_missing_or_unresolved'});
  const fxMissing = resolveFxRelativeStrength({pairAsset:'eur_usd', metadataJson:m({direction:'hawkish', issuer:'Fed'})});
  assert.deepEqual({pairDirection:fxMissing.pairDirection, confidence:fxMissing.confidence, tier:fxMissing.confidenceTier, warnings:fxMissing.warnings}, {pairDirection:'quote_strengthening', confidence:33, tier:'low', warnings:['missing_base_pressure','pending_macro_surprise_normalization','requires_price_confirmation','provider_activation_gap','relative_magnitude_missing']});
  const macro = normalizeMacroSurprise({ releaseId:'cpi', indicatorKind:'cpi_headline', currency:'USD', region:'US', actual:3.2, forecast:3, previous:3.1, unit:'percent'});
  assert.deepEqual({score:macro.normalizedSurpriseScore, direction:macro.surpriseDirection, meaning:macro.economicMeaning, confidence:macro.confidence, tier:macro.confidenceTier}, {score:40, direction:'upside_surprise', meaning:'hotter_inflation', confidence:64, tier:'medium'});
  const byId = Object.fromEntries(runMarketGoldenScenarioSuite({asOfIso:'2026-06-06T00:00:00.000Z'}).results.map((x)=>[x.scenarioId,x]));
  const contradictionCase = byId.c6r9_nasdaq_bullish_vix_rising_tension!;
  const confirmedCase = byId.c6r9_macro_bullish_confirmed_price_reaction!;
  const providerCase = byId.c6r9_fixture_only_provider_high_extraction_capped!;
  assert.deepEqual({families:contradictionCase.contradictionFamilies, severity:contradictionCase.observedSeverity, status:contradictionCase.pass}, {families:['risk_vs_volatility'], severity:'moderate', status:true});
  assert.deepEqual({confidence:confirmedCase.confidence, tier:confirmedCase.confidenceTier}, {confidence:33.33777777777778, tier:'low'});
  assert.deepEqual({status:confirmedCase.priceReactionStatus, confidence:confirmedCase.confidence}, {status:'confirmed', confidence:33.33777777777778});
  assert.deepEqual({warnings:providerCase.providerReliabilityWarnings}, {warnings:['diagnostic_only_provider_context','partial_asset_dependency_coverage','pending_empirical_reliability_backtesting','pending_golden_scenario_expansion','pending_live_provider_activation','provider_activation_gap','provider_fixture_only','source_authority_low','unknown_provider']});
  const projection = runMarketGoldenScenarioSuite({asOfIso:'2026-06-06T00:00:00.000Z'}).results.map((x)=>({scenarioId:x.scenarioId,pass:x.pass,observedDirection:x.observedDirection,expectedDirection:x.expectedDirection,confidence:x.confidence,confidenceTier:x.confidenceTier,contradictionFamilies:x.contradictionFamilies,priceReactionStatus:x.priceReactionStatus,providerReliabilityWarnings:x.providerReliabilityWarnings,requiredReasonCodesPresent:x.requiredReasonCodesPresent,requiredWarningsPresent:x.requiredWarningsPresent,observedSeverity:x.observedSeverity}));
  assert.equal(projection.length,33);
  assert.deepEqual(projection, expectedGoldenProjection);
}
