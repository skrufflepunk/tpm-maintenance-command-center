/** Synthetic local test identity provider only. Never imported by the production entrypoint. */
import { createServer } from "node:http";
import type { Server } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ServerConfig } from "./config";
import { EncryptedStore } from "./store";
import { createApplication } from "./app";
export async function listen(server: Server, port = 0) {
  await new Promise<void>((resolve) =>
    server.listen(port, "127.0.0.1", resolve),
  );
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
export async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
export async function testSystem(
  options: {
    port?: number;
    issuerPort?: number;
    origin?: string;
    directory?: string;
    frameOrigins?: string[];
  } = {},
) {
  const directory =
    options.directory ??
    (await mkdtemp(join(tmpdir(), "tpm-synthetic-phase6-")));
  const { privateKey, publicKey } = await generateKeyPair("RS256"),
    jwk = {
      ...(await exportJWK(publicKey)),
      kid: "synthetic-test-key",
      alg: "RS256",
      use: "sig",
    };
  const codes = new Map<
    string,
    { sub: string; nonce: string; challenge: string; redirect: string }
  >();
  const controls: {
    nonce?: string;
    audience?: string;
    expired?: boolean;
    hd?: string;
    emailVerified?: boolean;
    subject?: string;
  } = {};
  let issuer = "",
    appOrigin = options.origin ?? "";
  const idp = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", issuer);
    res.setHeader("Cache-Control", "no-store");
    const json = (body: unknown) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    };
    if (url.pathname === "/.well-known/openid-configuration")
      return json({
        issuer,
        authorization_endpoint: issuer + "/authorize",
        token_endpoint: issuer + "/token",
        jwks_uri: issuer + "/jwks",
        response_types_supported: ["code"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: ["none"],
      });
    if (url.pathname === "/jwks") return json({ keys: [jwk] });
    if (url.pathname === "/authorize") {
      res.setHeader("Content-Type", "text/html");
      const link = (sub: string) =>
        issuer +
        "/approve?" +
        new URLSearchParams([
          ...url.searchParams.entries(),
          ["subject", sub],
        ]).toString();
      return res.end(
        `<html lang="en"><head><title>Synthetic OIDC test provider</title></head><body><h1>Synthetic test sign-in</h1><p>Local fixtures only. No real company credentials.</p><a href="${link("synthetic-admin").replaceAll("&", "&amp;")}">Continue as synthetic administrator</a><br/><a href="${link("synthetic-viewer").replaceAll("&", "&amp;")}">Continue as synthetic viewer</a></body></html>`,
      );
    }
    if (url.pathname === "/approve") {
      const redirect = url.searchParams.get("redirect_uri"),
        sub = url.searchParams.get("subject")!;
      if (
        redirect !== appOrigin + "/auth/callback" ||
        !["synthetic-admin", "synthetic-viewer"].includes(sub)
      ) {
        res.writeHead(400);
        return res.end();
      }
      const code = randomBytes(24).toString("hex");
      codes.set(code, {
        sub,
        nonce: url.searchParams.get("nonce")!,
        challenge: url.searchParams.get("code_challenge")!,
        redirect,
      });
      res.writeHead(302, {
        Location:
          redirect +
          "?" +
          new URLSearchParams({ code, state: url.searchParams.get("state")! }),
      });
      return res.end();
    }
    if (url.pathname === "/token" && req.method === "POST") {
      let input = "";
      for await (const chunk of req) input += chunk;
      const params = new URLSearchParams(input),
        code = params.get("code") ?? "",
        entry = codes.get(code);
      codes.delete(code);
      if (
        !entry ||
        params.get("client_id") !== "synthetic-client" ||
        params.get("redirect_uri") !== entry.redirect ||
        createHash("sha256")
          .update(params.get("code_verifier") ?? "")
          .digest("base64url") !== entry.challenge
      ) {
        res.writeHead(401);
        return json({ error: "invalid_grant" });
      }
      return json({
        id_token: await new SignJWT({
          nonce: controls.nonce ?? entry.nonce,
          hd: controls.hd,
          email_verified: controls.emailVerified,
        })
          .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
          .setSubject(controls.subject ?? entry.sub)
          .setIssuer(issuer)
          .setAudience(controls.audience ?? "synthetic-client")
          .setIssuedAt()
          .setExpirationTime(controls.expired ? "0s" : "5m")
          .sign(privateKey),
      });
    }
    res.writeHead(404);
    res.end();
  });
  issuer = await listen(idp, options.issuerPort);
  const config: ServerConfig = {
    origin: appOrigin,
    local: true,
    dataDirectory: directory,
    storageKey: randomBytes(32),
    issuer,
    clientId: "synthetic-client",
    clientSecret: "",
    oidcOrigins: [issuer],
    users: { "synthetic-admin": "administrator", "synthetic-viewer": "viewer" },
    frameOrigins: options.frameOrigins ?? [],
    ingestionDirectory: join(directory, "inbox"),
    allowScheduledCsv: false,
    port: options.port ?? 0,
    bindAddress: "127.0.0.1",
    authProvider: "oidc",
    workspaceDomain: null,
  };
  const store = new EncryptedStore(
      join(directory, "synthetic.sqlite"),
      config.storageKey,
    ),
    app = createApplication(config, store);
  const base = await listen(app.server, options.port);
  if (!appOrigin) {
    appOrigin = base;
    config.origin = base;
  }
  const signIn = async (role: "administrator" | "viewer" = "administrator") => {
    const login = await fetch(base + "/auth/login", { redirect: "manual" }),
      loginCookie = login.headers.get("set-cookie")!.split(";")[0],
      authorize = login.headers.get("location")!,
      url = new URL(authorize);
    url.pathname = "/approve";
    url.searchParams.set(
      "subject",
      role === "administrator" ? "synthetic-admin" : "synthetic-viewer",
    );
    const approval = await fetch(url, { redirect: "manual" });
    const callbackUrl = approval.headers.get("location")!;
    const callback = await fetch(
      base + new URL(callbackUrl).pathname + new URL(callbackUrl).search,
      { headers: { Cookie: loginCookie }, redirect: "manual" },
    );
    if (callback.status !== 302)
      throw new Error(
        "Synthetic OIDC sign-in failed: " + (await callback.text()),
      );
    const cookie = callback.headers.get("set-cookie")!.split(";")[0],
      bootstrap = (await (
        await fetch(base + "/api/bootstrap", { headers: { Cookie: cookie } })
      ).json()) as { csrf: string };
    return {
      cookie,
      csrf: bootstrap.csrf,
      role,
      setCookie: callback.headers.get("set-cookie")!,
    };
  };
  return {
    ...app,
    controls,
    base,
    issuer,
    idp,
    config,
    store,
    directory,
    signIn,
    async stop() {
      await close(app.server);
      await close(idp);
      store.close();
      if (!options.directory)
        await rm(directory, { recursive: true, force: true });
    },
  };
}
