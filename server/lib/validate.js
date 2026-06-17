import { ApiError } from "../middleware/errors.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assert(cond, message, code) {
  if (!cond) throw new ApiError(400, message, code);
}

export function normalizeEmail(email) {
  assert(typeof email === "string" && EMAIL_RE.test(email.trim()), "Email non valida", "INVALID_EMAIL");
  return email.trim().toLowerCase();
}

export function validatePassword(pw) {
  assert(typeof pw === "string" && pw.length >= 8, "La password deve avere almeno 8 caratteri", "WEAK_PASSWORD");
  return pw;
}

export function cleanString(v, { max = 2000, field = "campo" } = {}) {
  assert(typeof v === "string", `${field} non valido`, "INVALID_INPUT");
  const s = v.trim();
  assert(s.length > 0, `${field} è obbligatorio`, "EMPTY_INPUT");
  assert(s.length <= max, `${field} troppo lungo`, "INPUT_TOO_LONG");
  return s;
}

// Accepts YYYY-MM-DD, defaults to today (UTC) if absent.
export function parseDate(v) {
  if (!v) {
    return new Date().toISOString().slice(0, 10);
  }
  assert(/^\d{4}-\d{2}-\d{2}$/.test(v), "Data non valida", "INVALID_DATE");
  return v;
}

export function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
