# Canonical candle observation boundary

Before this change, a typed `NormalizedCandle` existed before the canonical bridge, but canonical event persistence retained OHLC only in the unknown forensic `rawPayload`.

Canonical ingestion now adds a schema-validated `market_candle` observation to the backward-compatible `CanonicalEvent` envelope. Its semantic identity binds provider, canonical launch asset, canonical timeframe, and observation timestamp. Its content hash additionally binds OHLCV. Snapshot JSON therefore preserves deterministic typed candle truth without interpreting `rawPayload`; historical events without the additive field remain loadable but are not certified as candle truth.

This prerequisite does **not** implement dashboard materialization, activate providers, close IFP-8, or empirically calibrate market intelligence. Provider live operation remains disabled.
