// Wrap async route handlers so rejected promises reach Express' error handler.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// A typed application error for predictable client responses.
export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(_req, res) {
  res.status(404).json({ error: "Not found" });
}

// Centralized error handler.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  console.error("[error]", err);
  res.status(500).json({ error: "Errore interno del server" });
}
