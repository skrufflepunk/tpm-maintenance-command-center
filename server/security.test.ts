import { afterEach, beforeEach, expect, it } from "vitest";
import { testSystem } from "./testSupport";
import { exactOrigins } from "./config";
let system: Awaited<ReturnType<typeof testSystem>>;
beforeEach(async () => {
  system = await testSystem();
});
afterEach(async () => system.stop());
async function request(
  path: string,
  identity?: { cookie: string; csrf: string },
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return fetch(system.base + path, {
    method,
    redirect: "manual",
    headers: {
      ...(identity ? { Cookie: identity.cookie } : {}),
      ...(method !== "GET"
        ? {
            "Content-Type": "application/json",
            Origin: system.config.origin,
            ...(identity ? { "X-CSRF-Token": identity.csrf } : {}),
          }
        : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
it("denies anonymous and forged-header access to operational data and protects direct application access", async () => {
  for (const path of [
    "/api/bootstrap",
    "/api/imports",
    "/api/sources/00000000-0000-0000-0000-000000000000/workspace",
  ])
    expect((await request(path)).status).toBe(401);
  const forged = await request("/api/bootstrap", undefined, "GET", undefined, {
    "X-Auth-Request-Email": "synthetic-admin",
    "X-Forwarded-User": "synthetic-admin",
    Authorization: "Bearer fake",
  });
  expect(forged.status).toBe(401);
  const direct = await request("/");
  expect(direct.status).toBe(302);
  expect(direct.headers.get("Location")).toBe("/auth/login");
  expect(direct.headers.get("Cache-Control")).toBe("no-store");
  expect(direct.headers.get("Content-Security-Policy")).toContain(
    "frame-ancestors 'none'",
  );
  expect(direct.headers.get("X-Frame-Options")).toBe("DENY");
  expect(direct.headers.get("Access-Control-Allow-Origin")).toBeNull();
});
it("authenticates through signed OIDC discovery/code/PKCE/nonce flow and restricts privileged operations", async () => {
  const admin = await system.signIn(),
    viewer = await system.signIn("viewer");
  const boot = await (await request("/api/bootstrap", viewer)).json();
  expect(boot.user.role).toBe("viewer");
  expect(boot.api).toMatchObject({
    status: "Not configured",
    approved: false,
    capabilitiesVerified: false,
  });
  const source = {
    name: "Synthetic Security CSV",
    account: "synthetic-security",
    scope: "approved fixture",
    timezone: "UTC",
    approved: true,
    behavior: "snapshot",
  };
  expect((await request("/api/sources", viewer, "POST", source)).status).toBe(
    403,
  );
  expect((await request("/api/settings", viewer, "PUT", {})).status).toBe(403);
  expect((await request("/api/audit", viewer)).status).toBe(403);
  expect(
    (await request("/api/imports/preview", viewer, "POST", {})).status,
  ).toBe(403);
  expect(
    (
      await request("/api/api-configuration", viewer, "POST", {
        secret: "not-a-real-secret",
      })
    ).status,
  ).toBe(403);
  expect((await request("/api/sources", admin, "POST", source)).status).toBe(
    201,
  );
  const blocked = await request("/api/api-configuration", admin, "POST", {});
  expect(blocked.status).toBe(409);
  expect(await blocked.text()).not.toContain("not-a-real-secret");
  expect((await request("/api/ingestion/run", admin, "POST", {})).status).toBe(
    409,
  );
});
it("requires session-bound CSRF and exact Origin for every state-changing request", async () => {
  const admin = await system.signIn();
  expect(
    (
      await request(
        "/api/sources",
        admin,
        "POST",
        {},
        { "X-CSRF-Token": "wrong" },
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await request(
        "/api/sources",
        admin,
        "POST",
        {},
        { Origin: "https://attacker.invalid" },
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await request(
        "/api/sources",
        admin,
        "POST",
        {},
        { "Content-Type": "text/plain" },
      )
    ).status,
  ).toBe(415);
  expect(
    (await request("/api/sources", admin, "POST", { mode: "api" })).status,
  ).toBe(409);
});
it("revokes logout sessions and deny-lists removed subjects on every request", async () => {
  const admin = await system.signIn();
  expect((await request("/api/logout", admin, "POST", {})).status).toBe(200);
  expect((await request("/api/bootstrap", admin)).status).toBe(401);
  const viewer = await system.signIn("viewer");
  delete system.config.users["synthetic-viewer"];
  expect((await request("/api/bootstrap", viewer)).status).toBe(401);
});
it("rejects wrong state, nonce, audience and expired identity tokens without issuing a session", async () => {
  const login = await request("/auth/login"),
    cookie = login.headers.get("set-cookie")!.split(";")[0];
  expect(
    (
      await request(
        "/auth/callback?state=wrong&code=forged",
        undefined,
        "GET",
        undefined,
        { Cookie: cookie },
      )
    ).status,
  ).toBe(401);
  for (const change of [
    { nonce: "wrong" },
    { audience: "wrong" },
    { expired: true },
  ]) {
    Object.assign(
      system.controls,
      { nonce: undefined, audience: undefined, expired: false },
      change,
    );
    await expect(system.signIn()).rejects.toThrow(
      "Synthetic OIDC sign-in failed",
    );
  }
  expect(system.store.list("session")).toHaveLength(0);
});
it("uses exact framing origin allowlists and secure production cookie attributes", async () => {
  expect(() => exactOrigins(["https://*.example.com"])).toThrow();
  expect(() => exactOrigins(["https://portal.invalid/path"])).toThrow();
  expect(() => exactOrigins(["http://portal.invalid"])).toThrow();
  system.config.frameOrigins = ["https://sites.google.com"];
  const response = await request("/api/bootstrap");
  expect(response.headers.get("Content-Security-Policy")).toContain(
    "frame-ancestors https://sites.google.com",
  );
  expect(response.headers.get("X-Frame-Options")).toBeNull();
  system.config.local = false;
  const login = await request("/auth/login");
  expect(login.headers.get("set-cookie")).toContain("__Host-tpm_login");
  expect(login.headers.get("set-cookie")).toContain("Secure");
  expect(login.headers.get("set-cookie")).toContain("HttpOnly");
  expect(login.headers.get("Strict-Transport-Security")).toBe(
    "max-age=31536000",
  );
});
