import { validateMarketDataProviderDescriptor, validateMarketEvidenceRegistrySnapshot, validateSeoContentArchitectureSnapshot } from '@elceo/schemas';
import { assertMarketEvidenceCoverageComplete, getMarketEvidenceCoverageReport, listLaunchAssetsWithoutInfluenceCoverage, listLaunchEvidenceTypesWithoutProviderPath, listNormalizedPayloadFamiliesWithoutCoverage, listProviderDescriptorsWithInvalidCapabilities, listSeoPagesWithoutMapping, listUncoveredEvidenceClasses } from '../coverage-audit/index';
import { getMarketEvidenceRegistrySnapshot } from '../evidence-registry/index';
import { getProviderCapabilityRegistrySnapshot } from '../provider-sources/provider-capability-registry';
import { getSeoContentArchitectureSnapshot } from '../seo-content/index';

export function runMarketEvidenceCoverageAuditTests(): void {
  assertMarketEvidenceCoverageComplete();
  if (listUncoveredEvidenceClasses().length !== 0) throw new Error('uncovered evidence classes found');
  if (listLaunchEvidenceTypesWithoutProviderPath().length !== 0) throw new Error('launch evidence type gaps found');
  if (listLaunchAssetsWithoutInfluenceCoverage().length !== 0) throw new Error('launch asset coverage gaps found');
  if (listProviderDescriptorsWithInvalidCapabilities().length !== 0) throw new Error('provider capability gaps found');
  if (listNormalizedPayloadFamiliesWithoutCoverage().length !== 0) throw new Error('normalized payload gaps found');
  if (listSeoPagesWithoutMapping().length !== 0) throw new Error('seo mapping gaps found');
  const report = getMarketEvidenceCoverageReport('2026-01-01T00:00:00.000Z');
  if (!report.pass || report.failures.length !== 0) throw new Error('coverage report failure');
  const exclusion = report.explicitExclusions.find((x) => x.key === 'interbank_order_flow_bank_order');
  if (!exclusion || exclusion.reason.trim().length === 0) throw new Error('required exclusion missing');

  const registry = getMarketEvidenceRegistrySnapshot('2026-01-01T00:00:00.000Z');
  const registryValidation = validateMarketEvidenceRegistrySnapshot(registry);
  if (!registryValidation.ok) throw new Error(`registry validation failed: ${registryValidation.errors.join('; ')}`);
  const seoValidation = validateSeoContentArchitectureSnapshot(getSeoContentArchitectureSnapshot('2026-01-01T00:00:00.000Z'));
  if (!seoValidation.ok) throw new Error(`seo validation failed: ${seoValidation.errors.join('; ')}`);

  const providers = getProviderCapabilityRegistrySnapshot('2026-01-01T00:00:00.000Z').providers;
  providers.forEach((provider) => { if (!validateMarketDataProviderDescriptor(provider).ok) throw new Error(`provider invalid: ${provider.providerId}`); });
  if (new Set(providers.map((x) => x.providerId)).size !== providers.length) throw new Error('duplicate providerId detected');
  if (new Set(registry.evidenceTypes.map((x) => x.evidenceTypeId)).size !== registry.evidenceTypes.length) throw new Error('duplicate evidenceTypeId detected');
  const seoPages = getSeoContentArchitectureSnapshot('2026-01-01T00:00:00.000Z').pages;
  if (new Set(seoPages.map((x) => x.slug)).size !== seoPages.length) throw new Error('duplicate SEO slug detected');
}
