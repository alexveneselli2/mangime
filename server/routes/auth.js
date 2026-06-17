import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { query } from "../db/pool.js";
import { asyncHandler, ApiError } from "../middleware/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizeEmail, validatePassword, cleanString, assert } from "../lib/validate.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { config } from "../config.js";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Troppi tentativi, riprova più tardi" },
});

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    calorieGoal: row.calorie_goal,
    emailVerified: row.email_verified,
  };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

// ---- Register ----
authRouter.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = validatePassword(req.body.password);
    const name = req.body.name ? cleanString(req.body.name, { max: 80, field: "Nome" }) : null;

    const existing = await query("SELECT id FROM users WHERE lower(email) = $1", [email]);
    assert(existing.rowCount === 0, "Esiste già un account con questa email", "EMAIL_TAKEN");

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *`,
      [email, hash, name]
    );

    await regenerateSession(req);
    req.session.userId = rows[0].id;
    res.status(201).json({ user: publicUser(rows[0]) });
  })
);

// ---- Login ----
authRouter.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    assert(typeof password === "string" && password.length > 0, "Password obbligatoria", "EMPTY_PASSWORD");

    const { rows } = await query("SELECT * FROM users WHERE lower(email) = $1", [email]);
    const user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) throw new ApiError(401, "Email o password non corretti", "INVALID_CREDENTIALS");

    await regenerateSession(req);
    req.session.userId = user.id;
    res.json({ user: publicUser(user) });
  })
);

// ---- Logout ----
authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await new Promise((resolve) => req.session.destroy(() => resolve()));
    res.clearCookie("nutria.sid");
    res.json({ ok: true });
  })
);

// ---- Current user ----
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
    if (!rows[0]) throw new ApiError(401, "Non autenticato", "UNAUTHENTICATED");
    res.json({ user: publicUser(rows[0]) });
  })
);

// ---- Change password (authenticated) ----
authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const current = req.body.currentPassword;
    const next = validatePassword(req.body.newPassword);
    assert(typeof current === "string", "Password attuale obbligatoria", "EMPTY_PASSWORD");

    const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
    const user = rows[0];
    const ok = user && (await bcrypt.compare(current, user.password_hash));
    if (!ok) throw new ApiError(400, "Password attuale non corretta", "INVALID_CREDENTIALS");

    const hash = await bcrypt.hash(next, 12);
    await query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [hash, user.id]);
    res.json({ ok: true });
  })
);

// ---- Forgot password ----
authRouter.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const { rows } = await query("SELECT id FROM users WHERE lower(email) = $1", [email]);

    // Always respond the same way to avoid email enumeration.
    let devLink;
    if (rows[0]) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [rows[0].id, tokenHash, expires]
      );
      const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
      const result = await sendPasswordResetEmail(email, resetUrl);
      if (!result.delivered) devLink = result.devLink; // surfaced only in dev
    }

    res.json({ ok: true, ...(devLink ? { devLink } : {}) });
  })
);

// ---- Reset password ----
authRouter.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const token = cleanString(req.body.token, { max: 200, field: "Token" });
    const password = validatePassword(req.body.newPassword);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const { rows } = await query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [tokenHash]
    );
    const tok = rows[0];
    if (!tok) throw new ApiError(400, "Link non valido o scaduto", "INVALID_TOKEN");

    const hash = await bcrypt.hash(password, 12);
    await query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [hash, tok.user_id]);
    await query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [tok.id]);
    res.json({ ok: true });
  })
);
