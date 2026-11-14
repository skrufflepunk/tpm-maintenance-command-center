const receiptFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Mexico_City",
  dateStyle: "medium",
  timeStyle: "short",
});

/** Receipt/audit display only; source date calculations keep their declared zone. */
export function displayReceiptTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Unknown";
  return `${receiptFormatter.format(new Date(value))} · Mexico City`;
}
