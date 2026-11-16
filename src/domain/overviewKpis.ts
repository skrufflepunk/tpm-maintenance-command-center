import {
  age,
  completionStats,
  dateKey,
  isActive,
  localDate,
  matchesReason,
} from "./rules";
import type { Rules, WorkOrder } from "./types";
export interface OverviewKpi {
  id: string;
  title: string;
  value: number | null;
  note: string;
  scope: string;
  rows: WorkOrder[];
  unit?: string;
}
/** All cards share the filtered snapshot and report-as-of clock, never the browser month. */
export function overviewKpis(
  rows: WorkOrder[],
  reference: string,
  rules: Rules,
): OverviewKpi[] {
  const active = rows.filter(isActive),
    pending = rows.filter((w) => matchesReason(w, "pending", reference, rules)),
    aged = rows.filter((w) => matchesReason(w, "aged", reference, rules));
  const reportDate = localDate(reference, rules.timezone),
    month = reportDate?.slice(0, 7);
  const completed = rows.filter((w) => w.status === "completed");
  const dated = completed.filter(
    (w) => dateKey(w.completedAt, rules.timezone) !== null,
  );
  const monthRows = dated.filter((w) => {
    const d = dateKey(w.completedAt, rules.timezone)!;
    return (
      month &&
      d.startsWith(month) &&
      d <= reportDate! &&
      (w.completedAt?.precision !== "instant" ||
        Date.parse(w.completedAt.value) <= Date.parse(reference))
    );
  });
  const stats = completionStats(rows, rules.timezone),
    mixed = stats.date.n > 0 && stats.instant.n > 0;
  const group = stats.date.n ? stats.date : stats.instant;
  const eligible = completed.filter((w) => {
    const s = completionStats([w], rules.timezone);
    return s.date.n + s.instant.n === 1;
  });
  const unknownStatus = rows.filter((w) => w.status === "unknown").length;
  return [
    {
      id: "active",
      title: "Open Work Orders",
      value: active.length,
      rows: active,
      note: `Known active · ${unknownStatus} unknown status excluded`,
      scope: `${rows.length} scoped records · report-as-of basis`,
    },
    {
      id: "pending",
      title: "Awaiting Approval",
      value: pending.length,
      rows: pending,
      note: `Confirmed pending · ${active.filter((w) => w.approvalState === "unknown").length} approval unknown`,
      scope: `${active.length} known active records · report-as-of basis`,
    },
    {
      id: "aged",
      title: `Over ${rules.agingNudgeDays} Days Old`,
      value: aged.length,
      rows: aged,
      note: `Active only · ${active.filter((w) => age(w, reference, rules) === null).length} age unknown`,
      scope: `Strictly > ${rules.agingNudgeDays} calendar days · proposed rule`,
    },
    {
      id: "month",
      title: "Completed This Month",
      value:
        !month || (completed.length > 0 && !dated.length)
          ? null
          : monthRows.length,
      rows: monthRows,
      note: `${completed.length - dated.length} missing/invalid completion dates excluded`,
      scope: `${month ?? "Unknown month"} · report month in ${rules.timezone}`,
    },
    {
      id: "average",
      title: "Average Days to Close",
      value: mixed ? null : group.mean,
      rows: mixed ? [] : eligible,
      unit: stats.date.n ? "calendar days" : "elapsed days",
      note: mixed
        ? "Mixed date precision · see separate duration statistics"
        : `n=${group.n} valid completed pairs · ${stats.excluded} excluded`,
      scope: stats.date.n
        ? "Calendar-day mean · all scoped completions"
        : "Elapsed-day mean · all scoped completions",
    },
  ];
}
