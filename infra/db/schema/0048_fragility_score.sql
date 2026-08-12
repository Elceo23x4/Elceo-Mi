-- IFP-7 immutable, descriptive fragility score evaluations.
CREATE TABLE IF NOT EXISTS fragility_score_evaluations (
 fragility_score_evaluation_id TEXT CONSTRAINT fragility_score_evaluations_pkey PRIMARY KEY,
 policy_version TEXT NOT NULL CONSTRAINT fragility_score_evaluations_policy_check CHECK(policy_version='fragility-score-v1'),
 source_event_evaluation_id TEXT NOT NULL CONSTRAINT fragility_score_evaluations_event_fkey REFERENCES app_event_reality_evaluations(event_evaluation_id) ON DELETE RESTRICT,
 source_expectation_id TEXT NOT NULL CONSTRAINT fragility_score_evaluations_expectation_fkey REFERENCES app_expectation_records(expectation_id) ON DELETE RESTRICT,
 source_analog_retrieval_id TEXT NULL CONSTRAINT fragility_score_evaluations_analog_fkey REFERENCES app_historical_analog_retrievals(retrieval_id) ON DELETE RESTRICT,
 source_protocol_decision_id TEXT NOT NULL CONSTRAINT fragility_score_evaluations_protocol_fkey REFERENCES contradiction_action_protocol_records(protocol_decision_id) ON DELETE RESTRICT,
 source_cleanliness_evaluation_id TEXT NOT NULL CONSTRAINT fragility_score_evaluations_cleanliness_fkey REFERENCES market_cleanliness_evaluations(cleanliness_evaluation_id) ON DELETE RESTRICT,
 source_narrative_decay_evaluation_id TEXT NOT NULL CONSTRAINT fragility_score_evaluations_narrative_fkey REFERENCES narrative_decay_evaluations(narrative_decay_evaluation_id) ON DELETE RESTRICT,
 source_positioning_stress_evaluation_id TEXT NOT NULL CONSTRAINT fragility_score_evaluations_positioning_fkey REFERENCES positioning_stress_evaluations(positioning_stress_evaluation_id) ON DELETE RESTRICT,
 asset TEXT NOT NULL,event_kind TEXT NOT NULL,assessment_stage TEXT NOT NULL CHECK(assessment_stage IN('immediate','confirmation','follow_through')),evidence_cutoff_at TIMESTAMPTZ NOT NULL,
 evidence_sufficiency TEXT NOT NULL CHECK(evidence_sufficiency IN('sufficient','insufficient_data','provenance_limited')),expected_weight NUMERIC NOT NULL,available_weight NUMERIC NOT NULL,evidence_coverage_ratio NUMERIC NOT NULL CHECK(evidence_coverage_ratio BETWEEN 0 AND 1),raw_fragility_score NUMERIC NULL CHECK(raw_fragility_score BETWEEN 0 AND 100),fragility_score NUMERIC NULL CHECK(fragility_score BETWEEN 0 AND 100),fragility_state TEXT NOT NULL CHECK(fragility_state IN('low','elevated','high','severe','insufficient_data')),
 canonical_payload JSONB NOT NULL,canonical_payload_hash TEXT NOT NULL CONSTRAINT fragility_score_evaluations_payload_hash_key UNIQUE,created_at TIMESTAMPTZ NOT NULL,CONSTRAINT fragility_score_evaluations_cutoff_check CHECK(created_at<=evidence_cutoff_at)
);
CREATE INDEX IF NOT EXISTS fragility_score_evaluations_report_idx ON fragility_score_evaluations(asset,event_kind,assessment_stage,policy_version,created_at);
