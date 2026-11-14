import { expect, it } from "vitest";
import { verifiedRecordUrl } from "./sourceLinks";
const origin = "https://records.example.test";
it("leaves all source actions unavailable until an exact HTTPS origin is verified", () => {
  expect(verifiedRecordUrl(`${origin}/synthetic-record`)).toBeNull();
  expect(verifiedRecordUrl(null, [origin])).toBeNull();
  expect(verifiedRecordUrl(`${origin}/synthetic-record`, [origin])).toBe(
    `${origin}/synthetic-record`,
  );
});
it.each([
  "javascript:alert(1)",
  "http://records.example.test/synthetic-record",
  "https://evil.example.test",
  "https://records.example.test.evil.test/",
  "https://records.example.test:444/",
  "https://user:password@records.example.test/",
  "/relative",
  "not a URL",
])("rejects unverified or unsafe URL %s", (value) =>
  expect(verifiedRecordUrl(value, [origin])).toBeNull(),
);
it("rejects non-origin allowlist entries and never invents a record URL", () => {
  for (const invalid of [
    `${origin}/path`,
    `${origin}/?q=x`,
    "http://records.example.test",
    "https://user@records.example.test/",
  ])
    expect(
      verifiedRecordUrl(`${origin}/synthetic-record`, [invalid]),
    ).toBeNull();
  expect(verifiedRecordUrl("", [origin])).toBeNull();
});
