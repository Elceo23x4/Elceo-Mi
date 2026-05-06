import type { SeoContentArchitectureSnapshot, SeoInternalLinkEdge } from '@elceo/types';
export function buildSeoInternalLinkEdges(architecture: SeoContentArchitectureSnapshot): SeoInternalLinkEdge[] {
  const byKind=new Map<string,string[]>(); architecture.pages.forEach((p)=>{const a=byKind.get(p.pageKind)??[]; a.push(p.pageId); byKind.set(p.pageKind,a);});
  const out: SeoInternalLinkEdge[]=[];
  architecture.pages.forEach((p)=>p.internalLinkTargets.forEach((target)=>out.push({sourcePageId:p.pageId,targetPageId:target,anchorText:`Related: ${target}`,rationale:'page_target'})));
  architecture.internalLinkRules.forEach((r)=>{ const s=byKind.get(r.sourcePageKind)??[]; const t=byKind.get(r.targetPageKind)??[]; s.forEach((sp)=>t.slice(0,2).forEach((tp)=>out.push({sourcePageId:sp,targetPageId:tp,anchorText:r.anchorTemplate,rationale:r.rationale}))); });
  return out;
}
