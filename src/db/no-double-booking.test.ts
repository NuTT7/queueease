/**
 * Integration test against a real PostgreSQL database.
 * Runs only when TEST_DATABASE_URL is set (CI provides one; see .github/workflows/ci.yml).
 * The database must already be migrated.
 */
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("bookings_no_overlap constraint", () => {
  let pool: Pool;
  let serviceId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: url, max: 10 });
    await pool.query("DELETE FROM bookings");
    const { rows } = await pool.query(
      "INSERT INTO services (name, duration_min, price_satang) VALUES ('Test', 30, 10000) RETURNING id",
    );
    serviceId = rows[0].id;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM bookings WHERE service_id = $1", [serviceId]);
    await pool.query("DELETE FROM services WHERE id = $1", [serviceId]);
    await pool.end();
  });

  const insert = (code: string, start: string, end: string, status = "confirmed") =>
    pool.query(
      `INSERT INTO bookings (code, service_id, service_name, price_satang, customer_name, customer_phone, starts_at, ends_at, status)
       VALUES ($1, $2, 'Test', 10000, 'A', '0800000000', $3, $4, $5)`,
      [code, serviceId, start, end, status],
    );

  it("lets only one of many concurrent requests take the same slot", async () => {
    const attempts = Array.from({ length: 10 }, (_, i) =>
      insert(`RACE${String(i).padStart(2, "0")}`, "2030-01-01T03:00:00Z", "2030-01-01T03:30:00Z"),
    );
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed.every((r) => r.reason.code === "23P01")).toBe(true);
  });

  it("allows back-to-back bookings", async () => {
    await expect(insert("NEXT01", "2030-01-01T03:30:00Z", "2030-01-01T04:00:00Z")).resolves.toBeTruthy();
  });

  it("frees the time range when a booking is cancelled", async () => {
    await insert("CANC01", "2030-01-02T03:00:00Z", "2030-01-02T04:00:00Z");
    await pool.query("UPDATE bookings SET status = 'cancelled' WHERE code = 'CANC01'");
    await expect(insert("CANC02", "2030-01-02T03:15:00Z", "2030-01-02T03:45:00Z")).resolves.toBeTruthy();
  });
});
