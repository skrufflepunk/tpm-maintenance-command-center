import { expect, it } from "vitest";
import { followUpTemplate } from "./messageTemplates";
import { demoSnapshot } from "../data/demo";
it("personalizes only supplied work order details and recipient-appropriate requests", () => {
  const w = demoSnapshot.workOrders[0];
  for (const role of ["owner", "tenant", "vendor"] as const) {
    const text = followUpTemplate(w, demoSnapshot, role);
    expect(text).toContain(w.number);
    expect(text).toContain("Juniper Court");
    expect(text).toContain(w.summaryRedacted);
    expect(text).toContain("Temecula Property Management");
    expect(text).not.toMatch(
      /missed|ignored|failed to respond|confirmed appointment|scheduled for|emergency/i,
    );
  }
  expect(followUpTemplate(w, demoSnapshot, "owner")).toContain(
    "awaiting owner approval",
  );
});
it("does not claim approval, schedule, history, or a missing property/vendor when unavailable", () => {
  const w = {
    ...demoSnapshot.workOrders[0],
    propertyId: null,
    summaryRedacted: null,
    approvalState: "unknown" as const,
  };
  expect(followUpTemplate(w, demoSnapshot, "owner")).not.toContain(
    "awaiting owner approval",
  );
  expect(followUpTemplate(w, demoSnapshot, "owner")).not.toContain("Unknown");
  expect(followUpTemplate(w, demoSnapshot, "tenant")).not.toContain(
    "Reported issue",
  );
  expect(followUpTemplate(w, demoSnapshot, "tenant")).not.toContain("Juniper");
  expect(followUpTemplate(w, demoSnapshot, "vendor")).not.toMatch(
    /appointment|confirmed|committed/,
  );
});
it("frames an explicitly unassigned vendor message as an inquiry, not an existing commitment", () => {
  const w = {
    ...demoSnapshot.workOrders[0],
    vendorId: null,
    vendorAssignmentState: "unassigned" as const,
  };
  expect(followUpTemplate(w, demoSnapshot, "vendor")).toContain(
    "whether this type of work is within your scope",
  );
  expect(followUpTemplate(w, demoSnapshot, "vendor")).not.toContain(
    "your scheduled visit",
  );
});
