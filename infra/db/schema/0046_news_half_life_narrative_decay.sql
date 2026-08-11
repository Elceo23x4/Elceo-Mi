-- 0046_news_half_life_narrative_decay: observed, interval-censored narrative persistence.
CREATE TABLE IF NOT EXISTS narrative_continuation_observations (
 observation_id TEXT CONSTRAINT narrative_continuation_observations_pkey PRIMARY KEY,
 policy_version TEXT NOT NULL CONSTRAINT narrative_continuation_observations_policy_check CHECK(policy_version='narrative-decay-v1'),
 expectation_id TEXT NOT NULL CONSTRAINT narrative_continuation_observations_expectation_fkey REFERENCES app_expectation_records(expectation_id) ON DELETE RESTRICT,
 event_release_id TEXT NOT NULL, release_version TEXT NOT NULL,
 source_event_evaluation_id TEXT NOT NULL CONSTRAINT narrative_continuation_observations_event_fkey REFERENCES app_event_reality_evaluations(event_evaluation_id) ON DELETE RESTRICT,
 asset TEXT NOT NULL, observed_at TIMESTAMPTZ NOT NULL, available_at TIMESTAMPTZ NOT NULL, evidence_cutoff_at TIMESTAMPTZ NOT NULL,
 window_start_at TIMESTAMPTZ NOT NULL, window_end_at TIMESTAMPTZ NOT NULL,
 cognition_snapshot_id TEXT NULL CONSTRAINT narrative_continuation_observations_cognition_fkey REFERENCES app_cognition_snapshots(snapshot_id) ON DELETE RESTRICT,
 canonical_payload JSONB NOT NULL, canonical_payload_hash TEXT NOT NULL CONSTRAINT narrative_continuation_observations_payload_hash_key UNIQUE, created_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT narrative_continuation_observations_cutoff_check CHECK(observed_at<=available_at AND available_at<=evidence_cutoff_at AND window_start_at<=window_end_at AND window_end_at<=evidence_cutoff_at AND created_at<=evidence_cutoff_at),
 CONSTRAINT narrative_continuation_observations_lineage_key UNIQUE(observation_id,expectation_id,source_event_evaluation_id,asset)
);
CREATE TABLE IF NOT EXISTS narrative_decay_evaluations (
 narrative_decay_evaluation_id TEXT CONSTRAINT narrative_decay_evaluations_pkey PRIMARY KEY,
 policy_version TEXT NOT NULL CONSTRAINT narrative_decay_evaluations_policy_check CHECK(policy_version='narrative-decay-v1'),
 source_event_evaluation_id TEXT NOT NULL CONSTRAINT narrative_decay_evaluations_event_fkey REFERENCES app_event_reality_evaluations(event_evaluation_id) ON DELETE RESTRICT,
 source_expectation_id TEXT NOT NULL CONSTRAINT narrative_decay_evaluations_expectation_fkey REFERENCES app_expectation_records(expectation_id) ON DELETE RESTRICT,
 source_analog_retrieval_id TEXT NULL CONSTRAINT narrative_decay_evaluations_analog_fkey REFERENCES app_historical_analog_retrievals(retrieval_id) ON DELETE RESTRICT,
 narrative_family_id TEXT NOT NULL, narrative_version_id TEXT NOT NULL, asset TEXT NOT NULL, event_kind TEXT NOT NULL, indicator_category TEXT NOT NULL, revision_family TEXT NOT NULL,
 evidence_cutoff_at TIMESTAMPTZ NOT NULL, narrative_as_of TIMESTAMPTZ NOT NULL,
 narrative_state TEXT NULL CONSTRAINT narrative_decay_evaluations_state_check CHECK(narrative_state IS NULL OR narrative_state IN('active','decaying','expired')),
 evidence_sufficiency TEXT NOT NULL CONSTRAINT narrative_decay_evaluations_sufficiency_check CHECK(evidence_sufficiency IN('sufficient','insufficient_data','provenance_limited')),
 raw_persistence_score NUMERIC(7,4) NOT NULL CONSTRAINT narrative_decay_evaluations_raw_score_check CHECK(raw_persistence_score BETWEEN 0 AND 100),
 evidence_coverage_ratio NUMERIC(7,4) NOT NULL CONSTRAINT narrative_decay_evaluations_coverage_check CHECK(evidence_coverage_ratio BETWEEN 0 AND 1),
 evidence_qualified_persistence_score NUMERIC(7,4) NOT NULL CONSTRAINT narrative_decay_evaluations_qualified_score_check CHECK(evidence_qualified_persistence_score BETWEEN 0 AND 100),
 half_life_status TEXT NOT NULL CONSTRAINT narrative_decay_evaluations_half_life_check CHECK(half_life_status IN('observed_interval','not_reached','insufficient_data')),
 canonical_payload JSONB NOT NULL, canonical_payload_hash TEXT NOT NULL CONSTRAINT narrative_decay_evaluations_payload_hash_key UNIQUE, created_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT narrative_decay_evaluations_cutoff_check CHECK(narrative_as_of<=evidence_cutoff_at AND created_at<=evidence_cutoff_at),
 CONSTRAINT narrative_decay_evaluations_identity_key UNIQUE(narrative_version_id,evidence_cutoff_at,canonical_payload_hash)
);
CREATE TABLE IF NOT EXISTS narrative_decay_evaluation_observations (
 narrative_decay_evaluation_id TEXT NOT NULL CONSTRAINT narrative_decay_evaluation_observations_evaluation_fkey REFERENCES narrative_decay_evaluations(narrative_decay_evaluation_id) ON DELETE RESTRICT,
 observation_id TEXT NOT NULL CONSTRAINT narrative_decay_evaluation_observations_observation_fkey REFERENCES narrative_continuation_observations(observation_id) ON DELETE RESTRICT,
 CONSTRAINT narrative_decay_evaluation_observations_pkey PRIMARY KEY(narrative_decay_evaluation_id,observation_id)
);
CREATE TABLE IF NOT EXISTS narrative_decay_evaluation_event_versions (
 narrative_decay_evaluation_id TEXT NOT NULL CONSTRAINT narrative_decay_evaluation_event_versions_evaluation_fkey REFERENCES narrative_decay_evaluations(narrative_decay_evaluation_id) ON DELETE RESTRICT,
 event_evaluation_id TEXT NOT NULL CONSTRAINT narrative_decay_evaluation_event_versions_event_fkey REFERENCES app_event_reality_evaluations(event_evaluation_id) ON DELETE RESTRICT,
 CONSTRAINT narrative_decay_evaluation_event_versions_pkey PRIMARY KEY(narrative_decay_evaluation_id,event_evaluation_id)
);
CREATE INDEX IF NOT EXISTS narrative_continuation_observations_lineage_idx ON narrative_continuation_observations(expectation_id,event_release_id,release_version,window_end_at);
CREATE INDEX IF NOT EXISTS narrative_decay_evaluations_report_idx ON narrative_decay_evaluations(asset,event_kind,indicator_category,revision_family,policy_version,created_at);
