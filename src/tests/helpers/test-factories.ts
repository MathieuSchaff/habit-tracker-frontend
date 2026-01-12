import { users, profiles } from "../../db/schema";
import { hash } from "argon2";

import { testDb } from "../db.test.config";

export async function createTestUser(data?: {
  email?: string;
  username?: string;
  password?: string;
}) {
  const passwordHash =
    data?.password ||
    (await hash("azerty123", {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    }));

  const [user] = await testDb
    .insert(users)
    .values({
      email: data?.email || `test${Date.now()}@exemple.com`,
      passwordHash,
    })
    .returning();

  if (!user) throw new Error("couldn't create user");

  // Créer le profil automatiquement
  await testDb.insert(profiles).values({
    userId: user.id,
  });

  return user;
}
