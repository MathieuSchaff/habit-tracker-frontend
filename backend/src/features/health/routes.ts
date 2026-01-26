import { Hono } from "hono";
import { AppEnv } from "../../app-env";

export const healthRoute = new Hono<AppEnv>().get("/health", (c) =>
  c.json({ ok: true }),
);
