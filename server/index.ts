import { join } from "node:path";
import { readConfig } from "./config";
import { EncryptedStore } from "./store";
import { createApplication } from "./app";
try {
  const config = readConfig(),
    store = new EncryptedStore(
      join(config.dataDirectory, "tpm.sqlite"),
      config.storageKey,
    ),
    app = createApplication(config, store);
  app.server.listen(config.port, "127.0.0.1", () =>
    process.stdout.write(
      "TPM protected server listening on loopback. Live Rentvine remains disabled.\n",
    ),
  );
  const stop = () =>
    app.server.close(() => {
      store.close();
      process.exit(0);
    });
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
} catch {
  process.stderr.write(
    "TPM server configuration is incomplete or invalid. Review server-only storage/OIDC/allowlist settings. No operational server was started.\n",
  );
  process.exitCode = 1;
}
