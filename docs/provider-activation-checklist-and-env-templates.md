# C6-A11G — Provider Activation Checklist + Environment Templates

- Live activation remains blocked by default (`ELCEO_LIVE_PROVIDER_ACTIVATION=false`).
- Environment templates (`.env.example`, `.env.staging.example`, `.env.production.example`) contain placeholders only.
- No API keys, payment keys, or notification credentials are committed.
- Smoke tests in this batch are plans only and are not executed against live providers.
- Provider activation requires manual approval gates and rollback readiness.
- C6-A11H remains scoped for SEO/programmatic contract feeds.
