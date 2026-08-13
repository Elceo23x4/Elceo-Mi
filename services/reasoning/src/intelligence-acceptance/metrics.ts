import type { FrozenCaseResult } from './contracts';
const rate = (n: number, d: number) => (d ? n / d : null);
const occupancy = (values: readonly (string | null)[]) =>
  Object.fromEntries(
    [...new Set(values)].sort().map((v) => [String(v), values.filter((x) => x === v).length]),
  );
const distribution = (values: readonly (number | null)[]) => {
  const v = values.filter((x): x is number => x !== null).sort((a, b) => a - b);
  return {
    sampleN: values.length,
    min: v[0] ?? null,
    max: v.at(-1) ?? null,
    median: v.length ? v[Math.floor((v.length - 1) / 2)] : null,
    zeroCount: values.filter((x) => x === 0).length,
    nullCount: values.filter((x) => x === null).length,
  };
};
export function segmentedEngineDiagnostics(cases: readonly FrozenCaseResult[]) {
  const pairs = cases.map((c) => ({ o: c.outputs, y: c.outcome.properties }));
  const sufficient = (value: string) => value === 'sufficient' || value === 'resolved';
  const ifp1Qualified = pairs.filter((x) => x.y.releaseAligned !== undefined);
  const ifp2 = pairs.map((x) => x.o.ifp2).filter((x): x is NonNullable<typeof x> => x !== null);
  const invalidations = pairs.filter((x) => x.o.ifp3.protocolState === 'invalidate_thesis');
  return {
    ifp1: {
      sampleN: pairs.length,
      releaseAlignmentAgreement: rate(
        ifp1Qualified.filter(
          (x) => (x.o.ifp1.reality.releaseAlignment.status === 'aligned') === x.y.releaseAligned,
        ).length,
        ifp1Qualified.length,
      ),
      reactionClassAgreement: rate(
        pairs.filter(
          (x) =>
            x.y.reactionClass !== undefined &&
            x.o.ifp1.reality.primaryPriceReaction.status === x.y.reactionClass,
        ).length,
        pairs.filter((x) => x.y.reactionClass !== undefined).length,
      ),
      initialImpulseAgreement: rate(
        pairs.filter(
          (x) =>
            x.y.initialImpulse ===
            (x.o.ifp1.reality.priceReactionTimeline.immediate.state === 'confirmed'),
        ).length,
        pairs.filter((x) => x.y.initialImpulse !== undefined).length,
      ),
      confirmationFollowThroughAgreement: rate(
        pairs.filter(
          (x) =>
            x.y.followThrough ===
            (x.o.ifp1.reality.priceReactionTimeline.followThrough.state === 'confirmed'),
        ).length,
        pairs.filter((x) => x.y.followThrough !== undefined).length,
      ),
      reversalRecognition: rate(
        pairs.filter(
          (x) =>
            x.y.reversal ===
            (x.o.ifp1.reality.priceReactionTimeline.reversalAbsorptionState === 'reversed'),
        ).length,
        pairs.filter((x) => x.y.reversal !== undefined).length,
      ),
      insufficientRate: rate(
        pairs.filter((x) => !sufficient(x.o.ifp1.finalizationStatus)).length,
        pairs.length,
      ),
      provenanceLimitedRate: rate(
        pairs.filter((x) => x.o.ifp1.warnings.some((w) => w.includes('provenance'))).length,
        pairs.length,
      ),
    },
    ifp2: {
      eligibleQueryN: ifp2.length,
      sufficiencyStateDistribution: occupancy(ifp2.map((x) => x.evidenceSufficiency)),
      uniqueComparableEvents: distribution(ifp2.map((x) => x.eligibleUniqueEventCount)),
      strongAnalogCounts: distribution(ifp2.map((x) => x.strongAnalogCount)),
      similarityDistribution: distribution(
        ifp2.flatMap((x) => x.matches.map((m) => m.similarityScore)),
      ),
      coverageDistribution: distribution(
        ifp2.flatMap((x) => x.matches.map((m) => m.featureCoverageRatio)),
      ),
      rankingStable: ifp2.every((x) => x.matches.every((m, i) => m.rank === i + 1)),
      outcomeRerankingProhibited: true,
      currentEventProbabilityProduced: false,
    },
    ifp3: {
      protocolStateDistribution: occupancy(pairs.map((x) => x.o.ifp3.protocolState)),
      unsupportedHardInvalidationCount: invalidations.filter(
        (x) => !x.o.ifp3.invalidationEvidence.confirmed,
      ).length,
      confirmedInvalidationCount: invalidations.filter(
        (x) => x.o.ifp3.invalidationEvidence.confirmed,
      ).length,
      waitUnderInsufficiencyCount: pairs.filter(
        (x) =>
          x.o.ifp3.protocolState === 'wait_for_confirmation' &&
          !sufficient(x.o.ifp3.evidenceSufficiency),
      ).length,
      archiveResolutionCount: pairs.filter((x) => x.o.ifp3.protocolState === 'archive_resolved')
        .length,
      provenanceLimitedCount: pairs.filter(
        (x) => x.o.ifp3.evidenceSufficiency === 'provenance_limited',
      ).length,
    },
    ifp4: {
      stateOccupancy: occupancy(pairs.map((x) => x.o.ifp4.cleanlinessState)),
      scoreDistribution: distribution(pairs.map((x) => x.o.ifp4.evidenceQualifiedScore)),
      coherencePairs: pairs
        .filter((x) => x.y.pathCoherence !== undefined)
        .map((x) => ({ score: x.o.ifp4.evidenceQualifiedScore, coherence: x.y.pathCoherence })),
      thresholdClustering: pairs.filter(
        (x) =>
          x.o.ifp4.evidenceQualifiedScore !== null &&
          [30, 50, 70].some((b) => Math.abs(x.o.ifp4.evidenceQualifiedScore! - b) <= 1),
      ).length,
    },
    ifp5: {
      stateOccupancy: occupancy(pairs.map((x) => x.o.ifp5.narrativeState)),
      halfLifeStatusOccupancy: occupancy(pairs.map((x) => x.o.ifp5.halfLife.halfLifeStatus)),
      resetCount: pairs.filter((x) => x.o.ifp5.epochReset).length,
      recoveryCount: pairs.filter((x) => x.o.ifp5.recoveryObserved).length,
      continuationEvaluableCount: pairs.filter((x) => x.y.narrativeContinued !== undefined).length,
    },
    ifp6: {
      directPositioningCoverage: rate(
        pairs.filter((x) => x.o.ifp6.crowdPainQualification === 'directly_supported').length,
        pairs.length,
      ),
      positioningEvidenceStateDistribution: occupancy(
        pairs.map((x) => x.o.ifp6.positioningEvidenceState),
      ),
      proxyOnlyCount: pairs.filter(
        (x) =>
          x.o.ifp6.crowdPainQualification !== 'directly_supported' &&
          x.o.ifp6.marketStressEvidenceSufficiency === 'sufficient',
      ).length,
      crowdingStateDistribution: occupancy(pairs.map((x) => x.o.ifp6.crowdingState)),
      pressuredSideDistribution: occupancy(pairs.map((x) => x.o.ifp6.pressuredSide)),
      squeezeEvaluableCount: pairs.filter((x) => x.y.squeezeAmplification !== undefined).length,
      proxyPromotionProhibited: true,
    },
    ifp7: {
      stateOccupancy: occupancy(pairs.map((x) => x.o.ifp7.fragilityState)),
      scoreDistribution: distribution(pairs.map((x) => x.o.ifp7.fragilityScore)),
      coverageDistribution: distribution(pairs.map((x) => x.o.ifp7.evidenceCoverageRatio)),
      dominantFamilyDistribution: occupancy(
        pairs.map((x) => x.o.ifp7.counterfactualDependency.dominantSupportFamily),
      ),
      supportConcentrationDistribution: distribution(
        pairs.map((x) => x.o.ifp7.counterfactualDependency.supportConcentrationIndex),
      ),
      falseComfortCount: pairs.filter(
        (x) => x.o.ifp7.fragilityState === 'low' && x.y.structuralBreakdown,
      ).length,
      highFragilityStableCount: pairs.filter(
        (x) =>
          ['high', 'severe'].includes(x.o.ifp7.fragilityState) && x.y.structuralBreakdown === false,
      ).length,
      interpretation: 'non_predictive_ordinal_not_probability',
    },
    confidence: {
      unexplainedZeroCount: pairs.filter(
        (x) => x.o.confidence.postClampValue === 0 && !x.o.confidence.reasonCodes.length,
      ).length,
      distribution: distribution(pairs.map((x) => x.o.confidence.postClampValue)),
    },
  };
}
