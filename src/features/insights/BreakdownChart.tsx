import { useState } from "react";
import type { Breakdown } from "../../domain/insights";
export function BreakdownChart({
  title,
  groups,
  onSelect,
}: {
  title: string;
  groups: Breakdown[];
  onSelect: (group: Breakdown) => void;
}) {
  const [limit, setLimit] = useState(8);
  const max = Math.max(1, ...groups.map((g) => g.rows.length));
  return (
    <div className="insight-breakdown" role="group" aria-label={title}>
      {!groups.length ? (
        <p className="empty-inline">No records in this scope.</p>
      ) : (
        <>
          {groups.slice(0, limit).map((g) => (
            <button
              className="insight-bar-button"
              key={g.key}
              onClick={() => onSelect(g)}
              aria-label={`${title}: ${g.label}, ${g.rows.length} work orders`}
            >
              <span>{g.label}</span>
              <strong>{g.rows.length}</strong>
              <span className="insight-bar-track" aria-hidden="true">
                <span style={{ width: `${(100 * g.rows.length) / max}%` }} />
              </span>
            </button>
          ))}
          {groups.length > limit ? (
            <button
              className="text-button"
              onClick={() => setLimit((n) => n + 20)}
            >
              Show more {title.toLowerCase()} ({groups.length - limit}{" "}
              remaining)
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
