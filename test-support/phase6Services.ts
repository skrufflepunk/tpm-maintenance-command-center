import { testSystem } from "../server/testSupport";
const system = await testSystem({
  port: 8787,
  issuerPort: 8790,
  origin: "http://127.0.0.1:5173",
  // Synthetic loopback-only framing fixture. Production readConfig requires HTTPS.
  frameOrigins: ["http://127.0.0.1:5173"],
});
process.stdout.write(
  "Synthetic-only Phase 6 test services on loopback. No company identity, records or credentials.\n",
);
let closing = false;
const stop = () => {
  if (closing) return;
  closing = true;
  void system.stop().then(() => process.exit(0));
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
