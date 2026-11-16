import type { Reason } from "./types";
export const reasonNames: Record<Reason, string> = {
  active: "Known active backlog",
  urgent: "Source urgent",
  pending: "Pending approvals",
  aged: "Aging follow-ups",
  unassigned: "Explicitly unassigned",
  completed: "Observed completions",
};
