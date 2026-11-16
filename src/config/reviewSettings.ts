export const scorecardMeasures = [
  "completed",
  "duration",
  "open",
  "followups",
  "timeliness",
  "ratings",
] as const;
export type ScorecardMeasure = (typeof scorecardMeasures)[number];
export interface ReviewSettings {
  highVolumeOrders: number;
  multipleAgedOrders: number;
  pendingApprovals: number;
  unassignedOrders: number;
  repeatedCategoryOrders: number;
  minimumCompletionSample: number;
  scorecardMeasures: ScorecardMeasure[];
}
export const defaultReviewSettings: ReviewSettings = {
  highVolumeOrders: 10,
  multipleAgedOrders: 2,
  pendingApprovals: 1,
  unassignedOrders: 1,
  repeatedCategoryOrders: 3,
  minimumCompletionSample: 3,
  scorecardMeasures: [
    "completed",
    "duration",
    "open",
    "followups",
    "timeliness",
    "ratings",
  ],
};
export function validateReviewSettings(
  settings: ReviewSettings,
): ReviewSettings {
  const { scorecardMeasures: measures, ...thresholds } = settings;
  if (
    Object.values(thresholds).some(
      (n) => !Number.isInteger(n) || n < 1 || n > 100000,
    )
  )
    throw new Error(
      "Review thresholds must be whole numbers from 1 to 100,000.",
    );
  if (
    !measures.length ||
    new Set(measures).size !== measures.length ||
    measures.some((m) => !scorecardMeasures.includes(m))
  )
    throw new Error(
      "Select at least one supported scorecard measurement without duplicates.",
    );
  return structuredClone(settings);
}
