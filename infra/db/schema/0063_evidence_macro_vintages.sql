CREATE TABLE IF NOT EXISTS app_macro_evidence_vintages (
  observation_identity text NOT NULL,
  correlation_key text NOT NULL,
  country_or_area text NOT NULL,
  indicator_id text NOT NULL,
  reference_period text NOT NULL,
  scheduled_release_at timestamptz,
  released_at timestamptz,
  known_at timestamptz NOT NULL,
  retrieved_at timestamptz NOT NULL,
  effective_at timestamptz NOT NULL,
  vintage_id text,
  previous_published_value double precision,
  published_value double precision NOT NULL,
  revision_state text NOT NULL CHECK (revision_state IN ('preliminary','final','revised')),
  canonical_source_id text NOT NULL,
  source_reference text NOT NULL,
  provider_request_id text NOT NULL REFERENCES app_provider_source_requests(request_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (observation_identity, known_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS app_macro_vintages_idempotency
  ON app_macro_evidence_vintages (canonical_source_id, provider_request_id, observation_identity, known_at);
CREATE INDEX IF NOT EXISTS app_macro_vintages_as_of
  ON app_macro_evidence_vintages (correlation_key, known_at DESC);

REVOKE ALL ON app_macro_evidence_vintages FROM PUBLIC;
