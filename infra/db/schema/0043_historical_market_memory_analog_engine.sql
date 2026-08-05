CREATE TABLE IF NOT EXISTS app_historical_analog_memory (
  analog_memory_id text PRIMARY KEY,
  source_event_evaluation_id text NOT NULL REFERENCES app_event_reality_evaluations(event_evaluation_id),
  source_expectation_id text NOT NULL,
  source_event_instance_key text NOT NULL,
  source_asset text NOT NULL,
  canonical_asset_family text NOT NULL,
  event_kind text NOT NULL,
  indicator_kind text NOT NULL,
  indicator_category text NOT NULL,
  memory_indexed_at timestamptz NOT NULL,
  available_at timestamptz NOT NULL,
  feature_policy_version text NOT NULL,
  feature_content_hash text NOT NULL,
  stage_feature_timeline_hash text NOT NULL,
  assessment_evidence_hash text NOT NULL,
  outcome_context_hash text NOT NULL,
  audit_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (source_event_evaluation_id, feature_policy_version)
);
CREATE TABLE IF NOT EXISTS app_historical_analog_retrievals (
  retrieval_id text PRIMARY KEY,
  query_event_evaluation_id text NOT NULL REFERENCES app_event_reality_evaluations(event_evaluation_id),
  query_event_instance_key text NOT NULL,
  query_cutoff_at timestamptz NOT NULL,
  retrieval_policy_version text NOT NULL,
  feature_policy_version text NOT NULL,
  query_feature_hash text NOT NULL,
  memory_snapshot_hash text NOT NULL,
  ranking_memory_snapshot_hash text NOT NULL,
  outcome_attachment_snapshot_hash text NOT NULL,
  evidence_sufficiency text NOT NULL CHECK (evidence_sufficiency IN ('sufficient','sparse','insufficient_feature_overlap','provenance_limited','no_comparable_history')),
  audit_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (query_event_evaluation_id, query_cutoff_at, retrieval_policy_version, feature_policy_version, query_feature_hash, ranking_memory_snapshot_hash, outcome_attachment_snapshot_hash)
);
CREATE TABLE IF NOT EXISTS app_historical_analog_retrieval_matches (
  retrieval_id text NOT NULL REFERENCES app_historical_analog_retrievals(retrieval_id),
  rank integer NOT NULL CHECK (rank > 0),
  analog_memory_id text NOT NULL REFERENCES app_historical_analog_memory(analog_memory_id),
  source_event_evaluation_id text NOT NULL REFERENCES app_event_reality_evaluations(event_evaluation_id),
  similarity_score numeric NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 100),
  feature_coverage_ratio numeric NOT NULL CHECK (feature_coverage_ratio >= 0 AND feature_coverage_ratio <= 1),
  audit_json jsonb NOT NULL,
  PRIMARY KEY (retrieval_id, rank),
  UNIQUE (retrieval_id, analog_memory_id)
);
