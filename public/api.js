// Thin fetch wrapper around the JSON API.
async function request(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Errore ${res.status}`);
    err.status = res.status;
    err.code = data && data.code;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b),
  put: (p, b) => request("PUT", p, b),
  del: (p) => request("DELETE", p),

  // Auth
  me: () => request("GET", "/api/auth/me"),
  register: (b) => request("POST", "/api/auth/register", b),
  login: (b) => request("POST", "/api/auth/login", b),
  logout: () => request("POST", "/api/auth/logout"),
  changePassword: (b) => request("POST", "/api/auth/change-password", b),
  forgotPassword: (b) => request("POST", "/api/auth/forgot-password", b),
  resetPassword: (b) => request("POST", "/api/auth/reset-password", b),

  // Entries
  listEntries: (date) => request("GET", `/api/entries?date=${encodeURIComponent(date)}`),
  createEntry: (b) => request("POST", "/api/entries", b),
  reprompt: (id, b) => request("POST", `/api/entries/${id}/reprompt`, b),
  updateEntry: (id, b) => request("PUT", `/api/entries/${id}`, b),
  deleteEntry: (id) => request("DELETE", `/api/entries/${id}`),

  // Profile
  updateProfile: (b) => request("PUT", "/api/profile", b),
};
