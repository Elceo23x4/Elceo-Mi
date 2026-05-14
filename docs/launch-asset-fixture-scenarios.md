# C6-A2 Launch Asset Fixture Scenario Library

This document defines the C6-A2 fixture-only scenario library for launch assets.

- Scope: deterministic fixtures for reasoning/evidence-quality/weighting/cognition/scheduled-ingestion/frontend mock contracts.
- No live provider calls.
- No API keys.
- No secret material.
- C6-A3 will expand official macro adapter/schema shells.

## C6-A3 official macro shell update (2026-05-14)
- Added official macro source types/schemas + adapter shells for US, Eurozone/Germany, UK, Japan, and global institutions.
- Fixture/dry-run only; no live provider calls and no API keys.
- Live activation remains blocked-by-default for all official macro sources.
- C6-A4 remains next for news/extraction/filings shell expansion.

## C6-A3B Tier 1B FX expansion update (2026-05-14)
- Tier 1A core launch assets remain first priority and unchanged.
- Added fixture/source coverage for Tier 1B major FX expansion assets: AUD/USD, USD/CHF, NZD/USD, USD/CAD.
- Coverage remains fixture/dry-run only; no live API calls and no API keys connected.
- Live activation remains blocked by default; C6-A4 continues with news/extraction/filings shells.

- C6-A4: added fixture/dry-run news/extraction/filings shells (no live calls, no API keys, live-blocked by default; C6-A5 handles next expansion).

- C6-A5: Added crypto/risk/liquidity fixture shells (dry-run only, no live calls, no API keys; C6-A6 reserved for golden scenario tests).
