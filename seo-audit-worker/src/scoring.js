export const CATEGORY_WEIGHTS = {
  reachability: 20,
  crawlability: 25,
  indexability: 25,
  contentVisibility: 15,
  metadata: 10,
  discovery: 5,
};

const ISSUE_EARNED_WEIGHT_MULTIPLIERS = {
  low: 0.85,
  medium: 0.55,
  high: 0.2,
};

function roundWeight(value) {
  return Number(value.toFixed(2));
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function isIncludedInScore(status) {
  return status === "passed" || status === "issue";
}

function getExclusionReason(status) {
  if (status === "not_applicable") {
    return "not_applicable";
  }

  if (status === "system_error") {
    return "system_error";
  }

  return null;
}

function getEarnedWeight({ status, severity, scoreWeight, id }) {
  if (status === "passed") {
    return scoreWeight;
  }

  if (status === "issue") {
    if (!severity) {
      throw new Error(`Scored issue ${id} is missing severity.`);
    }

    const multiplier = ISSUE_EARNED_WEIGHT_MULTIPLIERS[severity];
    if (typeof multiplier !== "number") {
      throw new Error(`Scored issue ${id} has unsupported severity "${severity}".`);
    }

    return roundWeight(scoreWeight * multiplier);
  }

  return 0;
}

function createCategoryAccumulator(categoryId) {
  return {
    categoryId,
    categoryWeight: CATEGORY_WEIGHTS[categoryId] ?? 0,
    earnedWeight: 0,
    availableWeight: 0,
    totalPossibleWeight: 0,
  };
}

function createCategoryBreakdown(accumulator) {
  const { earnedWeight, availableWeight, totalPossibleWeight } = accumulator;

  return {
    score:
      availableWeight > 0 ? clampScore((earnedWeight / availableWeight) * 100) : 0,
    confidence:
      totalPossibleWeight > 0
        ? clampScore((availableWeight / totalPossibleWeight) * 100)
        : 0,
    earnedWeight: roundWeight(earnedWeight),
    availableWeight: roundWeight(availableWeight),
    totalPossibleWeight: roundWeight(totalPossibleWeight),
    categoryWeight: accumulator.categoryWeight,
  };
}

export function buildWeightedScoreBreakdown(checks) {
  const categoryAccumulators = Object.fromEntries(
    Object.keys(CATEGORY_WEIGHTS).map((categoryId) => [
      categoryId,
      createCategoryAccumulator(categoryId),
    ])
  );

  const ruleBreakdowns = checks.map((check) => {
    if (typeof check.scoreWeight !== "number") {
      throw new Error(`Scored rule ${check.id} is missing scoreWeight.`);
    }

    const categoryId = check.category;
    const accumulator =
      categoryAccumulators[categoryId] ?? createCategoryAccumulator(categoryId);
    categoryAccumulators[categoryId] = accumulator;

    const includedInScore = isIncludedInScore(check.status);
    const earnedWeight = getEarnedWeight(check);
    const exclusionReason = getExclusionReason(check.status);

    accumulator.totalPossibleWeight += check.scoreWeight;
    if (includedInScore) {
      accumulator.availableWeight += check.scoreWeight;
      accumulator.earnedWeight += earnedWeight;
    }

    return {
      ruleId: check.id,
      categoryId,
      status: check.status,
      severity: check.severity ?? null,
      ruleWeight: check.scoreWeight,
      earnedWeight,
      includedInScore,
      exclusionReason,
      scoreImpact: roundWeight(check.scoreWeight - earnedWeight),
    };
  });

  const categoryBreakdowns = Object.fromEntries(
    Object.entries(categoryAccumulators).map(([categoryId, accumulator]) => [
      categoryId,
      createCategoryBreakdown(accumulator),
    ])
  );

  const includedCategories = Object.values(categoryBreakdowns).filter(
    (category) => category.availableWeight > 0
  );
  const includedCategoryWeightTotal = includedCategories.reduce(
    (sum, category) => sum + category.categoryWeight,
    0
  );
  const overallScore =
    includedCategoryWeightTotal > 0
      ? clampScore(
          includedCategories.reduce(
            (sum, category) => sum + category.score * category.categoryWeight,
            0
          ) / includedCategoryWeightTotal
        )
      : 0;
  const overallConfidence = clampScore(
    Object.values(categoryBreakdowns).reduce(
      (sum, category) => sum + category.confidence * category.categoryWeight,
      0
    ) /
      Object.values(CATEGORY_WEIGHTS).reduce((sum, weight) => sum + weight, 0)
  );
  const overallEarnedWeight = roundWeight(
    Object.values(categoryBreakdowns).reduce(
      (sum, category) => sum + category.earnedWeight,
      0
    )
  );
  const overallAvailableWeight = roundWeight(
    Object.values(categoryBreakdowns).reduce(
      (sum, category) => sum + category.availableWeight,
      0
    )
  );
  const overallTotalPossibleWeight = roundWeight(
    Object.values(categoryBreakdowns).reduce(
      (sum, category) => sum + category.totalPossibleWeight,
      0
    )
  );

  return {
    model: "weighted_rule_scoring",
    overall: {
      score: overallScore,
      confidence: overallConfidence,
      earnedWeight: overallEarnedWeight,
      availableWeight: overallAvailableWeight,
      totalPossibleWeight: overallTotalPossibleWeight,
    },
    categories: categoryBreakdowns,
    rules: ruleBreakdowns,
  };
}
