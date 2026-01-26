const port = Number(process.env.PORT ?? 3000);
import { Hono } from "hono";
import { healthRoute } from "./features/health/routes";
import { habits } from "./features/habits/routes";
import { profileRoute } from "./features/profile";
import { db } from "./db/index";
import { authRoutes } from "./features/auth";
import type { AppEnv } from "./app-env";
import { cors } from "hono/cors";

const app = new Hono<AppEnv>()
  .basePath("/api")
  .use("*", cors({ credentials: true, origin: "http://localhost:5173" }))

  .use("*", async (c, next) => {
    c.set("db", db);
    c.set(
      "env",
      Bun.env.NODE_ENV === "production" ? "production" : "development",
    );
    await next();
  })
  .route("/auth", authRoutes)
  .route("/health", healthRoute)
  // .route("/habits", habits)
  .route("/profile", profileRoute);

// Export du type pour le frontend
export type AppType = typeof app;

export default {
  port: port,
  fetch: app.fetch,
};

console.log(`API listening on ${port}`);
