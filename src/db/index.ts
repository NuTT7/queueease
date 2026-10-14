import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool = globalForDb.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export { pool };

/** Postgres error code from a pg error, possibly wrapped by Drizzle. */
export function pgErrorCode(err: unknown): string | undefined {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  if (typeof e?.code === "string") return e.code;
  if (typeof e?.cause?.code === "string") return e.cause.code;
  return undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_EXCLUSION_VIOLATION = "23P01";
