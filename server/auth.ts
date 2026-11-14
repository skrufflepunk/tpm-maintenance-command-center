import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, customFetch } from "jose";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ServerConfig } from "./config";
import { EncryptedStore } from "./store";
import { requireValue, SafeError } from "./errors";
import type { StaffIdentity } from "../src/data/managedTypes";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
export interface Session {
  id?: string;
  subject: string;
  csrf: string;
  expires: number;
  selectedSourceId: string | null;
}
interface LoginAttempt {
  state: string;
  nonce: string;
  verifier: string;
  expires: number;
}
interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  response_types_supported?: string[];
  code_challenge_methods_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
}
export class Authentication {
  private discovery: Discovery | null = null;
  constructor(
    private config: ServerConfig,
    private store: EncryptedStore,
  ) {}
  private cookieName(login = false) {
    return `${this.config.local ? "" : "__Host-"}tpm_${login ? "login" : "session"}`;
  }
  private cookie(
    res: ServerResponse,
    value: string,
    login = false,
    clear = false,
  ) {
    res.setHeader(
      "Set-Cookie",
      `${this.cookieName(login)}=${value}; Path=/; HttpOnly; ${this.config.local ? "" : "Secure; "}SameSite=${login || this.config.local ? "Lax" : "None"}; Max-Age=${clear ? 0 : login ? 600 : 28800}`,
    );
  }
  private cookies(req: IncomingMessage) {
    const result = new Map<string, string>();
    for (const piece of (req.headers.cookie ?? "").split(";")) {
      const index = piece.indexOf("=");
      if (index > 0)
        result.set(piece.slice(0, index).trim(), piece.slice(index + 1).trim());
    }
    return result;
  }
  private endpoint(value: string) {
    const url = new URL(value);
    requireValue(
      !url.username &&
        !url.password &&
        this.config.oidcOrigins.includes(url.origin),
      503,
      "OIDC_ENDPOINT",
      "OIDC endpoint origin is not approved in server configuration.",
    );
    return url;
  }
  private async discover() {
    if (this.discovery) return this.discovery;
    const response = await fetch(
      this.endpoint(
        this.config.issuer.replace(/\/$/, "") +
          "/.well-known/openid-configuration",
      ),
      { redirect: "error", signal: AbortSignal.timeout(10000) },
    );
    requireValue(
      response.ok,
      503,
      "OIDC_UNAVAILABLE",
      "Identity provider discovery is unavailable.",
    );
    const doc = (await response.json()) as Discovery;
    requireValue(
      doc.issuer === this.config.issuer &&
        doc.authorization_endpoint &&
        doc.token_endpoint &&
        doc.jwks_uri,
      503,
      "OIDC_DISCOVERY",
      "Identity provider metadata is incompatible.",
    );
    this.endpoint(doc.authorization_endpoint);
    this.endpoint(doc.token_endpoint);
    this.endpoint(doc.jwks_uri);
    requireValue(
      !doc.response_types_supported ||
        doc.response_types_supported.includes("code"),
      503,
      "OIDC_DISCOVERY",
      "Identity provider must support authorization code flow.",
    );
    this.discovery = doc;
    return doc;
  }
  async login(res: ServerResponse) {
    const doc = await this.discover(),
      attempt: LoginAttempt = {
        state: token(),
        nonce: token(),
        verifier: token(),
        expires: Date.now() + 600000,
      };
    this.store.set("login", digest(attempt.state), attempt);
    this.cookie(res, attempt.state, true);
    const url = this.endpoint(doc.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "code",
      scope: "openid",
      redirect_uri: this.config.origin + "/auth/callback",
      state: attempt.state,
      nonce: attempt.nonce,
      code_challenge: createHash("sha256")
        .update(attempt.verifier)
        .digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    res.writeHead(302, { Location: url.href });
    res.end();
  }
  async callback(req: IncomingMessage, res: ServerResponse, url: URL) {
    const state = url.searchParams.get("state"),
      cookie = this.cookies(req).get(this.cookieName(true)),
      attempt = state
        ? this.store.get<LoginAttempt>("login", digest(state))
        : null;
    requireValue(
      state &&
        cookie === state &&
        attempt &&
        attempt.state === state &&
        attempt.expires > Date.now(),
      401,
      "OIDC_STATE",
      "Sign-in state is missing or expired. Start sign-in again.",
    );
    this.store.delete("login", digest(state));
    requireValue(
      url.searchParams.get("code") && !url.searchParams.get("error"),
      401,
      "OIDC_CALLBACK",
      "Identity provider sign-in was not completed.",
    );
    const doc = await this.discover();
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: url.searchParams.get("code")!,
      redirect_uri: this.config.origin + "/auth/callback",
      client_id: this.config.clientId,
      code_verifier: attempt.verifier,
    });
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    const methods = doc.token_endpoint_auth_methods_supported ?? [
      "client_secret_basic",
    ];
    if (this.config.clientSecret) {
      if (methods.includes("client_secret_basic")) {
        headers.Authorization =
          "Basic " +
          Buffer.from(
            encodeURIComponent(this.config.clientId) +
              ":" +
              encodeURIComponent(this.config.clientSecret),
          ).toString("base64");
        params.delete("client_id");
      } else if (methods.includes("client_secret_post"))
        params.set("client_secret", this.config.clientSecret);
      else
        throw new SafeError(
          503,
          "OIDC_CLIENT_AUTH",
          "The configured identity-provider client authentication method is not supported.",
        );
    } else
      requireValue(
        methods.includes("none"),
        503,
        "OIDC_CLIENT_AUTH",
        "Configure a protected client secret or a verified public PKCE client.",
      );
    const response = await fetch(this.endpoint(doc.token_endpoint), {
      method: "POST",
      redirect: "error",
      headers,
      body: params,
      signal: AbortSignal.timeout(10000),
    });
    requireValue(
      response.ok,
      401,
      "OIDC_TOKEN",
      "Identity provider token exchange failed.",
    );
    const body = (await response.json()) as { id_token?: string };
    requireValue(
      typeof body.id_token === "string",
      401,
      "OIDC_TOKEN",
      "Identity provider did not return an identity token.",
    );
    const keys = createRemoteJWKSet(this.endpoint(doc.jwks_uri), {
      [customFetch]: (input, options) =>
        fetch(input, {
          ...options,
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        }),
    });
    const identityToken = body.id_token;
    const payload = await (async () => {
      try {
        const result = await jwtVerify(identityToken, keys, {
          issuer: this.config.issuer,
          audience: this.config.clientId,
          algorithms: ["RS256", "ES256"],
          requiredClaims: ["sub", "iat", "exp", "nonce"],
          maxTokenAge: "10 minutes",
        });
        return result.payload;
      } catch {
        throw new SafeError(
          401,
          "OIDC_IDENTITY",
          "Identity token signature, claims or validity could not be verified.",
        );
      }
    })();
    requireValue(
      payload.nonce === attempt.nonce &&
        (!payload.azp || payload.azp === this.config.clientId) &&
        (!Array.isArray(payload.aud) ||
          payload.aud.length < 2 ||
          payload.azp === this.config.clientId),
      401,
      "OIDC_IDENTITY",
      "Identity token nonce or authorized party is invalid.",
    );
    requireValue(
      payload.sub && Object.hasOwn(this.config.users, payload.sub),
      403,
      "STAFF_ACCESS",
      "This identity is not authorized for the TPM application.",
    );
    const sessionToken = token(),
      session: Session = {
        subject: payload.sub,
        csrf: token(),
        expires: Date.now() + 28800000,
        selectedSourceId: null,
      };
    this.store.set("session", digest(sessionToken), {
      ...session,
      id: digest(sessionToken),
    });
    this.cookie(res, sessionToken);
    res.writeHead(302, { Location: this.config.origin + "/" });
    res.end();
  }
  session(req: IncomingMessage): {
    key: string;
    session: Session;
    user: StaffIdentity;
  } {
    const value = this.cookies(req).get(this.cookieName()),
      key = value ? digest(value) : "",
      session = value ? this.store.get<Session>("session", key) : null;
    requireValue(
      session &&
        session.expires > Date.now() &&
        Object.hasOwn(this.config.users, session.subject),
      401,
      "AUTH_REQUIRED",
      "Authenticate with an authorized staff identity before accessing application data.",
    );
    return {
      key,
      session,
      user: {
        subject: session.subject,
        role: this.config.users[session.subject],
      },
    };
  }
  csrf(req: IncomingMessage, session: Session) {
    requireValue(
      req.headers.origin === this.config.origin &&
        req.headers["x-csrf-token"] === session.csrf,
      403,
      "CSRF_REQUIRED",
      "A same-origin session-bound CSRF token is required.",
    );
  }
  logout(req: IncomingMessage, res: ServerResponse) {
    const current = this.session(req);
    this.csrf(req, current.session);
    this.store.delete("session", current.key);
    this.cookie(res, "", false, true);
  }
  updateSelection(key: string, session: Session, sourceId: string | null) {
    this.store.set("session", key, { ...session, selectedSourceId: sourceId });
  }
  cleanup() {
    for (const attempt of this.store.list<LoginAttempt>("login"))
      if (attempt.expires <= Date.now())
        this.store.delete("login", digest(attempt.state));
    for (const session of this.store.list<Session>("session"))
      if (session.expires <= Date.now() && session.id)
        this.store.delete("session", session.id);
  }
}
export function administrator(user: StaffIdentity) {
  if (user.role !== "administrator")
    throw new SafeError(
      403,
      "ADMIN_REQUIRED",
      "Only administrators can manage imports, source configuration or retention.",
    );
}
