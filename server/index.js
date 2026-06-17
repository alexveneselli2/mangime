import express from "express";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { migrate } from "./db/migrate.js";
import { authRouter } from "./routes/auth.js";
import { entriesRouter } from "./routes/entries.js";
import { profileRouter } from "./routes/profile.js";
import { notFound, errorHandler } from "./middleware/errors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const app = express();
app.set("trust proxy", 1); // Render terminates TLS at a proxy

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  })
);
app.use(express.json({ limit: "256kb" }));

// Session store in the dedicated schema.
const PgStore = connectPgSimple(session);
app.use(
  session({
    store: new PgStore({
      pool,
      schemaName: config.db.schema,
      tableName: "session",
      createTableIfMissing: true,
    }),
    name: "nutria.sid",
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProd,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);

// Health check for Render.
app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

// API.
app.use("/api/auth", authRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/profile", profileRouter);

// Static frontend.
app.use(express.static(publicDir, { extensions: ["html"] }));

// SPA fallback for client-side routes (but not API or assets).
app.get(/^\/(?!api\/).*/, (req, res, next) => {
  if (req.method !== "GET") return next();
  res.sendFile(join(publicDir, "index.html"));
});

app.use("/api", notFound);
app.use(errorHandler);

async function start() {
  try {
    await migrate();
  } catch (err) {
    console.error("[startup] Migration failed:", err.message);
    // Surface clearly but keep the process alive so /healthz can report,
    // and a fixed DATABASE_URL can recover on next deploy.
    process.exitCode = 1;
  }
  app.listen(config.port, () => {
    console.log(`[nutria] listening on :${config.port} (${config.env})`);
  });
}

start();
