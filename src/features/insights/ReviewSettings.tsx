import { useState } from "react";
import { Modal } from "../../components/ui";
import { useWorkspace } from "../../data/workspace/context";
import {
  defaultReviewSettings,
  scorecardMeasures,
} from "../../config/reviewSettings";
const measureLabels = {
  completed: "Completed work orders",
  duration: "Average completion duration",
  open: "Open workload",
  followups: "Follow-up workload",
  timeliness: "Verified appointment timeliness",
  ratings: "Verified ratings",
};
export function ReviewSettings({ onClose }: { onClose: () => void }) {
  const { reviewSettings, updateReviewSettings } = useWorkspace();
  const [draft, setDraft] = useState(structuredClone(reviewSettings)),
    [error, setError] = useState("");
  const fields = {
    highVolumeOrders: "High volume: at least this many report records",
    multipleAgedOrders: "Multiple aging orders: at least",
    pendingApprovals: "Pending approval review: at least",
    unassignedOrders: "Unassigned maintenance review: at least",
    repeatedCategoryOrders:
      "Repeated category: at least this many distinct work orders",
    minimumCompletionSample: "Scorecard minimum eligible completion sample",
  };
  return (
    <Modal title="Operational review settings" onClose={onClose}>
      <p>
        Proposed session-only review thresholds, not risk ratings, service
        levels or an approved vendor quality methodology. Work-order aging
        continues to use the existing Demo rules setting. Settings reset on
        reload.
      </p>
      <form
        className="rules-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            updateReviewSettings(draft);
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid settings.");
          }
        }}
      >
        {Object.entries(fields).map(([key, text]) => (
          <label key={key}>
            {text}
            <input
              required
              type="number"
              min="1"
              max="100000"
              step="1"
              value={draft[key as keyof typeof fields]}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
        <fieldset>
          <legend>Vendor scorecard measurements</legend>
          <p>
            Turning a measurement on does not create missing source data. No
            numerical quality score is enabled.
          </p>
          {scorecardMeasures.map((key) => (
            <label className="insight-check" key={key}>
              <input
                type="checkbox"
                checked={draft.scorecardMeasures.includes(key)}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    scorecardMeasures: e.target.checked
                      ? [...d.scorecardMeasures, key]
                      : d.scorecardMeasures.filter((v) => v !== key),
                  }))
                }
              />
              {measureLabels[key]}
            </label>
          ))}
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => setDraft(structuredClone(defaultReviewSettings))}
          >
            Restore review defaults
          </button>
          <button className="primary" type="submit">
            Apply review settings
          </button>
        </div>
      </form>
    </Modal>
  );
}
