import type { ManagedBootstrap, ManagedWorkspace } from "./managedTypes";
export class ManagedError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function managedRequest<T>(
  path: string,
  csrf?: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const value = await response
    .json()
    .catch(() => ({
      message: "Protected server is unavailable or not configured.",
    }));
  if (!response.ok)
    throw new ManagedError(
      response.status,
      typeof value.message === "string"
        ? value.message
        : "Protected server request failed.",
    );
  return value as T;
}
export const getBootstrap = () =>
  managedRequest<ManagedBootstrap>("/bootstrap");
export const getManagedWorkspace = (id: string) =>
  managedRequest<ManagedWorkspace>(
    `/sources/${encodeURIComponent(id)}/workspace`,
  );
