import { Hono } from "hono";
import type { AppEnv } from "../../app-env";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { cookieOptions, hashSid } from "./utils";
import { rateLimiterFunc } from "../../utils/rateLimiter";
import z, { treeifyError } from "zod";
import { revokeSession } from "./session.service";
import { loginUser, signupUser } from "./service";

// Import des types et helpers
import {
  ok,
  err,
  errorToStatus,
  isApiSuccess,
  type ApiError,
  HTTP_STATUS,
} from "../../types/api";
import {
  type LoginResponse,
  type SignupResponse,
  type LogoutResponse,
  type PingResponse,
  type ValidationErrorCode,
  authErrorMapping,
} from "./auth.types";
import { zValidator } from "@hono/zod-validator";

// Schema de validation
const authSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Minimum 8 caractères")
    .max(128, "Maximum 128 caractères")
    .regex(/[a-z]/, "Au moins une minuscule")
    .regex(/[A-Z]/, "Au moins une majuscule")
    .regex(/[0-9]/, "Au moins un chiffre"),
});

// https://hono.dev/docs/guides/validation
// Fonction qui permet de pas répéter zValidator etc.
// Sachant que zValidator renvoie toujours une erreur avec un status 400
// donc c'est nécessaire de créer une fonction propre.

export const authRoutes = new Hono<AppEnv>()
  // ROUTE PING
  .get("/ping", (c) => {
    return c.json<PingResponse>(ok({ ok: true }));
  })

  // ROUTE LOGIN
  .post(
    "/login",
    rateLimiterFunc,
    zValidator("json", authSchema),
    async (c) => {
      const env = c.get("env");
      const db = c.get("db");
      const { email, password } = c.req.valid("json");
      // Appel service
      const result = await loginUser(db, email, password);

      // Erreur
      if (!isApiSuccess(result)) {
        return c.json<LoginResponse>(
          err(result.error),
          errorToStatus(result.error, authErrorMapping),
        );
      }
      // Succès : set cookie et retourne user
      setCookie(c, "sid", result.data.sid, cookieOptions(env));

      return c.json<LoginResponse>(
        ok({ user: result.data.user }),
        HTTP_STATUS.OK,
      );
    },
  )

  // ROUTE SIGNUP
  .post(
    "/signup",
    zValidator("json", authSchema),
    rateLimiterFunc,
    async (c) => {
      const db = c.get("db");
      const env = c.get("env");
      const { email, password } = c.req.valid("json");
      // Appel service
      const result = await signupUser(db, email, password);

      // Erreur
      if (!isApiSuccess(result)) {
        return c.json<SignupResponse>(
          result,
          errorToStatus(result.error, authErrorMapping),
        );
      }

      // Succès : set cookie et retourne user
      setCookie(c, "sid", result.data.sid, cookieOptions(env));

      return c.json<SignupResponse>(
        ok({ user: result.data.user }),
        HTTP_STATUS.OK,
      );
    },
  )

  // ROUTE LOGOUT
  .post("/logout", async (c) => {
    const db = c.get("db");
    const sid = getCookie(c, "sid");

    // Pas de session = déjà déconnecté, on retourne succès quand même
    if (!sid) {
      return c.json<LogoutResponse>(
        ok(null, "Already disconnected"),
        HTTP_STATUS.OK,
      );
    }

    const sidHash = hashSid(sid);

    try {
      await revokeSession(db, sidHash);
    } catch (e) {
      // On log mais on retourne succès (côté client = déconnecté)
      console.error("Logout - session not found:", e);
    }

    deleteCookie(c, "sid");
    return c.json<LogoutResponse>(ok(null, "Disconnected"), HTTP_STATUS.OK);
  });
