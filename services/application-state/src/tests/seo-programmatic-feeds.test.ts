import assert from 'node:assert/strict';
import { validateSeoProgrammaticAssetIndexFeed, validateSeoProgrammaticCanonicalFeed, validateSeoProgrammaticCoverageReport, validateSeoProgrammaticDiagnosticAssetPage, validateSeoProgrammaticRobotsPolicy, validateSeoProgrammaticSitemapFeed, validateSeoProgrammaticStructuredDataPayload, validateSeoProgrammaticSupportedAssetPage } from '@elceo/schemas';
import { getSeoCanonicalFeed, getSeoDiagnosticAssetPages, getSeoMacroEventPages, getSeoProgrammaticCoverageReport, getSeoProgrammaticSafetyReport, getSeoRobotsPolicy, getSeoSitemapFeed, getSeoStructuredDataPayloads, getSeoSupportedAssetIndexFeed } from '../seo-programmatic-feeds/index.js';

export function runSeoProgrammaticFeedsTests(): void {
  const assets=getSeoSupportedAssetIndexFeed();
  assert.equal(assets.assets.length,12);
  assert.equal(validateSeoProgrammaticAssetIndexFeed(assets).ok,true);
  assert.ok(!assets.assets.some((x)=>['dxy','vix'].includes(String(x.assetId))));
  assert.ok(assets.assets.some((x)=>x.assetId==='xau_usd')&&assets.assets.some((x)=>x.assetId==='usd_cad'));
  assert.equal(validateSeoProgrammaticSupportedAssetPage({...assets.assets[0],assetId:'dxy'}).ok,false);
  assert.equal(validateSeoProgrammaticSupportedAssetPage({...assets.assets[0],assetId:'vix'}).ok,false);
  const diagnostics=getSeoDiagnosticAssetPages();
  assert.equal(diagnostics.length,2);
  diagnostics.forEach((x)=>assert.equal(validateSeoProgrammaticDiagnosticAssetPage(x).ok,true));
  assert.equal(validateSeoProgrammaticDiagnosticAssetPage({...diagnostics[0],assetId:'eur_usd'}).ok,false);
  assert.equal(validateSeoProgrammaticDiagnosticAssetPage({...diagnostics[0],tradable:true}).ok,false);
  assert.equal(getSeoMacroEventPages().length,16);
  const sitemap=getSeoSitemapFeed();
  assert.equal(validateSeoProgrammaticSitemapFeed(sitemap).ok,true);
  const robots=getSeoRobotsPolicy();
  assert.equal(validateSeoProgrammaticRobotsPolicy(robots).ok,true);
  assert.ok(robots.disallowedPaths.includes('/admin')&&robots.disallowedPaths.includes('/api')&&robots.disallowedPaths.includes('/account'));
  assert.equal(validateSeoProgrammaticCanonicalFeed(getSeoCanonicalFeed()).ok,true);
  getSeoStructuredDataPayloads().forEach((x)=>assert.equal(validateSeoProgrammaticStructuredDataPayload(x).ok,true));
  const safety=getSeoProgrammaticSafetyReport();
  assert.equal(safety.status,'pass');
  const cov=getSeoProgrammaticCoverageReport();
  assert.equal(validateSeoProgrammaticCoverageReport(cov).ok,true);
  assert.equal(cov.tier1aCovered,true); assert.equal(cov.tier1bCovered,true); assert.equal(cov.supportedTradableAssetCount,12); assert.equal(cov.reasoningDiagnosticAssetCount,2); assert.equal(cov.representedReasoningAssetCount,14);
  assert.equal(validateSeoProgrammaticCoverageReport({...cov,supportedTradableAssetCount:13}).ok,false);
  assert.equal(validateSeoProgrammaticCoverageReport({...cov,reasoningDiagnosticAssetCount:1}).ok,false);
  assert.equal(validateSeoProgrammaticCoverageReport({...cov,representedReasoningAssetCount:13}).ok,false);
}
