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
  bindAddress: "127.0.0.1" | "0.0.0.0";
  authProvider: "oidc" | "google_workspace";
  workspaceDomain: string | null;
}
export function identityPolicy(
  provider: string,
  issuer: string,
  domain?: string,
) {
  requireValue(
    ["oidc", "google_workspace"].includes(provider),
    500,
    "INVALID_CONFIG",
    "Select oidc or google_workspace explicitly.",
  );
  if (provider === "google_workspace") {
    requireValue(
      issuer === "https://accounts.google.com" &&
        domain &&
        domain === domain.toLowerCase() &&
        /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain),
      500,
      "INVALID_CONFIG",
      "Google Workspace requires its canonical issuer and an exact reviewed lowercase Workspace domain.",
    );
  } else
    requireValue(
      !domain,
      500,
      "INVALID_CONFIG",
      "Workspace domain restrictions require the google_workspace authentication profile.",
    );
  return {
    authProvider: provider as ServerConfig["authProvider"],
    workspaceDomain: domain || null,
  };
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
function privateFile(path: string | undefined, kind: string) {
  requireValue(
    path,
    500,
    "INVALID_CONFIG",
    `Configure a protected server-only ${kind} file.`,
  );
  const metadata = statSync(path);
  requireValue(
    metadata.isFile() && (metadata.mode & 0o077) === 0,
    500,
    "INVALID_CONFIG",
    `The ${kind} file must be private to the server account.`,
  );
  return readFileSync(path, "utf8").trim();
}
export function readConfig(): ServerConfig {
  const origin = process.env.TPM_APP_ORIGIN ?? "https://unconfigured.invalid";
  const local =
    process.env.TPM_LOCAL_HTTP === "1" &&
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(new URL(origin).hostname);
  exactOrigins([origin], local);
  const key = Buffer.from(
    privateFile(process.env.TPM_STORAGE_KEY_FILE, "storage key"),
    "base64",
  );
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
    privateFile(
      process.env.TPM_USERS_FILE ?? "/etc/tpm/users.json",
      "staff allowlist",
    ),
  ) as Record<string, "administrator" | "viewer">;
  requireValue(
    users &&
      !Array.isArray(users) &&
      typeof users === "object" &&
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
  const policy = identityPolicy(
    process.env.TPM_AUTH_PROVIDER ?? "oidc",
    issuer,
    process.env.TPM_GOOGLE_WORKSPACE_DOMAIN,
  );
  const bindAddress = process.env.TPM_BIND_ADDRESS ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? 8787);
  requireValue(
    ["127.0.0.1", "0.0.0.0"].includes(bindAddress) &&
      Number.isInteger(port) &&
      port > 0 &&
      port <= 65535,
    500,
    "INVALID_CONFIG",
    "Use a supported bind address and a valid TCP port.",
  );
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
  const clientSecret = process.env.TPM_OIDC_CLIENT_SECRET_FILE
    ? privateFile(process.env.TPM_OIDC_CLIENT_SECRET_FILE, "OIDC client secret")
    : "";
  requireValue(
    policy.authProvider !== "google_workspace" || !!clientSecret,
    500,
    "INVALID_CONFIG",
    "The Google web client requires a protected client-secret mount.",
  );
  return {
    ...policy,
    origin,
    local,
    dataDirectory,
    storageKey: key,
    issuer,
    clientId: process.env.TPM_OIDC_CLIENT_ID!,
    clientSecret,
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
    port,
    bindAddress: bindAddress as ServerConfig["bindAddress"],
  };
}
