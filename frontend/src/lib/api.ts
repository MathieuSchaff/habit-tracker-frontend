// frontend/src/lib/api.ts
import { hc } from "hono/client";
import type { AppType } from "../../../backend/src";

const client = hc<AppType>("/");
export const api = client.api;

// Helper pour extraire data ou throw
export async function unwrap<T>(response: {
  json: () => Promise<{ success: boolean; data?: T; error?: string }>;
}): Promise<T> {
  const json = await response.json();

  if (!json.success) {
    throw new Error(json.error ?? "Unknown error");
  }

  return json.data as T;
}
