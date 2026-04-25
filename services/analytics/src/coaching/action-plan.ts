import type { CoachingActionItem, CoachingFocusArea } from '@elceo/types';

const ACTION_TEMPLATES: Record<CoachingFocusArea['theme'], { instruction: string; successMetric: string }> = {
  discipline: {
    instruction: 'Require checklist completion before every entry for the next review cycle.',
    successMetric: 'Increase disciplined executions and reduce weak/impulsive executions.'
  },
  setup_selection: {
    instruction: 'Reduce exposure to underperforming setup types until expectancy improves.',
    successMetric: 'Improve setup performance score and realized expectancy.'
  },
  risk_management: {
    instruction: 'Normalize per-trade risk sizing and stop placement discipline across all active setups.',
    successMetric: 'Reduce variance in loss size and keep risk-per-trade inside planned bounds.'
  },
  behavior_control: {
    instruction: 'Track and explicitly review repeated mistake tags before the next trading cycle.',
    successMetric: 'Reduce loss/impulsive association for repeated mistake behaviors.'
  },
  execution_precision: {
    instruction: 'Constrain entries to tighter deviation from planned entry levels.',
    successMetric: 'Improve adherence score and reduce average entry deviation.'
  },
  review_quality: {
    instruction: 'Complete full review fields for every newly closed case.',
    successMetric: 'Raise review coverage across closed cases.'
  },
  reasoning_alignment: {
    instruction: 'Re-audit reasoning-linked executions before repeating similar trades.',
    successMetric: 'Improve linked trade win rate and linked average R.'
  }
};

type ActionContext = {
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope: string;
  timeframeScope: string;
  generatedAt: string;
};

function actionId(theme: string, context: ActionContext): string {
  return `action|${theme}|${context.subjectKind}|${context.subjectId}|${context.assetScope}|${context.timeframeScope}|${context.generatedAt}`;
}

export function generateCoachingActionPlan(focusAreas: CoachingFocusArea[], context: ActionContext): CoachingActionItem[] {
  return [...focusAreas]
    .sort((a, b) => b.score - a.score || a.theme.localeCompare(b.theme))
    .slice(0, 6)
    .map((focus) => ({
      actionId: actionId(focus.theme, context),
      theme: focus.theme,
      priority: focus.priority,
      instruction: ACTION_TEMPLATES[focus.theme].instruction,
      successMetric: ACTION_TEMPLATES[focus.theme].successMetric,
      supportingFocusIds: [focus.focusId],
      score: focus.score
    }));
}
