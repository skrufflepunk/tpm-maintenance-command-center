import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import assert from "node:assert/strict";
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.name === ".nojekyll") {
      assert.equal(await readFile(path, "utf8"), "");
      continue;
    }
    assert(
      !/(?:\.env|\.sqlite|\.tpm-backup\.json|\.csv$|\.key$|\.pem$|\.map$)/i.test(
        entry.name,
      ),
      "Unexpected private/source artifact in static build",
    );
    if (entry.isDirectory()) {
      assert.equal(entry.name, "assets");
      await scan(path);
      continue;
    }
    assert(
      [".html", ".js", ".css", ".svg", ".png", ".ico", ".txt"].includes(
        extname(path),
      ),
      "Unreviewed static artifact type",
    );
    const text = await readFile(path, "utf8");
    assert(
      !/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk_live_[a-zA-Z0-9]{16,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{30,}/.test(
        text,
      ),
      "Credential-like material found in build",
    );
    assert(
      !/TPM_OIDC_CLIENT_SECRET|TPM_STORAGE_KEY_FILE|createRemoteJWKSet|\/api\/bootstrap|\/auth\/callback|\/api\/imports/.test(
        text,
      ),
      "Backend/authentication code leaked into static build",
    );
  }
}
const html = (await readFile("dist/index.html", "utf8")).replaceAll(
  "&#39;",
  "'",
);
assert(
  html.includes('http-equiv="Content-Security-Policy"') &&
    html.includes("connect-src 'none'") &&
    html.includes("form-action 'none'"),
  "Static security policy missing",
);
assert(
  !/(?:src|href)="\/(?!\/)/.test(html),
  "Absolute asset paths break project Pages deployment",
);
await scan("dist");
await writeFile("dist/.nojekyll", "");
console.log(
  "Static artifact review PASS: relative assets, no backend/credential patterns or report files, restrictive production CSP. Only dist is publishable.",
);
