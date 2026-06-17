import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "./pool.js";
import { config } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Creates the dedicated schema (if missing) and applies the idempotent DDL.
export async function migrate() {
  const schema = config.db.schema;
  const sql = await readFile(join(__dirname, "schema.sql"), "utf8");

  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await client.query(`SET search_path TO ${schema}, public`);
    await client.query(sql);
    console.log(`[migrate] Schema "${schema}" is up to date.`);
  } finally {
    client.release();
  }
}

// Allow running standalone: `npm run migrate`
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[migrate] Failed:", err);
      process.exit(1);
    });
}
