# Scheduled ingestion replay execution (C6-A8B)

- Replay execution reuses existing scheduled-ingestion contracts, including `ScheduledIngestionRunRecord` and `ScheduledIngestionRunReport`.
- Replay accepts an existing run ID, validates eligibility, reconstructs deterministic fixture dry-run execution from original metadata, and writes a new replay run.
- Replay metadata fields are additive on existing run records: `replayOfRunId`, `originalJobId`, `originalExecutionMode`, `replayMode`, `replayedAt`.
- Replay failure states are deterministic and persisted as blocked runs with explicit error codes.
- Live replay modes remain blocked; no API key or live-provider paths were introduced.
- Persistence remains memory + SQL where already supported.
