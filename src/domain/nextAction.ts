import { dateAtOrBefore } from "./insights";
import { isActive } from "./rules";
import type { Rules, Snapshot, WorkOrder } from "./types";
export function completionStatusConflict(
  w: WorkOrder,
  reference: string,
  timezone: string,
) {
  return isActive(w) && dateAtOrBefore(w.completedAt, reference, timezone);
}
export function sourceCompletionConflict(w: WorkOrder, snapshot: Snapshot) {
  const data = snapshot.datasets.find((d) => d.datasetType === "workOrders");
  return (
    !!data &&
    completionStatusConflict(
      w,
      data.reportAsOf ?? snapshot.importedAt,
      data.sourceTimezone,
    )
  );
}
export function nextReviewAction(
  w: WorkOrder,
  reference: string,
  rules: Rules,
) {
  if (completionStatusConflict(w, reference, rules.timezone))
    return "Verify the supplied completion date against the still-active source status and whether closure is needed in Rentvine. A date alone does not prove the job is complete; this dashboard cannot close records.";
  if (w.approvalState === "pending")
    return "Follow up with the owner regarding the pending approval before confirming any next steps. Approval waiting duration is unavailable.";
  if (w.vendorAssignmentState === "assigned" && w.vendorId)
    return "Request a vendor status update and ask whether an appointment date has been arranged. Verify the latest source activity before contacting anyone; no missed appointment is inferred.";
  if (
    w.vendorAssignmentState === "unassigned" &&
    w.fieldCoverage.vendorAssignmentState === "explicitly_absent"
  )
    return "Review the aging work order and vendor options in Rentvine before requesting scheduling. This dashboard cannot assign a vendor.";
  return "Review the aging work order and verify assignment coverage in Rentvine before deciding who to contact. Missing information does not establish a delay or lack of response.";
}
