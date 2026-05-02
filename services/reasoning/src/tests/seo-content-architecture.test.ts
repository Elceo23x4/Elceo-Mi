import { validateSeoContentArchitectureSnapshot, validateSeoKeywordDefinition, validateSeoPageDefinition } from '@elceo/schemas';
import { getSeoContentArchitectureSnapshot, listSeoPagesByKind } from '../seo-content/index.js';

export function runSeoContentArchitectureTests(): void {
  if (!validateSeoPageDefinition({ pageId: 'a', slug: 'a', pageKind: 'asset_page', titleTemplate: 't', metaDescriptionTemplate: 'm', h1Template: 'h', canonicalPath: '/a', freshnessClass: 'daily', targetKeywords: [], relatedEvidenceTypes: [], relatedAssets: [], internalLinkTargets: [], structuredDataKind: 'article', isLaunchScope: true }).ok) throw new Error('seo page valid failed');
  if (validateSeoKeywordDefinition({ keywordId: '', phrase: '' }).ok) throw new Error('invalid keyword should fail');
  const snap = getSeoContentArchitectureSnapshot(new Date().toISOString()); if (!validateSeoContentArchitectureSnapshot(snap).ok) throw new Error('seo snapshot invalid');
  if (listSeoPagesByKind('asset_page').length === 0 || listSeoPagesByKind('macro_event_page').length===0 || listSeoPagesByKind('institution_page').length===0 || listSeoPagesByKind('market_explainer_page').length===0) throw new Error('missing launch families');
  const slugs=snap.pages.map((x)=>x.slug); if(new Set(slugs).size!==slugs.length) throw new Error('duplicate slug');
}
