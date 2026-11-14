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
  app.server.on("error", () => {
    process.stderr.write(
      "TPM protected server could not bind its configured listener.\n",
    );
    store.close();
    process.exitCode = 1;
  });
  app.server.listen(config.port, config.bindAddress, () =>
    process.stdout.write(
      "TPM protected server listening on its configured interface. Live Rentvine remains disabled.\n",
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
