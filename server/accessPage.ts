import type { ServerResponse } from "node:http";
import type { ServerConfig } from "./config";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
/** Data-free access gate. Never render source data, query parameters or identity claims. */
export function accessPage(
  res: ServerResponse,
  config: ServerConfig,
  signedOut = false,
) {
  const root = escape(config.origin),
    heading = signedOut
      ? "You’re signed out"
      : "Sign in to your maintenance dashboard";
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>TPM staff access</title><style>
  *{box-sizing:border-box}body{margin:0;background:#eff4fb;color:#142b48;font:16px/1.6 system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{max-width:660px;width:100%;border:1px solid #c9d8eb;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 10px 35px #112e5012}header{background:#0b2a50;color:#fff;padding:22px 26px;border-top:4px solid #ffc458}.brand{font:700 28px Georgia,serif;letter-spacing:2px}header p{margin:3px 0 0;font-size:13px;color:#d8e6f7}.content{padding:24px 26px}h1{font-size:23px;line-height:1.3;margin:0 0 16px}p{font-size:14px;margin:12px 0}.actions{display:flex;flex-wrap:wrap;gap:12px;margin:22px 0 12px}a{display:inline-flex;align-items:center;border:1px solid #a7c0df;border-radius:7px;padding:10px 15px;font-size:14px;font-weight:650;color:#17487d;text-decoration:none}.primary{color:#fff;background:#0055db;border-color:#0055db}a:focus-visible{outline:3px solid #df9c00;outline-offset:4px}.note{color:#52647c;font-size:12px}li{font-size:14px;margin:8px 0}
  </style></head><body><main class="card"><header><div class="brand">TPM</div><p>Maintenance Command Center · authorized staff only</p></header><div class="content"><h1>${heading}</h1><p>${signedOut ? "Your dashboard session has ended. Google sign-in is managed separately; closing this session does not sign you out of Google." : "The Team Portal remains your main workspace. This embedded dashboard needs its own protected staff session."}</p><ol><li>Open staff sign-in in a new tab and use your approved work account.</li><li>Return to the Team Portal and reload this frame.</li><li>If your browser blocks embedded sessions, keep using the same dashboard in the authenticated tab.</li></ol><div class="actions"><a class="primary" href="${root}/auth/login" target="_blank" rel="noopener noreferrer">Open staff sign-in in a new tab</a><a href="${root}/" target="_self">Reload this dashboard</a></div><p class="note">Access is checked by the application, independently of Google Sites. No maintenance data is shown on this access screen.</p></div></main></body></html>`);
}
