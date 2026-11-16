import { expect, it } from "vitest";
import { demoSnapshot } from "../data/demo";
import { vendorPurposes, vendorTemplate } from "./vendorTemplates";
it("creates four request-only drafts from supplied work-order facts", () => {
  const w = demoSnapshot.workOrders[9];
  for (const purpose of Object.keys(
    vendorPurposes,
  ) as (keyof typeof vendorPurposes)[]) {
    const text = vendorTemplate(w, demoSnapshot, purpose);
    expect(text).toContain(w.number);
    expect(text).toContain(w.summaryRedacted);
    expect(text).not.toMatch(
      /late|unresponsive|missed|scheduled for|confirmed for|tomorrow|\d{1,2}:\d{2}/i,
    );
  }
  expect(vendorTemplate(w, demoSnapshot, "appointment")).toContain(
    "whether an appointment has been arranged",
  );
  expect(vendorTemplate(w, demoSnapshot, "estimate")).toContain(
    "provide an estimate",
  );
});
it("does not invent issue or property details when missing", () => {
  const w = {
    ...demoSnapshot.workOrders[9],
    propertyId: null,
    summaryRedacted: null,
  };
  const text = vendorTemplate(w, demoSnapshot, "status");
  expect(text).not.toContain("Reported issue:");
  expect(text).not.toContain(" at ");
  expect(text).toContain(w.number);
});
