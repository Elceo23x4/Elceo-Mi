import assert from 'node:assert/strict';
import { validateSeoProgrammaticAssetIndexFeed, validateSeoProgrammaticCanonicalFeed, validateSeoProgrammaticRobotsPolicy, validateSeoProgrammaticSitemapFeed, validateSeoProgrammaticStructuredDataPayload } from '@elceo/schemas';
import { getSeoCanonicalFeed, getSeoMacroEventPages, getSeoProgrammaticCoverageReport, getSeoProgrammaticSafetyReport, getSeoRobotsPolicy, getSeoSitemapFeed, getSeoStructuredDataPayloads, getSeoSupportedAssetIndexFeed } from '../seo-programmatic-feeds/index.js';

export function runSeoProgrammaticFeedsTests(): void {
  const assets=getSeoSupportedAssetIndexFeed();
  assert.equal(assets.assets.length,14);
  assert.equal(validateSeoProgrammaticAssetIndexFeed(assets).ok,true);
  assert.ok(assets.assets.some((x)=>x.assetId==='xau_usd')&&assets.assets.some((x)=>x.assetId==='usd_cad'));
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
  assert.equal(cov.tier1aCovered,true); assert.equal(cov.tier1bCovered,true);
}
