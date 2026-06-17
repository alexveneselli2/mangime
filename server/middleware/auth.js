import { ApiError } from "./errors.js";

// Gate for protected API routes. Relies on express-session.
export function requireAuth(req, _res, next) {
  if (!req.session || !req.session.userId) {
    return next(new ApiError(401, "Non autenticato", "UNAUTHENTICATED"));
  }
  next();
}
