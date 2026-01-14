// import { db } from "../../db/index";
import { profiles } from "../../db/schema/users";
import { eq } from "drizzle-orm";
import { DB } from "../../db/types";
import { ProfileUpdateInput } from "./validation";

export async function getProfile(db: DB, userId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return profile ?? null;
}

export async function updateProfile(
  db: DB,
  userId: string,
  data: ProfileUpdateInput
) {
  const profile = await db
    .update(profiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(profiles.userId, userId))
    .returning();
  return profile[0] || null;
}
