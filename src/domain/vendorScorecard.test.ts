import { it, expect } from "vitest";
import {
  defaultReviewSettings,
  validateReviewSettings,
} from "../config/reviewSettings";
import { defaultRules } from "../config/rules";
import { demoSnapshot } from "../data/demo";
import { directoryMetrics, demoDirectory } from "./vendors";
import { vendorScorecard } from "./vendorScorecard";
it("configures evidence/sample requirements without making up quality, appointment or rating scores", () => {
  const m = directoryMetrics(
    demoDirectory(demoSnapshot),
    demoSnapshot,
    "2026-11-13T14:00:00Z",
    defaultRules,
  )[0];
  expect(vendorScorecard(m, defaultReviewSettings)).toMatchObject({
    completed: 2,
    open: 3,
    n: 2,
    duration: null,
    timeliness: null,
    ratings: null,
    qualityScore: null,
  });
  expect(
    vendorScorecard(m, { ...defaultReviewSettings, minimumCompletionSample: 2 })
      .duration,
  ).toBe(19);
  expect(
    vendorScorecard(
      { ...m, assigned: null, active: null, completed: null },
      defaultReviewSettings,
    ),
  ).toMatchObject({
    duration: null,
    completed: null,
    open: null,
    followups: null,
  });
});
it("validates independent review settings, preserving original operational rules", () => {
  expect(validateReviewSettings(defaultReviewSettings)).toEqual(
    defaultReviewSettings,
  );
  const copy = validateReviewSettings(defaultReviewSettings);
  copy.scorecardMeasures = [];
  expect(defaultReviewSettings.scorecardMeasures.length).toBe(6);
  for (const settings of [
    { ...defaultReviewSettings, highVolumeOrders: 0 },
    { ...defaultReviewSettings, multipleAgedOrders: 1.1 },
    { ...defaultReviewSettings, minimumCompletionSample: NaN },
    { ...defaultReviewSettings, scorecardMeasures: [] },
    { ...defaultReviewSettings, scorecardMeasures: ["open", "open"] },
  ])
    expect(() =>
      validateReviewSettings(settings as typeof defaultReviewSettings),
    ).toThrow();
  expect(defaultRules.agingNudgeDays).toBe(7);
});
