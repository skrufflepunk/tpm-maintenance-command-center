import type { ReviewSettings } from "../config/reviewSettings";
import type { VendorMetrics } from "./vendors";
export function vendorScorecard(m: VendorMetrics, settings: ReviewSettings) {
  const n = m.duration.date.n + m.duration.instant.n;
  return {
    completed: m.completed,
    open: m.active,
    followups: m.assigned === null ? null : m.followups.length,
    duration:
      m.assigned !== null && n >= settings.minimumCompletionSample
        ? m.average
        : null,
    n,
    excluded: m.duration.excluded,
    durationNote:
      m.assigned === null
        ? "No verified join"
        : n < settings.minimumCompletionSample
          ? `n=${n}; minimum ${settings.minimumCompletionSample} eligible completions required`
          : m.duration.date.n && m.duration.instant.n
            ? "Mixed precision; separate cohorts required"
            : `${m.durationBasis} · n=${n}`,
    timeliness: null,
    ratings: null,
    qualityScore: null,
  };
}
