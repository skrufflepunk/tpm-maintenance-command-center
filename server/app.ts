import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import type { ServerConfig } from "./config";
import { EncryptedStore } from "./store";
import { Authentication, administrator } from "./auth";
import { ManagementService } from "./management";
import { CsvDeliveryWorker } from "./delivery";
import { SafeError, requireValue } from "./errors";
import { rentvineStatus } from "./integrations/rentvine";
import type {
  DatasetKind,
  ImportOptions,
  ImportBehavior,
  ServerSettings,
  StaffIdentity,
} from "../src/data/managedTypes";
async function jsonBody(req: IncomingMessage) {
  requireValue(
    (req.headers["content-type"] ?? "").split(";")[0] === "application/json",
    415,
    "JSON_REQUIRED",
    "Use an application/json request.",
  );
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const data = Buffer.from(chunk);
    size += data.length;
    if (size > 8 * 1024 * 1024)
      throw new SafeError(413, "BODY_LIMIT", "Request exceeds 8 MiB.");
    chunks.push(data);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    throw new SafeError(400, "INVALID_JSON", "Request JSON is invalid.");
  }
}
function send(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}
export function createApplication(
  config: ServerConfig,
  store: EncryptedStore,
  staticRoot = resolve("dist"),
) {
  const auth = new Authentication(config, store),
    management = new ManagementService(store),
    worker = new CsvDeliveryWorker(management, config),
    rate = new Map<string, { at: number; count: number }>();
  const server = createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    res.setHeader(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors ${config.frameOrigins.length ? config.frameOrigins.join(" ") : "'none'"}`,
    );
    if (!config.frameOrigins.length) res.setHeader("X-Frame-Options", "DENY");
    if (!config.local)
      res.setHeader("Strict-Transport-Security", "max-age=31536000");
    let actor: StaffIdentity | null = null;
    try {
      const url = new URL(req.url ?? "/", config.origin),
        path = url.pathname,
        method = req.method ?? "GET";
      if (path === "/healthz" && method === "GET")
        return send(res, 200, { status: "protected-server-ready" });
      const rateKey = path.startsWith("/auth/")
        ? "signin:" + (req.socket.remoteAddress ?? "")
        : null;
      if (rateKey) {
        const entry = rate.get(rateKey);
        if (!entry || Date.now() - entry.at > 60000)
          rate.set(rateKey, { at: Date.now(), count: 1 });
        else {
          entry.count++;
          requireValue(
            entry.count <= 60,
            429,
            "SIGNIN_LIMIT",
            "Too many sign-in requests; retry later.",
          );
        }
      }
      if (path === "/auth/login" && method === "GET")
        return await auth.login(res);
      if (path === "/auth/callback" && method === "GET")
        return await auth.callback(req, res, url);
      let current: ReturnType<Authentication["session"]>;
      try {
        current = auth.session(req);
      } catch (error) {
        if (!path.startsWith("/api/") && method === "GET") {
          res.writeHead(302, { Location: "/auth/login" });
          return res.end();
        }
        throw error;
      }
      const { user, session, key } = current;
      actor = user;
      if (path.startsWith("/api/")) {
        if (method !== "GET") {
          auth.csrf(req, session);
          const rateKey = "write:" + user.subject,
            entry = rate.get(rateKey);
          if (!entry || Date.now() - entry.at > 60000)
            rate.set(rateKey, { at: Date.now(), count: 1 });
          else {
            entry.count++;
            requireValue(
              entry.count <= 120,
              429,
              "WRITE_LIMIT",
              "Too many write requests; retry later.",
            );
          }
        }
        if (path === "/api/bootstrap" && method === "GET") {
          management.cleanup();
          return send(res, 200, {
            user,
            csrf: session.csrf,
            sources: management
              .sources()
              .map((source) =>
                user.role === "administrator"
                  ? source
                  : { ...source, presets: {} },
              ),
            settings: management.settings(),
            ingestion: {
              configured:
                config.allowScheduledCsv && !!config.ingestionDirectory,
              generation: "Unverified; no Rentvine report generation enabled",
            },
            api: rentvineStatus,
            selectedSourceId: session.selectedSourceId,
          });
        }
        if (path === "/api/logout" && method === "POST") {
          auth.logout(req, res);
          return send(res, 200, { signedOut: true });
        }
        const match =
          /^\/api\/sources\/([a-f0-9-]{36})(?:\/(workspace|delivery|selection))?$/.exec(
            path,
          );
        if (match) {
          const id = match[1];
          if (match[2] === "workspace" && method === "GET")
            return send(res, 200, management.workspace(id, user));
          if (match[2] === "selection" && method === "POST") {
            management.workspace(id, user);
            auth.updateSelection(key, session, id);
            return send(res, 200, { selectedSourceId: id });
          }
          if (match[2] === "delivery" && method === "PUT") {
            administrator(user);
            const body = await jsonBody(req);
            return send(
              res,
              200,
              management.delivery(
                user,
                id,
                body as unknown as {
                  enabled: boolean;
                  intervalMinutes: number;
                  dataset: DatasetKind;
                },
              ),
            );
          }
          if (!match[2] && method === "PATCH") {
            administrator(user);
            return send(
              res,
              200,
              management.updateSource(
                user,
                id,
                (await jsonBody(req)) as unknown as {
                  approved: boolean;
                  behavior: ImportBehavior;
                },
              ),
            );
          }
        }
        if (path === "/api/selection/demo" && method === "POST") {
          auth.updateSelection(key, session, null);
          return send(res, 200, { selectedSourceId: null });
        }
        if (path === "/api/imports" && method === "GET")
          return send(res, 200, {
            imports: management.history(
              url.searchParams.get("sourceId") ?? undefined,
            ),
          });
        if (path === "/api/audit" && method === "GET") {
          administrator(user);
          return send(res, 200, { events: store.list("audit").slice(0, 200) });
        }
        if (path === "/api/sources" && method === "POST") {
          administrator(user);
          return send(
            res,
            201,
            management.createSource(user, await jsonBody(req)),
          );
        }
        if (path === "/api/settings" && method === "PUT") {
          administrator(user);
          return send(
            res,
            200,
            management.saveSettings(
              user,
              (await jsonBody(req)) as unknown as ServerSettings,
            ),
          );
        }
        if (path === "/api/imports/preview" && method === "POST") {
          administrator(user);
          const body = await jsonBody(req);
          requireValue(
            typeof body.sourceId === "string" &&
              typeof body.dataset === "string" &&
              typeof body.input === "string",
            400,
            "IMPORT_REQUIRED",
            "Source, dataset and CSV input are required.",
          );
          return send(
            res,
            200,
            await management.preview(
              user,
              body.sourceId,
              body.dataset as DatasetKind,
              body.input,
              body.options as ImportOptions,
              body.behavior as ImportBehavior,
            ),
          );
        }
        const commit = /^\/api\/imports\/([a-f0-9-]{36})\/commit$/.exec(path);
        if (commit && method === "POST") {
          administrator(user);
          return send(res, 200, management.commit(user, commit[1]));
        }
        if (path === "/api/api-configuration") {
          administrator(user);
          return send(res, 409, {
            ...rentvineStatus,
            message:
              "No credential input or live adapter is enabled. Ownership approval and verified official capabilities are required.",
          });
        }
        if (path === "/api/ingestion/run" && method === "POST") {
          administrator(user);
          requireValue(
            config.allowScheduledCsv && config.ingestionDirectory,
            409,
            "DELIVERY_DISABLED",
            "Server-side CSV processing is not configured or authorized.",
          );
          return send(res, 200, await worker.run());
        }
        return send(res, 404, {
          code: "NOT_FOUND",
          message: "Application endpoint not found.",
        });
      }
      requireValue(
        method === "GET" || method === "HEAD",
        405,
        "METHOD_NOT_ALLOWED",
        "Only read-only application requests are supported.",
      );
      const decoded = decodeURIComponent(path),
        file = resolve(
          staticRoot,
          "." + (decoded === "/" ? "/index.html" : decoded),
        );
      requireValue(
        file.startsWith(staticRoot + sep),
        404,
        "NOT_FOUND",
        "File not found.",
      );
      requireValue(
        !decoded.split("/").some((part) => part.startsWith(".")),
        404,
        "NOT_FOUND",
        "File not found.",
      );
      let bytes: Buffer;
      try {
        bytes = await readFile(file);
      } catch {
        throw new SafeError(404, "NOT_FOUND", "File not found.");
      }
      const mime: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
      };
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      });
      res.end(method === "HEAD" ? undefined : bytes);
    } catch (error) {
      const known = error instanceof SafeError;
      if (known && error.status === 403 && actor) {
        try {
          management.audit(actor, "access_denied", null, { code: error.code });
        } catch {
          /* Do not expose protected storage errors. */
        }
      }
      send(res, known ? error.status : 500, {
        code: known ? error.code : "REQUEST_FAILED",
        message: known
          ? error.message
          : "Request failed safely. No source data or credentials are included in this error.",
      });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.maxHeadersCount = 80;
  const cleanup = setInterval(() => {
    try {
      management.cleanup();
      auth.cleanup();
      for (const [id, entry] of rate)
        if (Date.now() - entry.at > 60000) rate.delete(id);
    } catch {
      /* Protected storage failures fail closed on API reads; no raw logs. */
    }
  }, 60000);
  cleanup.unref();
  const timer = setInterval(() => {
    void worker.run().catch(() => {
      /* No raw delivery details in logs. */
    });
  }, 60000);
  timer.unref();
  server.on("close", () => {
    clearInterval(cleanup);
    clearInterval(timer);
  });
  return { server, management, auth, worker };
}
