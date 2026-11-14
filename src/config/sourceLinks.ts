/** Populate only after the account owner verifies the exact HTTPS origin.
 * No Rentvine host, endpoint or record URL is assumed or generated. */
export const verifiedRentvineOrigins: readonly string[] = [];
export function verifiedRecordUrl(
  raw: string | null,
  allowedOrigins: readonly string[] = verifiedRentvineOrigins,
): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const verified = allowedOrigins.some((origin) => {
      try {
        const o = new URL(origin);
        return (
          o.protocol === "https:" &&
          !o.username &&
          !o.password &&
          o.pathname === "/" &&
          !o.search &&
          !o.hash &&
          o.origin === url.origin
        );
      } catch {
        return false;
      }
    });
    return verified ? url.href : null;
  } catch {
    return null;
  }
}
