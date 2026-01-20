const port = Number(process.env.PORT ?? 3000);

import { Hono } from "hono";
// les routes
import { healthRoute } from "./features/health/routes";
import { habits } from "./features/habits/routes";
import { profileRoute } from "./features/profile";

import { db } from "./db/index";
import { authRoutes } from "./features/auth";
import type { AppEnv } from "./app-env";
// initialisation app hono
const app = new Hono<AppEnv>();

const appEnv: "development" | "production" =
  Bun.env.NODE_ENV === "production" ? "production" : "development";

app.use("*", async (c, next) => {
  c.set("db", db);
  c.set("env", appEnv);
  await next();
});

app.route("/auth", authRoutes);
app.route("/", healthRoute);
app.route("/habits", habits);
app.route("/profile", profileRoute);

export default {
  port: port,
  fetch: app.fetch,
};

console.log(`API listening on ${port}`);
