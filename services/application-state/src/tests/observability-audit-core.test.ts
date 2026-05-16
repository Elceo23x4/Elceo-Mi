import { strict as assert } from 'node:assert';
import { assertNoSecretsInObservabilityAuditPayload, buildObservabilityAuditCalibrationDiagnosticEvent, buildObservabilityAuditCognitionDiagnosticEvent, buildObservabilityAuditCommercialDiagnosticEvent, buildObservabilityAuditDiagnosticErrorEnvelope, buildObservabilityAuditFrontendContractDiagnosticEvent, buildObservabilityAuditIngestionDiagnosticEvent, buildObservabilityAuditNotificationDiagnosticEvent, buildObservabilityAuditProviderActivationDiagnosticEvent, buildObservabilityAuditProviderDiagnosticEvent, buildObservabilityAuditSecurityDiagnosticEvent, buildObservabilityAuditSeoDiagnosticEvent, buildObservabilityAuditStructuredLogEvent, createObservabilityAuditTraceContext, getObservabilityAuditCoverageReport, getObservabilityAuditReadinessReport, redactObservabilityAuditPayload } from '../observability-audit/index.js';

export const runObservabilityAuditCoreTests=()=>{
  const trace=createObservabilityAuditTraceContext({traceId:'trace-1',requestId:'req-1',correlationId:'cor-1',runId:'run-1',subsystem:'security_runtime',environment:'test',createdAt:'2026-01-01T00:00:00.000Z'});
  assert.equal(buildObservabilityAuditStructuredLogEvent({message:'fixture pack loaded',subsystem:'launch_asset_fixtures',actionKind:'generate',traceContext:trace}).eventKind,'structured_log');
  assert.equal(buildObservabilityAuditSecurityDiagnosticEvent({message:'step-up verified',traceContext:trace}).outcome,'allowed');
  assert.equal(buildObservabilityAuditProviderDiagnosticEvent({message:'provider readiness checked',traceContext:trace}).subsystem,'provider_registry');
  assert.equal(buildObservabilityAuditIngestionDiagnosticEvent({message:'dry-run executed',traceContext:trace}).subsystem,'scheduled_ingestion');
  assert.equal(buildObservabilityAuditCognitionDiagnosticEvent({message:'scenario run',traceContext:trace}).subsystem,'golden_scenario');
  assert.equal(buildObservabilityAuditCalibrationDiagnosticEvent({message:'guardrail passed',traceContext:trace}).subsystem,'cognition_calibration');
  assert.equal(buildObservabilityAuditFrontendContractDiagnosticEvent({message:'mock payload generated',traceContext:trace}).subsystem,'frontend_contracts');
  assert.equal(buildObservabilityAuditCommercialDiagnosticEvent({message:'subscription wall returned',traceContext:trace}).subsystem,'commercial_entitlements');
  assert.equal(buildObservabilityAuditNotificationDiagnosticEvent({message:'quiet hours suppressed',traceContext:trace}).subsystem,'user_notifications');
  assert.equal(buildObservabilityAuditSeoDiagnosticEvent({message:'public feed generated',traceContext:trace}).subsystem,'seo_programmatic_feeds');
  assert.equal(buildObservabilityAuditProviderActivationDiagnosticEvent({message:'live activation blocked',traceContext:trace}).subsystem,'provider_activation_readiness');
  const r=redactObservabilityAuditPayload({authorization:'Bearer abc',cookie:'x=1',api_key:'k',korapay_secret_key:'k',stripe_secret_key:'s',email_provider_api_key:'e',whatsapp_access_token:'w',twilio_auth_token:'t',database_url:'postgres://x',redis_url:'redis://x'});
  assert.equal(r.redactionStatus,'applied'); assert.ok(r.redactedKeys.length>=10); assert.equal(assertNoSecretsInObservabilityAuditPayload(r.redactedPayload),true);
  const env=buildObservabilityAuditDiagnosticErrorEnvelope({errorId:'e1',category:'validation_error',message:'validation failed',safeSummary:'safe internal summary',traceContext:trace,operatorAction:'check contract payload',retryable:false});
  assert.equal(env.category,'validation_error'); assert.equal(getObservabilityAuditReadinessReport().externalVendorIntegrated,false); assert.equal(getObservabilityAuditCoverageReport().subsystems.length>10,true); assert.equal(JSON.stringify(env).includes('buy'),false); assert.equal(JSON.stringify(env).includes('profit'),false);
};
