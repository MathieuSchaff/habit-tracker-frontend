import { Hono } from "hono";
import { requireAuth } from "../auth/middleware";
import { getProfile, updateProfile } from "./service";
import { profileUpdateSchema } from "@habit-tracker/shared";
import { AppEnv } from "../../app-env";
import { MeResponse, profileErrorMapping } from "./types";
import { zValidator } from "@hono/zod-validator";
import { err, errorToStatus, HTTP_STATUS, ok } from "@habit-tracker/shared";

// Toutes les routes users nécessitent l'auth
export const profileRoute = new Hono<AppEnv>()
  .use("*", requireAuth)

  // ROUTE ME
  .get("/", async (c) => {
    const db = c.get("db");
    const userId = c.get("userId")!;

    try {
      const profile = await getProfile(db, userId);

      if (!profile) {
        return c.json<MeResponse>(
          err("not_found"),
          errorToStatus("not_found", profileErrorMapping),
        );
      }

      return c.json<MeResponse>(ok(profile), HTTP_STATUS.OK);
    } catch (e) {
      console.error("Error in /me:", e);
      return c.json<MeResponse>(
        err("server_error"),
        errorToStatus("server_error", profileErrorMapping),
      );
    }
  })

  // PATCH /me - Mettre à jour le profil
  .patch("/", zValidator("json", profileUpdateSchema), async (c) => {
    const db = c.get("db");
    const userId = c.get("userId")!;

    try {
      const data = c.req.valid("json");

      const updated = await updateProfile(db, userId, data);

      if (!updated) {
        return c.json<MeResponse>(
          err("not_found"),
          errorToStatus("not_found", profileErrorMapping),
        );
      }

      return c.json<MeResponse>(ok(updated), HTTP_STATUS.OK);
    } catch (e) {
      console.error("Error in PATCH /me:", e);
      return c.json<MeResponse>(
        err("server_error", e instanceof Error ? e.message : undefined),
        errorToStatus("server_error", profileErrorMapping),
      );
    }
  });
