import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

// A single shared pool. search_path is pinned to the dedicated schema so every
// unqualified table name resolves inside `nutria` (with public as fallback for
// extensions). This keeps NutrIA's tables isolated in the shared database and
// makes a future migration to a standalone DB a no-op (just change DATABASE_URL).
export const pool = new Pool({
  connectionString: config.db.url,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  options: `-c search_path=${config.db.schema},public`,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected idle client error:", err.message);
});

export async function query(text, params) {
  return pool.query(text, params);
}

// Run a function inside a transaction with a dedicated client.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
