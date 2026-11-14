import type { Snapshot, Status, WorkOrder } from "../domain/types";
const importedAt = "2026-11-13T14:15:00Z";
const account = "fictional-demo";
const reportScope = {
  comparisonKey: "demo-all",
  includedStatuses: [
    "open",
    "in_progress",
    "on_hold",
    "completed",
    "cancelled",
    "unknown",
  ] as Status[],
  description:
    "Fictional portfolio · all sample statuses · October–November 2026",
};
const provenance = "demo-work-orders";
const topics = [
  "Replace corridor light fixture",
  "Inspect kitchen drain",
  "Service cooling equipment",
  "Repair garden gate",
  "Check water pressure",
  "Inspect exterior seal",
];
const statuses: Status[] = [
  "open",
  "in_progress",
  "open",
  "on_hold",
  "completed",
  "in_progress",
  "completed",
  "open",
  "cancelled",
  "open",
  "completed",
  "unknown",
];
const created = [
  "2026-11-13",
  "2026-11-10",
  "2026-11-06",
  "2026-11-05",
  "2026-11-01",
  "2026-10-29",
  "2026-10-20",
  "2026-10-13",
  "2026-10-10",
  "2026-10-01",
  "2026-10-03",
  null,
];
const workOrders: WorkOrder[] = Array.from({ length: 24 }, (_, i) => {
  const n = i % 12,
    status = statuses[n],
    assignment =
      i % 7 === 0 ? "unknown" : i % 4 === 0 ? "unassigned" : "assigned";
  return {
    id: `demo:wo:${String(i + 1).padStart(3, "0")}`,
    sourceAccountId: account,
    sourceId: `wo-${i + 1}`,
    number: `DEMO-${1001 + i}`,
    propertyId: i === 23 ? null : `demo:p:${i % 3}`,
    summaryRedacted: topics[i % 6],
    categoryId: `cat:${i % 4}`,
    status,
    sourceStatus: status === "unknown" ? null : status,
    priority:
      i % 9 === 0
        ? "urgent"
        : i % 5 === 0
          ? "high"
          : i === 23
            ? "unknown"
            : "normal",
    sourcePriority:
      i === 23
        ? null
        : i % 9 === 0
          ? "urgent"
          : i % 5 === 0
            ? "high"
            : "normal",
    vendorId: assignment === "assigned" ? `demo:v:${i % 3}` : null,
    vendorAssignmentState: assignment,
    approvalState:
      i % 5 === 0 ? "pending" : i % 7 === 0 ? "unknown" : "not_required",
    createdAt:
      created[n] && i !== 19 ? { value: created[n], precision: "date" } : null,
    completedAt:
      status === "completed"
        ? { value: n === 10 ? "2026-10-15" : "2026-11-08", precision: "date" }
        : null,
    sourceUrl: null,
    fieldCoverage: {
      createdAt: i === 19 || !created[n] ? "value_missing" : "present",
      vendorAssignmentState:
        assignment === "unknown"
          ? "column_unavailable"
          : assignment === "unassigned"
            ? "explicitly_absent"
            : "present",
      status: status === "unknown" ? "value_missing" : "present",
    },
    provenance,
  };
});
export const demoSnapshot: Snapshot = {
  id: "fictional-snapshot-1",
  sourceMode: "demo",
  schemaVersion: "1",
  mappingVersion: "demo-1",
  rulesVersion: "demo-1",
  importedAt,
  datasets: [
    {
      id: provenance,
      datasetType: "workOrders",
      sourceAccountId: account,
      reportAsOf: "2026-11-13T14:00:00Z",
      importedAt,
      sourceTimezone: "America/Mexico_City",
      mappingVersion: "demo-1",
      reportScope,
      completeness: "partial",
      coverageFields: [
        "status",
        "priority",
        "vendorAssignmentState",
        "approvalState",
        "createdAt",
      ],
      rowCounts: { accepted: 24, rejected: 0 },
    },
    ...(["properties", "vendors"] as const).map((datasetType) => ({
      id: `demo-${datasetType}`,
      datasetType,
      sourceAccountId: account,
      reportAsOf: null,
      importedAt,
      sourceTimezone: "America/Mexico_City",
      mappingVersion: "demo-1",
      reportScope,
      completeness: "unknown" as const,
      coverageFields: ["id", "displayName"],
      rowCounts: { accepted: 3, rejected: 0 },
    })),
  ],
  workOrders,
  properties: ["Juniper Court", "Cobalt Gardens", "Palmstone Commons"].map(
    (name, i) => ({
      id: `demo:p:${i}`,
      sourceAccountId: account,
      sourceId: `p-${i}`,
      displayName: name,
      coverageKind: "master",
      provenance: "demo-properties",
    }),
  ),
  vendors: [
    "Demo Fieldworks",
    "Demo Bluebird Services",
    "Demo Arc Maintenance",
  ].map((name, i) => ({
    id: `demo:v:${i}`,
    sourceAccountId: account,
    sourceId: `v-${i}`,
    displayName: name,
    categories: [`cat:${i}`],
    active: null,
    provenance: "demo-vendors",
  })),
  categories: ["Plumbing", "Electrical", "HVAC", "General"].map((name, i) => ({
    id: `cat:${i}`,
    label: name,
  })),
  qualitySummary: [
    {
      code: "PARTIAL_STATUS",
      severity: "warning",
      safeMessage:
        "2 records have unknown status; they are excluded from active and terminal counts.",
    },
    {
      code: "MISSING_AGE",
      severity: "warning",
      safeMessage:
        "1 active record has no creation date; aging calculations exclude it.",
    },
    {
      code: "ASSIGNMENT_COVERAGE",
      severity: "warning",
      safeMessage:
        "Assignment coverage is unavailable for 4 records; they are not assumed unassigned.",
    },
    {
      code: "UNKNOWN_PROPERTY",
      severity: "info",
      safeMessage: "1 record has an unknown property relationship.",
    },
  ],
};
