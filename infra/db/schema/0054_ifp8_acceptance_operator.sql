-- Durable, immutable operator envelope. The canonical acceptance records remain authoritative.
CREATE TABLE IF NOT EXISTS intelligence_acceptance_operator_bundles (
 acceptance_run_family_id TEXT PRIMARY KEY CHECK (acceptance_run_family_id <> ''),
 schema_version TEXT NOT NULL CHECK (schema_version = 'ifp8-acceptance-operator-v1'),
 canonical_payload JSONB NOT NULL,
 canonical_payload_hash TEXT NOT NULL CHECK (canonical_payload_hash ~ '^[a-f0-9]{64}$'),
 imported_at TIMESTAMPTZ NOT NULL,
 CHECK (canonical_payload->>'runFamilyId' = acceptance_run_family_id),
 CHECK (canonical_payload->>'schemaVersion' = schema_version),
 CHECK (canonical_payload ? 'canonicalPayloadHash' AND canonical_payload->>'canonicalPayloadHash' = canonical_payload_hash)
);
