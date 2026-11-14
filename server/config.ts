import { readFileSync, mkdirSync, chmodSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { requireValue } from "./errors";
export interface ServerConfig {
  origin: string;
  local: boolean;
  dataDirectory: string;
  storageKey: Buffer;
  issuer: string;
  clientId: string;
  clientSecret: string;
  oidcOrigins: string[];
  users: Record<string, "administrator" | "viewer">;
  frameOrigins: string[];
  ingestionDirectory: string | null;
  allowScheduledCsv: boolean;
  port: number;
}
export function exactOrigins(input: string[], local = false) {
  return input.map((value) => {
    const url = new URL(value);
    requireValue(
      url.origin === value &&
        !url.username &&
        !url.password &&
        !url.hostname.includes("*") &&
        (url.protocol === "https:" ||
          (local &&
            url.protocol === "http:" &&
            ["127.0.0.1", "localhost"].includes(url.hostname))),
      500,
      "INVALID_CONFIG",
      "Configure exact HTTPS origins without paths or credentials.",
    );
    return value;
  });
}
export function readConfig(): ServerConfig {
  const origin = process.env.TPM_APP_ORIGIN ?? "https://unconfigured.invalid";
  const local =
    process.env.TPM_LOCAL_HTTP === "1" &&
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(new URL(origin).hostname);
  exactOrigins([origin], local);
  const keyPath = process.env.TPM_STORAGE_KEY_FILE;
  requireValue(
    keyPath,
    500,
    "INVALID_CONFIG",
    "Set TPM_STORAGE_KEY_FILE to a protected server-only key file.",
  );
  requireValue(
    (statSync(keyPath).mode & 0o077) === 0,
    500,
    "INVALID_CONFIG",
    "Storage key file must be private to the server account.",
  );
  const key = Buffer.from(readFileSync(keyPath, "utf8").trim(), "base64");
  requireValue(
    key.length === 32,
    500,
    "INVALID_CONFIG",
    "Storage key must contain 32 random bytes encoded as base64.",
  );
  const dataDirectory = resolve(
    process.env.TPM_DATA_DIRECTORY ?? "/var/lib/tpm-command-center",
  );
  mkdirSync(dataDirectory, { recursive: true, mode: 0o700 });
  chmodSync(dataDirectory, 0o700);
  const users = JSON.parse(
    readFileSync(process.env.TPM_USERS_FILE ?? "/etc/tpm/users.json", "utf8"),
  ) as Record<string, "administrator" | "viewer">;
  requireValue(
    Object.keys(users).length > 0 &&
      Object.values(users).every((role) =>
        ["administrator", "viewer"].includes(role),
      ),
    500,
    "INVALID_CONFIG",
    "Configure an explicit OIDC subject-to-role allowlist.",
  );
  const issuer = process.env.TPM_OIDC_ISSUER ?? "";
  requireValue(
    issuer && process.env.TPM_OIDC_CLIENT_ID,
    500,
    "INVALID_CONFIG",
    "Configure OIDC issuer and client ID before starting the protected server.",
  );
  const issuerUrl = new URL(issuer);
  exactOrigins([issuerUrl.origin], local);
  requireValue(
    !issuerUrl.username &&
      !issuerUrl.password &&
      !issuerUrl.search &&
      !issuerUrl.hash,
    500,
    "INVALID_CONFIG",
    "OIDC issuer is invalid.",
  );
  return {
    origin,
    local,
    dataDirectory,
    storageKey: key,
    issuer,
    clientId: process.env.TPM_OIDC_CLIENT_ID!,
    clientSecret: process.env.TPM_OIDC_CLIENT_SECRET_FILE
      ? readFileSync(process.env.TPM_OIDC_CLIENT_SECRET_FILE, "utf8").trim()
      : "",
    oidcOrigins: exactOrigins(
      (process.env.TPM_OIDC_ALLOWED_ORIGINS ?? issuerUrl.origin).split(","),
      local,
    ),
    users,
    frameOrigins: exactOrigins(
      (process.env.TPM_FRAME_ANCESTORS ?? "").split(",").filter(Boolean),
    ),
    ingestionDirectory: process.env.TPM_CSV_INBOX
      ? resolve(process.env.TPM_CSV_INBOX)
      : null,
    allowScheduledCsv: process.env.TPM_ALLOW_SCHEDULED_CSV === "true",
    port: Number(process.env.PORT ?? 8787),
  };
}
