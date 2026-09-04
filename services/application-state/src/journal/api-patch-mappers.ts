import type { JournalAdjustExecutionRequest, JournalCancelRequest, JournalCloseRequest, JournalExecuteRequest, JournalPartialCloseRequest, JournalPlanRequest, JournalReviewRequest } from '@elceo/types';
import type { JournalCasePatch } from './case-service';
import type { CanonicalJournalCase } from '@elceo/types';

function defined<T extends object>(value: { [K in keyof T]?: T[K] | undefined }): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}

export function mapJournalPlanRequest(input: JournalPlanRequest): JournalCasePatch {
  return {
    ...(input.title !== undefined ? { identity: { title: input.title } } : {}),
    plan: defined<CanonicalJournalCase['plan']>({ direction:input.direction, thesis:input.thesis, setupType:input.setupType, conviction:input.conviction, entryPricePlanned:input.entryPricePlanned, stopLossPlanned:input.stopLossPlanned, takeProfitPlanned:input.takeProfitPlanned, riskAmountPlanned:input.riskAmountPlanned, riskPercentPlanned:input.riskPercentPlanned, invalidationNote:input.invalidationNote, executionChecklist:input.executionChecklist })
  };
}
export function mapJournalExecuteRequest(input: JournalExecuteRequest): JournalCasePatch {
  return { execution: defined<CanonicalJournalCase['execution']>({ entryPriceExecuted:input.entryPriceExecuted, positionSize:input.positionSize, openedAt:input.openedAt, notes:input.notes, executionQuality:input.executionQuality }) };
}
export function mapJournalAdjustRequest(input: JournalAdjustExecutionRequest): JournalCasePatch {
  return {
    execution: defined<CanonicalJournalCase['execution']>({ entryPriceExecuted:input.entryPriceExecuted, positionSize:input.positionSize, notes:input.notes, executionQuality:input.executionQuality, lastAdjustedAt:input.lastAdjustedAt }),
    plan: defined<CanonicalJournalCase['plan']>({ stopLossPlanned:input.stopLossPlanned, takeProfitPlanned:input.takeProfitPlanned })
  };
}
export function mapJournalPartialCloseRequest(input: JournalPartialCloseRequest): JournalCasePatch {
  return { closure: defined<CanonicalJournalCase['closure']>({ exitPrice:input.exitPrice, pnlAmount:input.pnlAmount, pnlPercent:input.pnlPercent, rMultiple:input.rMultiple, closureReason:input.closureReason, outcome:input.outcome }) };
}
export function mapJournalCloseRequest(input: JournalCloseRequest): JournalCasePatch {
  return { closure: defined<CanonicalJournalCase['closure']>({ exitPrice:input.exitPrice, closedAt:input.closedAt, pnlAmount:input.pnlAmount, pnlPercent:input.pnlPercent, rMultiple:input.rMultiple, outcome:input.outcome, closureReason:input.closureReason }) };
}
export function mapJournalCancelRequest(input: JournalCancelRequest): JournalCasePatch {
  return { closure: defined<CanonicalJournalCase['closure']>({ closureReason:input.closureReason }) };
}
export function mapJournalReviewRequest(input: JournalReviewRequest): JournalCasePatch {
  return { review: defined<CanonicalJournalCase['review']>({ reviewedAt:input.reviewedAt, whatWentWell:input.whatWentWell, whatWentWrong:input.whatWentWrong, lessons:input.lessons, behaviorTags:input.behaviorTags, followUpActions:input.followUpActions }) };
}
