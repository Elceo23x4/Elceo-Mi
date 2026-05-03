import { validateMarketDataProviderDescriptor, validateMarketEvidenceRegistrySnapshot, validateSeoContentArchitectureSnapshot } from '@elceo/schemas';
import { MARKET_EVIDENCE_CLASSES, PROVIDER_CAPABILITY_KINDS, TRADING_ASSET_COVERAGE } from '@elceo/types';
import { getMarketEvidenceRegistrySnapshot } from '../evidence-registry/index';
import { getEvidenceClassCoverage, getProviderCapabilityRegistrySnapshot } from '../provider-sources/provider-capability-registry';
import { getSeoContentArchitectureSnapshot } from '../seo-content/index';

const EXCLUSIONS = [{ key: 'interbank_order_flow_bank_order', reason: 'Excluded due to licensing restrictions and private-data complexity before launch.' }] as const;
const hasText = (v: string | null | undefined): boolean => typeof v === 'string' && v.trim().length > 0;
const sortBy = <T>(xs: T[], key: (x: T) => string): T[] => [...xs].sort((a, b) => key(a).localeCompare(key(b)));

export function listUncoveredEvidenceClasses(): string[] {
  const covered = new Set(getEvidenceClassCoverage().filter((x) => hasText(x.notes)).map((x) => x.evidenceClass));
  return sortBy(MARKET_EVIDENCE_CLASSES.filter((x) => !covered.has(x)), (x) => x);
}

export function listLaunchEvidenceTypesWithoutProviderPath(): string[] {
  const registry = getMarketEvidenceRegistrySnapshot('2026-01-01T00:00:00.000Z');
  const providers = getProviderCapabilityRegistrySnapshot('2026-01-01T00:00:00.000Z').providers;
  const coverage = new Map(getEvidenceClassCoverage().map((x) => [x.evidenceClass, x]));
  return sortBy(registry.evidenceTypes.filter((x) => x.isLaunchScope).filter((e) => {
    const c = coverage.get(e.evidenceClass);
    if (!c) return true;
    const providerPath = c.providerCapabilities.some((cap) => providers.some((p) => p.supportedCapabilities.includes(cap)));
    return !(providerPath || c.normalizedPayloadKinds.length > 0 || c.calculatedInternal || (c.placeholderOnly && hasText(c.notes)));
  }).map((x) => x.evidenceTypeId), (x) => x);
}

export function listLaunchAssetsWithoutInfluenceCoverage(): string[] {
  const reg = getMarketEvidenceRegistrySnapshot('2026-01-01T00:00:00.000Z');
  const seo = getSeoContentArchitectureSnapshot('2026-01-01T00:00:00.000Z');
  const launchEvidence = new Set(reg.evidenceTypes.filter((x) => x.isLaunchScope).map((x) => x.evidenceTypeId));
  return sortBy(TRADING_ASSET_COVERAGE.filter((asset) => {
    const hasInfluence = reg.assetInfluences.some((x) => x.asset === asset && launchEvidence.has(x.evidenceTypeId) && hasText(x.rationale));
    const hasSeo = seo.pages.some((x) => x.isLaunchScope && x.relatedAssets.includes(asset));
    return !(hasInfluence && hasSeo);
  }), (x) => x);
}

export function listProviderDescriptorsWithInvalidCapabilities(): string[] {
  return sortBy(getProviderCapabilityRegistrySnapshot('2026-01-01T00:00:00.000Z').providers.filter((p) => {
    const knownCaps = p.supportedCapabilities.every((cap) => PROVIDER_CAPABILITY_KINDS.includes(cap));
    return !(validateMarketDataProviderDescriptor(p).ok && knownCaps && p.supportedCapabilities.length > 0 && hasText(p.notes));
  }).map((x) => x.providerId), (x) => x);
}

export function listNormalizedPayloadFamiliesWithoutCoverage(): string[] {
  return sortBy(getEvidenceClassCoverage().filter((x) => x.normalizedPayloadKinds.length === 0 && !x.calculatedInternal && !(x.placeholderOnly && hasText(x.notes)) && !(x.explicitlyExcluded && hasText(x.notes))).map((x) => x.evidenceClass), (x) => x);
}

export function listSeoPagesWithoutMapping(): string[] {
  const seo = getSeoContentArchitectureSnapshot('2026-01-01T00:00:00.000Z');
  const pageIds = new Set(seo.pages.map((x) => x.pageId));
  return sortBy(seo.pages.filter((p) => p.isLaunchScope).filter((p) => {
    const linksOk = p.internalLinkTargets.every((id) => pageIds.has(id));
    const requiresMap = ['asset_page', 'macro_event_page', 'institution_page', 'country_macro_page', 'evidence_class_page'].includes(p.pageKind);
    const hasMap = p.relatedAssets.length > 0 || p.relatedEvidenceTypes.length > 0;
    return requiresMap ? !(linksOk && hasMap) : !linksOk;
  }).map((x) => x.pageId), (x) => x);
}

export function getMarketEvidenceCoverageReport(asOfIso = new Date().toISOString()) {
  const failures: string[] = [];
  if (!validateMarketEvidenceRegistrySnapshot(getMarketEvidenceRegistrySnapshot(asOfIso)).ok) failures.push('market evidence registry snapshot validation failed');
  if (!validateSeoContentArchitectureSnapshot(getSeoContentArchitectureSnapshot(asOfIso)).ok) failures.push('seo architecture snapshot validation failed');
  const uncoveredEvidenceClasses = listUncoveredEvidenceClasses();
  const launchEvidenceWithoutPath = listLaunchEvidenceTypesWithoutProviderPath();
  const launchAssetsWithoutCoverage = listLaunchAssetsWithoutInfluenceCoverage();
  const invalidProviders = listProviderDescriptorsWithInvalidCapabilities();
  const normalizedPayloadGaps = listNormalizedPayloadFamiliesWithoutCoverage();
  const seoMappingGaps = listSeoPagesWithoutMapping();
  if (uncoveredEvidenceClasses.length) failures.push(`uncovered evidence classes: ${uncoveredEvidenceClasses.join(', ')}`);
  if (launchEvidenceWithoutPath.length) failures.push(`launch evidence without provider path: ${launchEvidenceWithoutPath.join(', ')}`);
  if (launchAssetsWithoutCoverage.length) failures.push(`launch assets without influence coverage: ${launchAssetsWithoutCoverage.join(', ')}`);
  if (invalidProviders.length) failures.push(`invalid provider descriptors: ${invalidProviders.join(', ')}`);
  if (normalizedPayloadGaps.length) failures.push(`normalized payload coverage gaps: ${normalizedPayloadGaps.join(', ')}`);
  if (seoMappingGaps.length) failures.push(`seo mapping gaps: ${seoMappingGaps.join(', ')}`);
  if (!EXCLUSIONS.every((x) => hasText(x.reason))) failures.push('explicit exclusions require non-empty reason');

  return { generatedAt: asOfIso, evidenceClassCoverage: getEvidenceClassCoverage(), launchEvidenceTypeCoverage: launchEvidenceWithoutPath, launchAssetCoverage: launchAssetsWithoutCoverage, providerCapabilityCoverage: invalidProviders, normalizedPayloadCoverage: normalizedPayloadGaps, seoCoverage: seoMappingGaps, explicitExclusions: EXCLUSIONS, pass: failures.length === 0, failures };
}

export function assertMarketEvidenceCoverageComplete(): void {
  const report = getMarketEvidenceCoverageReport();
  if (!report.pass) throw new Error(`Market evidence coverage audit failed: ${report.failures.join(' | ')}`);
}
