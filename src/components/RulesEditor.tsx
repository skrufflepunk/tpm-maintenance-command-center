import { useState } from "react";
import type { Rules } from "../domain/types";
import { defaultRules, validateRules } from "../config/rules";
import { Modal } from "./ui";
export function RulesEditor({
  rules,
  onSave,
  onClose,
}: {
  rules: Rules;
  onSave: (r: Rules) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(rules),
    [error, setError] = useState("");
  return (
    <Modal title="Demo rule settings" onClose={onClose}>
      <p className="muted">
        Proposed values for this demo session only. These are not approved
        service levels. Demo dates use the illustrative {rules.timezone}{" "}
        timezone; CSV evaluation uses its declared report timezone.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSave(validateRules(draft));
            onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
        className="rules-form"
      >
        {(
          [
            {
              key: "agingNudgeDays",
              text: "Aging follow-up: strictly greater than (calendar days)",
            },
            {
              key: "noObservedChangeDays",
              text: "No observed change (elapsed days; requires history)",
            },
            {
              key: "staleAfterHours",
              text: "Work-order freshness threshold (elapsed hours)",
            },
          ] as const
        ).map(({ key, text }) => (
          <label key={key}>
            {text}
            <input
              type="number"
              required
              min={key === "agingNudgeDays" ? 0 : 1}
              step="1"
              value={draft[key]}
              onChange={(e) =>
                setDraft({ ...draft, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        <fieldset>
          <legend>Aging bucket boundaries (calendar days)</legend>
          <div className="boundary-inputs">
            {draft.agingBucketBoundaries.map((n, i) => (
              <label key={i}>
                Boundary {i + 1}
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={n}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      agingBucketBoundaries: draft.agingBucketBoundaries.map(
                        (v, j) => (i === j ? Number(e.target.value) : v),
                      ) as [number, number, number],
                    })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <p className="muted">
          No observed-change nudges are available without comparable history.
          Vendor freshness is unavailable; it does not inherit this threshold.
          Settings reset on reload.
        </p>
        <div className="form-actions">
          <button type="button" onClick={() => setDraft(defaultRules)}>
            Restore defaults
          </button>
          <button className="primary" type="submit">
            Apply demo rules
          </button>
        </div>
      </form>
    </Modal>
  );
}
