-- 0045_market_cleanliness_ranking: IFP-4 immutable, point-in-time market-context intelligence.
CREATE TABLE IF NOT EXISTS market_session_liquidity_contexts (
 context_id TEXT CONSTRAINT market_session_liquidity_contexts_pkey PRIMARY KEY,
 policy_version TEXT NOT NULL CONSTRAINT market_session_liquidity_contexts_policy_check CHECK(policy_version='market-cleanliness-v1'),
 event_evaluation_id TEXT NOT NULL CONSTRAINT market_session_liquidity_contexts_event_fkey REFERENCES app_event_reality_evaluations(event_evaluation_id) ON DELETE RESTRICT,
 asset TEXT NOT NULL CONSTRAINT market_session_liquidity_contexts_asset_check CHECK(length(asset)>0), observed_at TIMESTAMPTZ NOT NULL, available_at TIMESTAMPTZ NOT NULL, evidence_cutoff_at TIMESTAMPTZ NOT NULL,
 market_state TEXT NOT NULL CONSTRAINT market_session_liquidity_contexts_market_state_check CHECK(market_state IN('open','closed','continuous','unknown')),
 session_state TEXT NOT NULL CONSTRAINT market_session_liquidity_contexts_session_state_check CHECK(session_state IN('active','overlap','off_hours','closed','continuous','unknown')),
 liquidity_state TEXT NOT NULL CONSTRAINT market_session_liquidity_contexts_liquidity_state_check CHECK(liquidity_state IN('normal','thin','stressed','unknown')),
 spread_state TEXT NOT NULL CONSTRAINT market_session_liquidity_contexts_spread_state_check CHECK(spread_state IN('normal','wide','unknown')),
 activity_state TEXT NOT NULL CONSTRAINT market_session_liquidity_contexts_activity_state_check CHECK(activity_state IN('normal','elevated','depressed','unknown')),
 source_evidence_ids TEXT[] NOT NULL, provenance JSONB NOT NULL, warnings TEXT[] NOT NULL DEFAULT '{}', limitations TEXT[] NOT NULL DEFAULT '{}', canonical_payload JSONB NOT NULL,
 canonical_payload_hash TEXT NOT NULL CONSTRAINT market_session_liquidity_contexts_payload_hash_key UNIQUE, created_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT market_session_liquidity_contexts_cutoff_check CHECK(observed_at<=evidence_cutoff_at AND available_at<=evidence_cutoff_at AND created_at<=evidence_cutoff_at),
 CONSTRAINT market_session_liquidity_contexts_state_consistency_check CHECK((market_state='continuous' AND session_state='continuous') OR (market_state='open' AND session_state IN('active','overlap','off_hours','unknown')) OR (market_state='closed' AND session_state='closed') OR market_state='unknown'),
 CONSTRAINT market_session_liquidity_contexts_lineage_key UNIQUE(context_id,event_evaluation_id,asset,evidence_cutoff_at)
);
CREATE TABLE IF NOT EXISTS market_cleanliness_evaluations (
 cleanliness_evaluation_id TEXT CONSTRAINT market_cleanliness_evaluations_pkey PRIMARY KEY,
 policy_version TEXT NOT NULL CONSTRAINT market_cleanliness_evaluations_policy_check CHECK(policy_version='market-cleanliness-v1'),
 source_event_evaluation_id TEXT NOT NULL CONSTRAINT market_cleanliness_evaluations_event_fkey REFERENCES app_event_reality_evaluations(event_evaluation_id) ON DELETE RESTRICT,
 source_expectation_id TEXT NOT NULL CONSTRAINT market_cleanliness_evaluations_expectation_fkey REFERENCES app_expectation_records(expectation_id) ON DELETE RESTRICT,
 source_analog_retrieval_id TEXT NULL CONSTRAINT market_cleanliness_evaluations_analog_fkey REFERENCES app_historical_analog_retrievals(retrieval_id) ON DELETE RESTRICT,
 source_session_liquidity_context_id TEXT NULL, event_instance_key TEXT NOT NULL, asset TEXT NOT NULL, event_kind TEXT NOT NULL,
 assessment_stage TEXT NOT NULL CONSTRAINT market_cleanliness_evaluations_stage_check CHECK(assessment_stage IN('immediate','confirmation','follow_through')), evidence_cutoff_at TIMESTAMPTZ NOT NULL,
 raw_agreement_score NUMERIC(5,2) NOT NULL CONSTRAINT market_cleanliness_evaluations_raw_score_check CHECK(raw_agreement_score BETWEEN 0 AND 100),
 evidence_coverage_ratio NUMERIC(4,2) NOT NULL CONSTRAINT market_cleanliness_evaluations_coverage_check CHECK(evidence_coverage_ratio BETWEEN 0 AND 1),
 evidence_qualified_score NUMERIC(5,2) NOT NULL CONSTRAINT market_cleanliness_evaluations_qualified_score_check CHECK(evidence_qualified_score BETWEEN 0 AND 100),
 cleanliness_state TEXT NOT NULL CONSTRAINT market_cleanliness_evaluations_state_check CHECK(cleanliness_state IN('clean','mixed','conflicted','insufficient_data')),
 hard_conflict_flags TEXT[] NOT NULL, ambiguity_flags TEXT[] NOT NULL, canonical_payload JSONB NOT NULL,
 canonical_payload_hash TEXT NOT NULL CONSTRAINT market_cleanliness_evaluations_payload_hash_key UNIQUE, created_at TIMESTAMPTZ NOT NULL,
 CONSTRAINT market_cleanliness_evaluations_cutoff_check CHECK(created_at<=evidence_cutoff_at),
 CONSTRAINT market_cleanliness_evaluations_context_lineage_fkey FOREIGN KEY(source_session_liquidity_context_id,source_event_evaluation_id,asset,evidence_cutoff_at) REFERENCES market_session_liquidity_contexts(context_id,event_evaluation_id,asset,evidence_cutoff_at) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS market_session_liquidity_contexts_event_idx ON market_session_liquidity_contexts(event_evaluation_id,evidence_cutoff_at);
CREATE INDEX IF NOT EXISTS market_cleanliness_evaluations_event_idx ON market_cleanliness_evaluations(source_event_evaluation_id,created_at);
CREATE INDEX IF NOT EXISTS market_cleanliness_evaluations_instance_idx ON market_cleanliness_evaluations(event_instance_key,assessment_stage,evidence_cutoff_at);
CREATE INDEX IF NOT EXISTS market_cleanliness_evaluations_report_idx ON market_cleanliness_evaluations(asset,event_kind,assessment_stage,policy_version,created_at);
