-- 0044_contradiction_action_protocol
-- IFP-3 Contradiction-to-Action Protocol immutable audit records.
CREATE TABLE IF NOT EXISTS contradiction_action_protocol_records (
  protocol_decision_id TEXT PRIMARY KEY,
  policy_version TEXT NOT NULL CHECK (policy_version = 'contradiction-action-protocol-v1'),
  source_event_evaluation_id TEXT NOT NULL,
  source_expectation_id TEXT NOT NULL,
  source_analog_retrieval_id TEXT NULL,
  contradiction_evidence_hash TEXT NOT NULL,
  invalidation_state_hash TEXT NOT NULL,
  analog_context_hash TEXT NULL,
  evidence_cutoff_at TIMESTAMPTZ NOT NULL,
  evidence_sufficiency TEXT NOT NULL,
  protocol_state TEXT NOT NULL CHECK (protocol_state IN ('wait_for_confirmation','review_required','invalidate_thesis','escalate_review','archive_resolved')),
  transition_reasons TEXT[] NOT NULL,
  warnings TEXT[] NOT NULL DEFAULT '{}',
  limitations TEXT[] NOT NULL DEFAULT '{}',
  canonical_payload JSONB NOT NULL,
  canonical_payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (canonical_payload_hash)
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
  transition_id TEXT PRIMARY KEY,
  previous_protocol_decision_id TEXT NOT NULL REFERENCES contradiction_action_protocol_records(protocol_decision_id) ON DELETE RESTRICT,
  next_protocol_decision_id TEXT NOT NULL REFERENCES contradiction_action_protocol_records(protocol_decision_id) ON DELETE RESTRICT,
  supersedes BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (previous_protocol_decision_id <> next_protocol_decision_id),
  UNIQUE (next_protocol_decision_id)
);
CREATE INDEX IF NOT EXISTS contradiction_action_protocol_event_idx ON contradiction_action_protocol_records(source_event_evaluation_id, created_at);
