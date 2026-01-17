import type { DB } from "../../db/index";
import { verify, hash } from "argon2";
import { getUser, createUser, createProfile } from "./user.utils";
import {
  cleanupUserSessions,
  createSession,
  revokeSession,
} from "./session.service";
import { generateSid, hashSid } from "./utils";
import {
  type SignupServiceResult,
  type LoginServiceResult,
  LogoutServiceResult,
} from "./auth.types";
// Import des types et helpers
import { ok, err } from "../../types/api";

// LOGIN
/**
 * Login un utilisateur et crée une session
 * @returns ApiResponse avec user + sid si succès
 */
export async function loginUser(
  db: DB,
  email: string,
  password: string
): Promise<LoginServiceResult> {
  try {
    const emailTrimmed = email.toLocaleLowerCase().trim();

    const user = await getUser(db, emailTrimmed);

    // Hash dummy pour éviter timing attack
    const passwordHash =
      user?.passwordHash ??
      "$argon2id$v=19$m=65536,t=3,p=4$dummysaltdummysaltdummysal$dummyhash";

    const isValid = await verify(passwordHash, password);

    if (!user || !isValid) {
      return err("invalid_credentials");
    }

    // Générer session
    const sid = generateSid();
    const sidHash = hashSid(sid);

    await createSession(db, {
      userId: user.id,
      sidHash: sidHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    });

    // Cleanup async (fire and forget)
    cleanupUserSessions(db, user.id).catch((e) =>
      console.error("Failed to cleanup sessions:", e)
    );

    return ok({
      user: { id: user.id, email: user.email },
      sid,
    });
  } catch (e) {
    console.error("Login failed:", e);
    return err("server_error");
  }
}

// SIGNUP

/**
 * Crée un nouvel utilisateur avec son profil et sa session
 * @returns ApiResponse avec user + sid si succès
 */
export async function signupUser(
  db: DB,
  email: string,
  password: string
): Promise<SignupServiceResult> {
  try {
    const emailTrimmed = email.toLocaleLowerCase().trim();
    const existingUser = await getUser(db, emailTrimmed);
    if (existingUser) {
      return err("email_exists", "utilisateur déjà crée");
    }

    const passwordHash = await hash(password, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await createUser(db, {
      email: email.trim().toLowerCase(),
      passwordHash,
    });

    if (!user) {
      return err("server_error", "Problème lors de la création de l'user");
    }

    await createProfile(db, { userId: user.id });

    // Générer session
    const sid = generateSid();
    const sidHash = hashSid(sid);

    await createSession(db, {
      userId: user.id,
      sidHash: sidHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
    });

    return ok({
      user: { id: user.id, email: user.email },
      sid,
    });
  } catch (e) {
    console.error("Signup failed:", e);
    return err("server_error");
  }
}

// LOGOUT

/**
 * Révoque la session d'un utilisateur
 * @returns Toujours success: true
 */
export async function logoutUser(
  db: DB,
  sid: string
): Promise<LogoutServiceResult> {
  try {
    const sidHash = hashSid(sid);
    await revokeSession(db, sidHash);
    return ok(null);
  } catch (e) {
    console.error("Logout failed:", e);
    // On retourne succès car côté client = déconnecté
    return ok(null);
  }
}
