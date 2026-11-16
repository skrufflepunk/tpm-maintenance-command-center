// Loopback-only synthetic test fixture. Never included in the Pages artifact.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
const root = resolve("dist"),
  prefix = "/tpm-maintenance-command-center/";
const servers = [4173, 4174].map((port) =>
  createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1:" + port);
    if (url.pathname === "/portal") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end(
        '<!doctype html><html lang="en"><head><title>Synthetic Google Sites-sized portal</title></head><body><iframe title="Synthetic static dashboard" src="http://127.0.0.1:4174' +
          prefix +
          '?settings=imports#Data%20%26%20Settings" style="width:1060px;height:620px;border:0"></iframe></body></html>',
      );
    }
    if (url.pathname === prefix.slice(0, -1)) {
      res.writeHead(302, { Location: prefix });
      return res.end();
    }
    if (!url.pathname.startsWith(prefix)) {
      res.writeHead(404);
      return res.end();
    }
    const relative =
        decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html",
      file = resolve(root, relative);
    if (!file.startsWith(root + sep)) {
      res.writeHead(404);
      return res.end();
    }
    try {
      const data = await readFile(file);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".svg": "image/svg+xml",
        }[extname(file)] ?? "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  }),
);
await Promise.all(
  servers.map(
    (server, i) =>
      new Promise((resolve) => server.listen(4173 + i, "127.0.0.1", resolve)),
  ),
);
process.stdout.write(
  "Synthetic static project-path and cross-origin iframe fixtures on loopback only.\n",
);
for (const event of ["SIGTERM", "SIGINT"])
  process.on(event, () => {
    for (const server of servers) {
      server.closeAllConnections();
      server.close();
    }
  });
