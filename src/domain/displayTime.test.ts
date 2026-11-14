import { describe, expect, it } from "vitest";
import { displayReceiptTime } from "./displayTime";

describe("receipt time display", () => {
  it("uses Mexico City across the UTC date boundary", () => {
    expect(displayReceiptTime("2026-11-14T02:00:00Z")).toBe(
      "Nov 13, 2026, 8:00 PM · Mexico City",
    );
  });
  it("does not invent a receipt time when unavailable", () => {
    expect(displayReceiptTime(null)).toBe("Unknown");
    expect(displayReceiptTime("invalid")).toBe("Unknown");
  });
});
