import { api } from "/api.js";

/* ---------------- helpers ---------------- */
const root = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const r1 = (n) => Math.round(Number(n) || 0);

function toast(msg, isErr = false) {
  const t = document.createElement("div");
  t.className = "toast" + (isErr ? " err" : "");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shiftISO(iso, days) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return todayISO(d);
}
function prettyDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}

/* ---------------- state + router ---------------- */
const state = { user: null, date: todayISO() };

function navigate(path) {
  history.pushState({}, "", path);
  render();
}
window.addEventListener("popstate", render);

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-link]");
  if (link) {
    e.preventDefault();
    navigate(link.getAttribute("href"));
  }
});

async function render() {
  const path = location.pathname;
  const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"];

  // Resolve session once.
  if (state.user === null) {
    try {
      const { user } = await api.me();
      state.user = user;
    } catch {
      state.user = false;
    }
  }

  if (!state.user) {
    if (path === "/register") return renderRegister();
    if (path === "/forgot-password") return renderForgot();
    if (path === "/reset-password") return renderReset();
    return renderLogin();
  }

  // Authenticated.
  if (publicPaths.includes(path)) return navigate("/");
  if (path === "/settings") return renderSettings();
  return renderDiary();
}

/* ---------------- auth views ---------------- */
function authShell(inner) {
  root.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-logo">
        <div class="logo-badge">N</div>
        <h1>Nutr<span>IA</span></h1>
        <p>Diario alimentare intelligente</p>
      </div>
      ${inner}
    </div>`;
}

function renderLogin() {
  authShell(`
    <div class="card">
      <div id="msg"></div>
      <form id="form">
        <div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label>Password</label><input name="password" type="password" autocomplete="current-password" required></div>
        <button class="btn" type="submit">Accedi</button>
      </form>
      <div class="auth-links" style="margin-top:12px"><a href="/forgot-password" data-link>Password dimenticata?</a></div>
    </div>
    <div class="auth-links">Non hai un account? <a href="/register" data-link>Registrati</a></div>
  `);
  bindForm(async (data, btn) => {
    btn.disabled = true;
    try {
      const { user } = await api.login(data);
      state.user = user;
      navigate("/");
    } catch (err) {
      showMsg(err.message, true);
      btn.disabled = false;
    }
  });
}

function renderRegister() {
  authShell(`
    <div class="card">
      <div id="msg"></div>
      <form id="form">
        <div class="field"><label>Nome</label><input name="name" type="text" autocomplete="name"></div>
        <div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label>Password</label><input name="password" type="password" autocomplete="new-password" required>
          <div class="muted">Almeno 8 caratteri</div></div>
        <button class="btn" type="submit">Crea account</button>
      </form>
    </div>
    <div class="auth-links">Hai già un account? <a href="/login" data-link>Accedi</a></div>
  `);
  bindForm(async (data, btn) => {
    btn.disabled = true;
    try {
      const { user } = await api.register(data);
      state.user = user;
      navigate("/");
    } catch (err) {
      showMsg(err.message, true);
      btn.disabled = false;
    }
  });
}

function renderForgot() {
  authShell(`
    <div class="card">
      <div id="msg"></div>
      <p class="sub">Inserisci la tua email: se esiste un account, riceverai un link per reimpostare la password.</p>
      <form id="form">
        <div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div>
        <button class="btn" type="submit">Invia link di reset</button>
      </form>
    </div>
    <div class="auth-links"><a href="/login" data-link>Torna al login</a></div>
  `);
  bindForm(async (data, btn) => {
    btn.disabled = true;
    try {
      const res = await api.forgotPassword(data);
      showMsg("Se l'email esiste, ti abbiamo inviato un link di reset.", false);
      if (res.devLink) {
        showMsg(`Link (dev): <a href="${esc(res.devLink)}">${esc(res.devLink)}</a>`, false);
      }
    } catch (err) {
      showMsg(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });
}

function renderReset() {
  const token = new URLSearchParams(location.search).get("token") || "";
  authShell(`
    <div class="card">
      <div id="msg"></div>
      <p class="sub">Scegli una nuova password.</p>
      <form id="form">
        <input type="hidden" name="token" value="${esc(token)}">
        <div class="field"><label>Nuova password</label><input name="newPassword" type="password" autocomplete="new-password" required>
          <div class="muted">Almeno 8 caratteri</div></div>
        <button class="btn" type="submit">Reimposta password</button>
      </form>
    </div>
    <div class="auth-links"><a href="/login" data-link>Torna al login</a></div>
  `);
  bindForm(async (data, btn) => {
    btn.disabled = true;
    try {
      await api.resetPassword(data);
      showMsg("Password aggiornata! Ora puoi accedere.", false);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      showMsg(err.message, true);
      btn.disabled = false;
    }
  });
}

function bindForm(handler) {
  const form = document.getElementById("form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    handler(data, form.querySelector("button[type=submit]"));
  });
}
function showMsg(html, isErr) {
  const m = document.getElementById("msg");
  if (m) m.innerHTML = `<div class="msg ${isErr ? "err" : "ok"}">${html}</div>`;
}

/* ---------------- diary view ---------------- */
async function renderDiary() {
  root.innerHTML = `
    <div class="app-shell">
      <div class="topbar">
        <div class="logo"><div class="logo-badge">N</div><h1>Nutr<span>IA</span></h1></div>
        <button class="icon-btn" id="settingsBtn" title="Impostazioni">⚙️</button>
      </div>
      <div class="date-nav">
        <button id="prevDay">‹</button>
        <div class="date-label" id="dateLabel"></div>
        <button id="nextDay">›</button>
      </div>
      <div id="totals"></div>
      <div class="sec-title" id="entriesTitle">Pasti</div>
      <div id="entries"><div class="empty">Caricamento…</div></div>
    </div>
    <div class="input-bar"><div class="input-inner">
      <textarea id="descInput" rows="1" placeholder="Descrivi cosa hai mangiato…"></textarea>
      <button class="send-btn" id="sendBtn" title="Analizza con AI">➤</button>
    </div></div>
  `;

  document.getElementById("settingsBtn").onclick = () => navigate("/settings");
  document.getElementById("prevDay").onclick = () => { state.date = shiftISO(state.date, -1); loadDay(); };
  document.getElementById("nextDay").onclick = () => { state.date = shiftISO(state.date, 1); loadDay(); };

  const input = document.getElementById("descInput");
  input.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 110) + "px";
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMeal(); }
  });
  document.getElementById("sendBtn").onclick = submitMeal;

  loadDay();
}

async function loadDay() {
  const isToday = state.date === todayISO();
  document.getElementById("dateLabel").innerHTML =
    prettyDate(state.date) + (isToday ? "<small>oggi</small>" : "");
  document.getElementById("nextDay").disabled = isToday;

  try {
    const { entries, totals } = await api.listEntries(state.date);
    state.entries = entries;
    renderTotals(totals);
    renderEntries(entries);
  } catch (err) {
    if (err.status === 401) { state.user = false; return navigate("/login"); }
    toast(err.message, true);
  }
}

function renderTotals(t) {
  const goal = state.user.calorieGoal || 2000;
  const cal = r1(t.calories);
  const pct = Math.min(100, (cal / goal) * 100);
  document.getElementById("totals").innerHTML = `
    <div class="totals">
      <div class="cal-row"><span class="cal-big">${cal}</span><span class="cal-unit">kcal</span></div>
      <div class="cal-target">Obiettivo: ${goal} kcal · ${Math.max(0, goal - cal)} rimanenti</div>
      <div class="cal-bar"><i class="${cal > goal ? "over" : ""}" style="width:${pct}%"></i></div>
      <div class="macros">
        <div class="macro"><b>${r1(t.protein)}g</b><span><i class="dot" style="background:#3b82f6"></i>Proteine</span></div>
        <div class="macro"><b>${r1(t.carbs)}g</b><span><i class="dot" style="background:#f59e0b"></i>Carboid.</span></div>
        <div class="macro"><b>${r1(t.fat)}g</b><span><i class="dot" style="background:#ef4444"></i>Grassi</span></div>
        <div class="macro"><b>${r1(t.fiber)}g</b><span><i class="dot" style="background:#10b981"></i>Fibre</span></div>
      </div>
    </div>`;
}

function srcBadge(it) {
  if (it.source === "openfoodfacts") {
    const label = it.offName ? esc(it.offName) : "Open Food Facts";
    return it.offUrl
      ? `<a class="src off" href="${esc(it.offUrl)}" target="_blank" rel="noopener" title="Dati ufficiali Open Food Facts">🛈 ${label}</a>`
      : `<span class="src off">🛈 ${label}</span>`;
  }
  if (it.source === "manual") return `<span class="src manual">✎ manuale</span>`;
  return `<span class="src ai">✦ stima AI</span>`;
}

function renderEntries(entries) {
  document.getElementById("entriesTitle").textContent = `Pasti (${entries.length})`;
  const box = document.getElementById("entries");
  if (!entries.length) {
    box.innerHTML = `<div class="empty"><b>🥗</b>Nessun pasto registrato.<br>Scrivi qui sotto cosa hai mangiato!</div>`;
    return;
  }
  box.innerHTML = entries
    .map((e) => {
      const time = new Date(e.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
      const items = e.items
        .map(
          (it) => `<div class="item">
            <div><span class="item-name">${esc(it.name)}</span>
              ${it.quantity ? `<span class="item-q"> · ${esc(it.quantity)}</span>` : ""}
              ${srcBadge(it)}</div>
            <span class="item-kcal">${r1(it.calories)} kcal</span>
          </div>`
        )
        .join("");
      return `<div class="entry" data-id="${e.id}">
        <div class="entry-top">
          <div><div class="entry-name">${esc(e.name)}${e.edited ? ' <span class="src manual">✎</span>' : ""}</div>
            <div class="entry-time">${time}</div></div>
          <span class="entry-kcal">${r1(e.calories)} <small>kcal</small></span>
        </div>
        <div class="entry-pills">
          <span class="pill p">P ${r1(e.protein)}g</span>
          <span class="pill c">C ${r1(e.carbs)}g</span>
          <span class="pill f">G ${r1(e.fat)}g</span>
          ${e.fiber ? `<span class="pill fib">Fib ${r1(e.fiber)}g</span>` : ""}
        </div>
        <div class="items">${items}</div>
        <div class="entry-actions">
          <button data-act="edit">✎ Modifica</button>
          <button data-act="reprompt">✦ Riformula</button>
          <button data-act="del" class="del">🗑 Elimina</button>
        </div>
      </div>`;
    })
    .join("");

  box.querySelectorAll(".entry").forEach((node) => {
    const id = node.dataset.id;
    const entry = entries.find((x) => x.id === id);
    node.querySelector('[data-act="edit"]').onclick = () => openEditModal(entry);
    node.querySelector('[data-act="reprompt"]').onclick = () => openRepromptModal(entry);
    node.querySelector('[data-act="del"]').onclick = () => deleteEntry(id);
  });
}

async function submitMeal() {
  const input = document.getElementById("descInput");
  const description = input.value.trim();
  if (!description) return;
  const btn = document.getElementById("sendBtn");
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner"></div>`;
  try {
    const { entry } = await api.createEntry({ description, date: state.date });
    input.value = "";
    input.style.height = "auto";
    await loadDay();
    toast(`✓ ${entry.name} — ${r1(entry.calories)} kcal`);
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "➤";
  }
}

async function deleteEntry(id) {
  if (!confirm("Eliminare questo pasto?")) return;
  try {
    await api.deleteEntry(id);
    await loadDay();
  } catch (err) {
    toast(err.message, true);
  }
}

/* ---------------- modals ---------------- */
function closeModal() {
  document.querySelector(".overlay")?.remove();
}
function openOverlay(html) {
  closeModal();
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="modal">${html}</div>`;
  ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(); });
  document.body.appendChild(ov);
  return ov;
}

function openRepromptModal(entry) {
  const ov = openOverlay(`
    <h2>Riformula con l'AI</h2>
    <p class="sub">Correggi o precisa la descrizione: l'AI rianalizzerà il pasto da capo.</p>
    <div id="msg"></div>
    <div class="field">
      <textarea id="rp" rows="4" style="width:100%;border:1px solid var(--border);border-radius:12px;padding:12px;font:inherit;font-size:15px">${esc(entry.description)}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn secondary" id="cancel">Annulla</button>
      <button class="btn" id="save">Rianalizza</button>
    </div>
  `);
  ov.querySelector("#cancel").onclick = closeModal;
  ov.querySelector("#save").onclick = async () => {
    const description = ov.querySelector("#rp").value.trim();
    if (!description) return;
    const btn = ov.querySelector("#save");
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div>`;
    try {
      await api.reprompt(entry.id, { description });
      closeModal();
      await loadDay();
      toast("Pasto rianalizzato");
    } catch (err) {
      ov.querySelector("#msg").innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = "Rianalizza";
    }
  };
}

function itemEditorHtml(it, i) {
  return `<div class="modal-item" data-i="${i}">
    <div class="row"><div>
      <label>Alimento</label><input data-f="name" value="${esc(it.name)}">
    </div><div>
      <label>Quantità</label><input data-f="quantity" value="${esc(it.quantity || "")}">
    </div></div>
    <div class="row macros4">
      <div><label>Calorie (kcal)</label><input data-f="calories" type="number" min="0" value="${r1(it.calories)}"></div>
      <div><label>Proteine (g)</label><input data-f="protein" type="number" min="0" value="${r1(it.protein)}"></div>
      <div><label>Carboidrati (g)</label><input data-f="carbs" type="number" min="0" value="${r1(it.carbs)}"></div>
      <div><label>Grassi (g)</label><input data-f="fat" type="number" min="0" value="${r1(it.fat)}"></div>
      <div><label>Fibre (g)</label><input data-f="fiber" type="number" min="0" value="${r1(it.fiber)}"></div>
    </div>
    ${it.source === "openfoodfacts" && it.offName ? `<div class="off-note">🛈 Dati da Open Food Facts: ${esc(it.offName)}</div>` : ""}
    <button class="del-item" data-del="${i}">Rimuovi alimento</button>
  </div>`;
}

function openEditModal(entry) {
  // Work on a mutable copy of items.
  let items = entry.items.map((it) => ({ ...it }));

  const ov = openOverlay(`
    <h2>Modifica pasto</h2>
    <p class="sub">Aggiusta nome, alimenti e valori. I totali si ricalcolano dai singoli alimenti.</p>
    <div id="msg"></div>
    <div class="field"><label>Nome del pasto</label><input id="entryName" value="${esc(entry.name)}"></div>
    <div id="itemList"></div>
    <button class="add-item" id="addItem">+ Aggiungi alimento</button>
    <div class="modal-actions">
      <button class="btn secondary" id="cancel">Annulla</button>
      <button class="btn" id="save">Salva</button>
    </div>
  `);

  function paint() {
    ov.querySelector("#itemList").innerHTML = items.map((it, i) => itemEditorHtml(it, i)).join("");
    ov.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = () => { items.splice(Number(b.dataset.del), 1); collect(); paint(); };
    });
  }
  function collect() {
    ov.querySelectorAll(".modal-item").forEach((node) => {
      const i = Number(node.dataset.i);
      node.querySelectorAll("[data-f]").forEach((inp) => {
        const f = inp.dataset.f;
        items[i][f] = inp.type === "number" ? Number(inp.value) : inp.value;
      });
    });
  }

  paint();
  ov.querySelector("#addItem").onclick = () => {
    collect();
    items.push({ name: "", quantity: "", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, source: "manual" });
    paint();
  };
  ov.querySelector("#cancel").onclick = closeModal;
  ov.querySelector("#save").onclick = async () => {
    collect();
    const name = ov.querySelector("#entryName").value.trim();
    const clean = items.filter((it) => it.name && it.name.trim());
    if (!clean.length) {
      ov.querySelector("#msg").innerHTML = `<div class="msg err">Serve almeno un alimento</div>`;
      return;
    }
    const btn = ov.querySelector("#save");
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div>`;
    try {
      await api.updateEntry(entry.id, { name, mealType: entry.mealType, items: clean });
      closeModal();
      await loadDay();
      toast("Pasto aggiornato");
    } catch (err) {
      ov.querySelector("#msg").innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
      btn.disabled = false;
      btn.textContent = "Salva";
    }
  };
}

/* ---------------- settings ---------------- */
function renderSettings() {
  const u = state.user;
  root.innerHTML = `
    <div class="app-shell">
      <div class="topbar">
        <button class="icon-btn" id="back">‹</button>
        <div class="logo"><h1>Impostazioni</h1></div>
        <span style="width:38px"></span>
      </div>

      <div class="sec-title">Profilo</div>
      <div class="card">
        <div id="msgProfile"></div>
        <div class="field"><label>Nome</label><input id="name" value="${esc(u.name || "")}"></div>
        <div class="field"><label>Email</label><input value="${esc(u.email)}" disabled></div>
        <div class="field"><label>Obiettivo calorico (kcal/giorno)</label><input id="goal" type="number" min="800" max="8000" value="${u.calorieGoal || 2000}"></div>
        <button class="btn" id="saveProfile">Salva profilo</button>
      </div>

      <div class="sec-title">Cambia password</div>
      <div class="card">
        <div id="msgPw"></div>
        <div class="field"><label>Password attuale</label><input id="curPw" type="password" autocomplete="current-password"></div>
        <div class="field"><label>Nuova password</label><input id="newPw" type="password" autocomplete="new-password"><div class="muted">Almeno 8 caratteri</div></div>
        <button class="btn" id="savePw">Aggiorna password</button>
      </div>

      <div class="sec-title">Account</div>
      <div class="card">
        <button class="btn danger" id="logout">Esci</button>
      </div>
    </div>
  `;

  document.getElementById("back").onclick = () => navigate("/");

  document.getElementById("saveProfile").onclick = async (e) => {
    e.target.disabled = true;
    try {
      const { user } = await api.updateProfile({
        name: document.getElementById("name").value,
        calorieGoal: document.getElementById("goal").value,
      });
      state.user = user;
      document.getElementById("msgProfile").innerHTML = `<div class="msg ok">Profilo salvato</div>`;
    } catch (err) {
      document.getElementById("msgProfile").innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
    } finally {
      e.target.disabled = false;
    }
  };

  document.getElementById("savePw").onclick = async (e) => {
    e.target.disabled = true;
    try {
      await api.changePassword({
        currentPassword: document.getElementById("curPw").value,
        newPassword: document.getElementById("newPw").value,
      });
      document.getElementById("curPw").value = "";
      document.getElementById("newPw").value = "";
      document.getElementById("msgPw").innerHTML = `<div class="msg ok">Password aggiornata</div>`;
    } catch (err) {
      document.getElementById("msgPw").innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
    } finally {
      e.target.disabled = false;
    }
  };

  document.getElementById("logout").onclick = async () => {
    await api.logout().catch(() => {});
    state.user = false;
    navigate("/login");
  };
}

/* ---------------- boot ---------------- */
render();
