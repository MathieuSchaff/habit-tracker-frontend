import { Hono } from "hono";
import type { AppEnv } from "../../app-env";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { cookieOptions, hashSid } from "./utils";
import { rateLimiterFunc } from "../../utils/rateLimiter";
import { revokeSession } from "./session.service";
import { loginUser, signupUser } from "./service";
import {
    ok,
    err,
    errorToStatus,
    isApiSuccess,
    HTTP_STATUS,
    type LoginResponse,
    type SignupResponse,
    type LogoutResponse,
    type PingResponse,
    authErrorMapping,
    authSchema,
} from "@habit-tracker/shared";
import { validateJson } from "../../utils/validateDataMiddleware";

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
        // zValidator("json", authSchema),
        validateJson(authSchema),
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
        // zValidator("json", authSchema),
        validateJson(authSchema),
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
