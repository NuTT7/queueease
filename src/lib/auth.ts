import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { readSessionSubject } from "./session";

/** Current admin or null. Cached per request so layouts + pages share one query. */
export const getCurrentAdmin = cache(async () => {
  const id = await readSessionSubject();
  if (!id) return null;
  const [admin] = await db
    .select({ id: admins.id, email: admins.email, name: admins.name })
    .from(admins)
    .where(eq(admins.id, id))
    .limit(1);
  return admin ?? null;
});

/**
 * Use at the top of every admin page AND every admin server action.
 * Server actions are public HTTP endpoints, so hiding a button is not enough.
 */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
