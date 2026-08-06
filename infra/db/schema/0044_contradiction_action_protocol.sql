-- 0044_contradiction_action_protocol
-- IFP-3 Contradiction-to-Action Protocol immutable audit records.
CREATE TABLE IF NOT EXISTS contradiction_action_protocol_inputs (
  record_id TEXT CONSTRAINT contradiction_action_protocol_inputs_pkey PRIMARY KEY,
  event_evaluation_id TEXT NOT NULL CONSTRAINT contradiction_action_protocol_inputs_event_key UNIQUE CONSTRAINT contradiction_action_protocol_inputs_event_fkey REFERENCES app_event_reality_evaluations(event_evaluation_id) ON DELETE RESTRICT,
  expectation_id TEXT NOT NULL CONSTRAINT contradiction_action_protocol_inputs_expectation_fkey REFERENCES app_expectation_records(expectation_id) ON DELETE RESTRICT,
  asset TEXT NOT NULL CONSTRAINT contradiction_action_protocol_inputs_asset_check CHECK (length(asset) > 0),
  assessment_stage TEXT NOT NULL CONSTRAINT contradiction_action_protocol_inputs_stage_check CHECK (assessment_stage IN ('immediate','confirmation','follow_through')),
  assessment_evidence_hash TEXT NOT NULL CONSTRAINT contradiction_action_protocol_inputs_assessment_hash_check CHECK (length(assessment_evidence_hash) > 0),
  available_at TIMESTAMPTZ NOT NULL,
  evidence_cutoff_at TIMESTAMPTZ NOT NULL,
  normalized_input_hash TEXT NOT NULL,
  provider_reliability_supplied BOOLEAN NOT NULL,
  source_independence_verified BOOLEAN NOT NULL,
  provenance_classes TEXT[] NOT NULL,
  warnings TEXT[] NOT NULL DEFAULT '{}',
  limitations TEXT[] NOT NULL DEFAULT '{}',
  canonical_payload JSONB NOT NULL,
  canonical_payload_hash TEXT NOT NULL CONSTRAINT contradiction_action_protocol_inputs_payload_hash_key UNIQUE,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT contradiction_action_protocol_inputs_available_cutoff_check CHECK (available_at <= evidence_cutoff_at),
  CONSTRAINT contradiction_action_protocol_inputs_created_cutoff_check CHECK (created_at <= evidence_cutoff_at)
);
CREATE TABLE IF NOT EXISTS contradiction_action_protocol_records (
  protocol_decision_id TEXT PRIMARY KEY,
  policy_version TEXT NOT NULL CHECK (policy_version = 'contradiction-action-protocol-v1'),
  source_event_evaluation_id TEXT NOT NULL REFERENCES app_event_reality_evaluations(event_evaluation_id) ON DELETE RESTRICT,
  source_expectation_id TEXT NOT NULL REFERENCES app_expectation_records(expectation_id) ON DELETE RESTRICT,
  source_contradiction_input_id TEXT NOT NULL REFERENCES contradiction_action_protocol_inputs(record_id) ON DELETE RESTRICT,
  source_analog_retrieval_id TEXT NULL REFERENCES app_historical_analog_retrievals(retrieval_id) ON DELETE RESTRICT,
  source_asset TEXT NOT NULL,
  source_release_id TEXT NOT NULL,
  source_release_version TEXT NOT NULL,
  source_assessment_stage TEXT NOT NULL CHECK (source_assessment_stage IN ('immediate','confirmation','follow_through')),
  source_assessment_stage_order INTEGER NOT NULL CHECK (source_assessment_stage_order BETWEEN 1 AND 3),
  event_instance_key TEXT NOT NULL,
  contradiction_evidence_hash TEXT NOT NULL,
  invalidation_state_hash TEXT NOT NULL,
  analog_context_hash TEXT NULL,
  evidence_cutoff_at TIMESTAMPTZ NOT NULL,
  evidence_sufficiency TEXT NOT NULL CHECK (evidence_sufficiency IN ('sufficient','insufficient','provisional','provenance_limited','pending_confirmation','resolved')),
  protocol_state TEXT NOT NULL CHECK (protocol_state IN ('wait_for_confirmation','review_required','invalidate_thesis','escalate_review','archive_resolved')),
  transition_reasons TEXT[] NOT NULL,
  warnings TEXT[] NOT NULL DEFAULT '{}',
  limitations TEXT[] NOT NULL DEFAULT '{}',
  canonical_payload JSONB NOT NULL,
  canonical_payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (canonical_payload_hash),
  CHECK ((source_assessment_stage = 'immediate' AND source_assessment_stage_order = 1) OR (source_assessment_stage = 'confirmation' AND source_assessment_stage_order = 2) OR (source_assessment_stage = 'follow_through' AND source_assessment_stage_order = 3))
);
CREATE TABLE IF NOT EXISTS contradiction_action_protocol_evidence_refs (
  protocol_decision_id TEXT NOT NULL REFERENCES contradiction_action_protocol_records(protocol_decision_id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  reliability TEXT NOT NULL CHECK (reliability IN ('verified','replay','fixture','unverified')),
  PRIMARY KEY (protocol_decision_id, source_type, source_id)
);
CREATE TABLE IF NOT EXISTS contradiction_action_protocol_transitions (
  transition_id TEXT CONSTRAINT contradiction_action_protocol_transitions_pkey PRIMARY KEY,
  previous_protocol_decision_id TEXT NOT NULL REFERENCES contradiction_action_protocol_records(protocol_decision_id) ON DELETE RESTRICT,
  next_protocol_decision_id TEXT NOT NULL REFERENCES contradiction_action_protocol_records(protocol_decision_id) ON DELETE RESTRICT,
  supersedes BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT contradiction_action_protocol_transition_not_self CHECK (previous_protocol_decision_id <> next_protocol_decision_id),
  CONSTRAINT contradiction_action_protocol_transition_next_key UNIQUE (next_protocol_decision_id),
  CONSTRAINT contradiction_action_protocol_transition_previous_key UNIQUE (previous_protocol_decision_id)
);
CREATE INDEX IF NOT EXISTS contradiction_action_protocol_event_idx ON contradiction_action_protocol_records(source_event_evaluation_id, created_at);
CREATE INDEX IF NOT EXISTS contradiction_action_protocol_input_lineage_idx ON contradiction_action_protocol_inputs(expectation_id,asset,assessment_stage,available_at);

CREATE INDEX IF NOT EXISTS contradiction_action_protocol_event_history_idx ON contradiction_action_protocol_records(event_instance_key, source_assessment_stage_order, evidence_cutoff_at, protocol_decision_id);
