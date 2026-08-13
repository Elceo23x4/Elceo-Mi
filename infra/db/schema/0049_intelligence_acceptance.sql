-- IFP-8 immutable production-data calibration and intelligence acceptance evidence.
CREATE TABLE IF NOT EXISTS intelligence_acceptance_records (
 record_kind TEXT NOT NULL CHECK(record_kind IN ('dataset_manifest','dataset_certification','split_manifest','configuration_version','calibration_trial','holdout_lifecycle','acceptance_run','case_result','coverage_decision','residual_risk','rollback_evidence')),
 record_id TEXT NOT NULL CHECK(record_id <> ''),
 canonical_payload JSONB NOT NULL,
 canonical_payload_hash TEXT NOT NULL CHECK(canonical_payload_hash ~ '^[a-f0-9]{64}$'),
 created_at TIMESTAMPTZ NOT NULL,
 CHECK(canonical_payload ? 'canonicalPayloadHash' AND canonical_payload->>'canonicalPayloadHash' IS NOT NULL AND canonical_payload->>'canonicalPayloadHash'=canonical_payload_hash),
 CHECK(COALESCE(CASE record_kind
  WHEN 'dataset_manifest' THEN canonical_payload->>'datasetId'
  WHEN 'dataset_certification' THEN canonical_payload->>'datasetId'
  WHEN 'split_manifest' THEN canonical_payload->>'datasetId'
  WHEN 'configuration_version' THEN canonical_payload->>'configurationVersionId'
  WHEN 'calibration_trial' THEN canonical_payload->>'trialId'
  WHEN 'holdout_lifecycle' THEN canonical_payload->>'acceptanceRunFamilyId'
  WHEN 'acceptance_run' THEN canonical_payload->>'acceptanceRunId'
  WHEN 'case_result' THEN canonical_payload->>'caseResultId'
  WHEN 'coverage_decision' THEN canonical_payload->>'coverageDecisionId'
  WHEN 'residual_risk' THEN canonical_payload->>'riskId'
  WHEN 'rollback_evidence' THEN canonical_payload->>'rollbackEvidenceId'
 END,'')<>'' AND record_id=COALESCE(CASE record_kind
  WHEN 'dataset_manifest' THEN canonical_payload->>'datasetId'
  WHEN 'dataset_certification' THEN canonical_payload->>'datasetId'
  WHEN 'split_manifest' THEN canonical_payload->>'datasetId'
  WHEN 'configuration_version' THEN canonical_payload->>'configurationVersionId'
  WHEN 'calibration_trial' THEN canonical_payload->>'trialId'
  WHEN 'holdout_lifecycle' THEN canonical_payload->>'acceptanceRunFamilyId'
  WHEN 'acceptance_run' THEN canonical_payload->>'acceptanceRunId'
  WHEN 'case_result' THEN canonical_payload->>'caseResultId'
  WHEN 'coverage_decision' THEN canonical_payload->>'coverageDecisionId'
  WHEN 'residual_risk' THEN canonical_payload->>'riskId'
  WHEN 'rollback_evidence' THEN canonical_payload->>'rollbackEvidenceId'
 END,'')),
 PRIMARY KEY(record_kind,record_id),
 UNIQUE(record_kind,canonical_payload_hash)
);
CREATE UNIQUE INDEX IF NOT EXISTS intelligence_acceptance_holdout_tranche_unique
 ON intelligence_acceptance_records ((canonical_payload->>'datasetId'),(canonical_payload->>'holdoutPartitionHash'))
 WHERE record_kind='holdout_lifecycle';
CREATE TABLE IF NOT EXISTS intelligence_acceptance_links (
 acceptance_run_kind TEXT NOT NULL DEFAULT 'acceptance_run' CHECK(acceptance_run_kind='acceptance_run'),
 acceptance_run_id TEXT NOT NULL,
 record_kind TEXT NOT NULL,
 record_id TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL,
 PRIMARY KEY(acceptance_run_id,record_kind,record_id),
 FOREIGN KEY (acceptance_run_kind,acceptance_run_id) REFERENCES intelligence_acceptance_records(record_kind,record_id) ON DELETE RESTRICT,
 FOREIGN KEY (record_kind,record_id) REFERENCES intelligence_acceptance_records(record_kind,record_id) ON DELETE RESTRICT
);
