import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { admins, businessHours, services } from "../src/db/schema";

// Scripts run outside Next.js, so load .env ourselves (Next.js does this automatically).
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file (e.g. CI or Docker, where env vars are set directly)
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin1234";
  await db
    .insert(admins)
    .values({ email, name: "Owner", passwordHash: await bcrypt.hash(password, 12) })
    .onConflictDoNothing({ target: admins.email });

  const existing = await db.select({ id: services.id }).from(services).limit(1);
  if (existing.length === 0) {
    await db.insert(services).values([
      { name: "ตัดผมชาย", description: "ตัด สระ เซ็ตทรง", durationMin: 30, priceSatang: 20000, sortOrder: 1 },
      {
        name: "สระ + ไดร์",
        description: "สระผมและไดร์จัดทรง",
        durationMin: 45,
        priceSatang: 25000,
        sortOrder: 2,
      },
      {
        name: "โกนหนวด",
        description: "โกนหนวดด้วยผ้าร้อน",
        durationMin: 15,
        priceSatang: 10000,
        sortOrder: 3,
      },
      {
        name: "ทำสีผม",
        description: "รวมทรีตเมนต์บำรุง",
        durationMin: 120,
        priceSatang: 150000,
        sortOrder: 4,
      },
    ]);
  }

  // Mon–Sat 10:00–20:00 (closed Wednesday), Sunday 11:00–18:00
  const rows = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    openMin: weekday === 0 ? 11 * 60 : 10 * 60,
    closeMin: weekday === 0 ? 18 * 60 : 20 * 60,
    isClosed: weekday === 3,
  }));
  await db.insert(businessHours).values(rows).onConflictDoNothing();

  await pool.end();
  console.log(`✓ seeded (admin: ${email})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
