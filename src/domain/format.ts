export const metricValue = (value: number | null, digits = 0) =>
  value === null
    ? "Unavailable"
    : value.toLocaleString("en-US", { maximumFractionDigits: digits });
