import { sourceCompletionConflict } from "./nextAction";
import type { Snapshot, WorkOrder } from "./types";
export const vendorPurposes = {
  status: "Request a status update",
  appointment: "Confirm appointment details",
  estimate: "Request an estimate",
  aging: "Follow up on an aging work order",
} as const;
export type VendorPurpose = keyof typeof vendorPurposes;
export function vendorTemplate(
  order: WorkOrder,
  snapshot: Snapshot,
  purpose: VendorPurpose,
) {
  const property = snapshot.properties.find(
    (p) => p.id === order.propertyId,
  )?.displayName;
  const subject = `work order ${order.number}${property ? ` at ${property}` : ""}`;
  const request = {
    status: sourceCompletionConflict(order, snapshot)
      ? "The report contains a completion date while its status is still active. Could you help verify the recorded completion and any remaining steps?"
      : "Could you share the current status and any next steps?",
    appointment:
      "Could you confirm whether an appointment has been arranged and, if so, provide the date and time?",
    estimate:
      "Could you provide an estimate for the reported scope, or let us know what further information you need?",
    aging:
      "We are reviewing older open work orders. Could you share the current progress and any next steps?",
  }[purpose];
  const approval =
    order.approvalState === "pending"
      ? "\n\nThe report lists owner approval as pending. Please let us know whether a decision is needed before any proposed next steps."
      : "";
  return `Hello,\n\nI’m following up regarding ${subject}.${order.summaryRedacted ? `\n\nReported issue: ${order.summaryRedacted}` : ""}\n\n${request}${approval}\n\nThank you,\nTemecula Property Management`;
}
