import { rateLimiter } from "hono-rate-limiter";
import type { Context, Next } from "hono";
import { err, errorToStatus } from "../types/api";

// https://honohub.dev/docs/rate-limiter/configuration
// a regarder s'il faut changer le store
// pour l'instant le store est :
// "By default, hono-rate-limiter uses an in-memory store (MemoryStore)"
// Il faudrait plus tard changer le store
const isDev = process.env.NODE_ENV === "development";

export const rateLimiterFunc = isDev
  ? async (_c: Context, next: Next) => await next()
  : rateLimiter({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: "draft-7",
      keyGenerator: (c) => {
        const ip =
          c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
          c.req.header("cf-connecting-ip") ||
          c.req.header("x-real-ip") ||
          "unknown";
        return `rate:${ip}`;
      },
      handler: (c) =>
        c.json(
          err("rate_limit_exceeded", {
            retryAfter: c.res.headers.get("Retry-After"),
          }),
          errorToStatus("rate_limit_exceeded", "rate_limit_exceedeed")
        ),

      skip: (c) =>
        c.req.path === "/health" ||
        c.req.path === "/ping" ||
        c.req.path === "/favicon.ico",
      skipFailedRequests: true,
    });
