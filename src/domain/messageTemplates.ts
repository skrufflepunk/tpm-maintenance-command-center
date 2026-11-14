import type { Snapshot, WorkOrder } from "./types";
export type Audience = "owner" | "tenant" | "vendor";
/** Editable, contact-free templates. No sending, AI generation, promises or inferred activity. */
export function followUpTemplate(
  w: WorkOrder,
  snapshot: Snapshot,
  audience: Audience,
): string {
  const property = snapshot.properties.find(
    (p) => p.id === w.propertyId,
  )?.displayName;
  const context = `work order ${w.number}${property && property !== "Unknown property name" ? ` at ${property}` : ""}`;
  const issue = w.summaryRedacted
    ? `\n\nReported issue: ${w.summaryRedacted}`
    : "";
  const request =
    audience === "owner"
      ? w.approvalState === "pending"
        ? "Our current report lists this work order as awaiting owner approval. Please review the request and let us know your decision or any questions."
        : "Please review the maintenance request and let us know if you have any questions or information we should consider."
      : audience === "vendor"
        ? w.vendorAssignmentState === "unassigned"
          ? "We are reviewing vendor options for this maintenance request. Please let us know whether this type of work is within your scope and whether you are available to discuss it."
          : "Could you share any available progress information and the next steps for this maintenance request? Please confirm any proposed schedule before arrangements are made."
        : "Could you let us know the current condition of the reported issue and any information that would help us coordinate the next steps?";
  return `Hello,\n\nI’m following up regarding ${context}.${issue}\n\n${request}\n\nThank you,\nTemecula Property Management`;
}
