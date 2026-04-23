# Reasoning Chart Projection Enrichment (C3-C)

## Purpose

C3-C replaces placeholder chart linkage behavior with deterministic, auditable evidence anchoring and projection enrichment.

This layer does **not** render charts. It produces richer chart-intelligence data for downstream consumers.

## Rules summary

- deterministic zone sorting and candidate selection
- deterministic direction-to-zone compatibility mapping
- deterministic proximity and link score formulas
- top-3 anchor thresholding with conservative fallback
- deterministic confluence summary extraction
- deterministic price-level emphasis ordering and exact dedupe
- deterministic annotation/marker construction
- deterministic explanation enrichment for confluence hints

## Scope boundary

C3-C enriches reasoning outputs only.
It does not implement notification policy or frontend chart rendering.
