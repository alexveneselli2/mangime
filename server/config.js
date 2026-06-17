import dotenv from "dotenv";
dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) {
    // Don't crash for optional-in-dev values; warn loudly instead.
    console.warn(`[config] Missing environment variable: ${name}`);
  }
  return v;
}

export const config = {
  env: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT || "3000", 10),
  appUrl: process.env.APP_URL || "http://localhost:3000",

  db: {
    url: required("DATABASE_URL"),
    schema: process.env.DB_SCHEMA || "nutria",
    ssl: process.env.DATABASE_SSL === "true",
  },

  session: {
    secret: process.env.SESSION_SECRET || "dev-insecure-secret-change-me",
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  },

  email: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || "NutrIA <onboarding@resend.dev>",
  },
};

// Basic identifier safety for the schema name (used in raw SQL).
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.db.schema)) {
  throw new Error(`Invalid DB_SCHEMA: ${config.db.schema}`);
}
