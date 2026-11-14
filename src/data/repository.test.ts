import { expect, it } from "vitest";
import { demoSnapshot } from "./demo";
import {
  createDemoRepository,
  getRepository,
  validateSnapshot,
} from "./repository";
it("rejects duplicate identities and operational snapshots", () => {
  expect(() =>
    validateSnapshot({
      ...demoSnapshot,
      workOrders: [demoSnapshot.workOrders[0], demoSnapshot.workOrders[0]],
    }),
  ).toThrow("duplicate");
  expect(() =>
    validateSnapshot({ ...demoSnapshot, sourceMode: "api" }),
  ).toThrow("Operational");
});
it("isolates returned snapshots and refuses import mutations while retaining successful data", async () => {
  const repo = createDemoRepository();
  const before = await repo.getSnapshot();
  const copy = await repo.getSnapshot();
  copy.workOrders.length = 0;
  expect((await repo.getSnapshot()).workOrders).toHaveLength(24);
  await expect(
    repo.previewImport({ input: "fictional", mapping: {}, scope: "demo" }),
  ).rejects.toThrow("unavailable");
  await expect(repo.commitImport("invalid")).rejects.toThrow("unavailable");
  expect(await repo.getSnapshot()).toEqual(before);
  expect(await repo.getComparableChanges(before.id)).toMatchObject({
    available: false,
  });
  expect((await repo.getDataHealth()).comparison).toContain("unavailable");
});
it("fails closed for unsupported data modes", () => {
  import.meta.env.VITE_DATA_MODE = "api";
  expect(() => getRepository()).toThrow("Only demo mode");
  import.meta.env.VITE_DATA_MODE = "demo";
});
