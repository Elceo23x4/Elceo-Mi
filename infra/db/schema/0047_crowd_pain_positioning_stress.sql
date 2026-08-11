BEGIN;
CREATE TABLE IF NOT EXISTS positioning_evidence (
 positioning_evidence_id text PRIMARY KEY, policy_version text NOT NULL CHECK(policy_version='positioning-stress-v1'), source_payload_id text NOT NULL REFERENCES app_normalized_market_evidence_payloads(payload_id),
 provider text NOT NULL, asset text NOT NULL, source_market_code text NOT NULL, report_kind text NOT NULL, cohort text NOT NULL, orientation text NOT NULL CHECK(orientation IN ('same','inverse')),
 observed_at timestamptz NOT NULL, published_at timestamptz, available_at timestamptz NOT NULL, evidence_cutoff_at timestamptz NOT NULL,
 canonical_net_pct_open_interest double precision NOT NULL, canonical_payload jsonb NOT NULL, canonical_payload_hash text NOT NULL UNIQUE, created_at timestamptz NOT NULL,
 CONSTRAINT positioning_evidence_time_check CHECK(observed_at<=available_at AND (published_at IS NULL OR published_at<=available_at) AND available_at<=evidence_cutoff_at AND created_at<=evidence_cutoff_at),
 CONSTRAINT positioning_evidence_semantic_key UNIQUE(asset,source_market_code,report_kind,cohort,orientation,observed_at)
);
CREATE INDEX IF NOT EXISTS positioning_evidence_history_idx ON positioning_evidence(provider,source_market_code,report_kind,cohort,available_at DESC);
CREATE TABLE IF NOT EXISTS positioning_stress_evaluations (
 positioning_stress_evaluation_id text PRIMARY KEY, policy_version text NOT NULL CHECK(policy_version='positioning-stress-v1'),
 source_event_evaluation_id text NOT NULL REFERENCES app_event_reality_evaluations(event_evaluation_id), source_expectation_id text NOT NULL REFERENCES app_expectation_records(expectation_id),
 source_cleanliness_evaluation_id text NOT NULL REFERENCES market_cleanliness_evaluations(cleanliness_evaluation_id), source_narrative_decay_evaluation_id text NOT NULL REFERENCES narrative_decay_evaluations(narrative_decay_evaluation_id),
 source_analog_retrieval_id text REFERENCES app_historical_analog_retrievals(retrieval_id), asset text NOT NULL,event_kind text NOT NULL,assessment_stage text NOT NULL,evidence_cutoff_at timestamptz NOT NULL,
 market_stress_state text NOT NULL, positioning_evidence_state text NOT NULL,crowd_pain_qualification text NOT NULL,canonical_payload jsonb NOT NULL,canonical_payload_hash text NOT NULL UNIQUE,created_at timestamptz NOT NULL,
 CHECK(created_at<=evidence_cutoff_at)
);
CREATE TABLE IF NOT EXISTS positioning_stress_evaluation_evidence(positioning_stress_evaluation_id text NOT NULL REFERENCES positioning_stress_evaluations(positioning_stress_evaluation_id) ON DELETE RESTRICT,positioning_evidence_id text NOT NULL REFERENCES positioning_evidence(positioning_evidence_id) ON DELETE RESTRICT,PRIMARY KEY(positioning_stress_evaluation_id,positioning_evidence_id));
COMMIT;
