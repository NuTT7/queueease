import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Scripts run outside Next.js, so load .env ourselves (Next.js does this automatically).
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file (e.g. CI or Docker, where env vars are set directly)
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("✓ migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
