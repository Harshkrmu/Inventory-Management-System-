/* ============================================================
   common.js — session handling + API helper
   The app now talks to a real backend (server.js + MySQL).
   The ONLY thing still kept in the browser is the login token
   and basic user info, so you stay logged in on refresh.
   ============================================================ */

const API_BASE = "/api";

const Session = {
  KEY: "tanwar_session",

  get() {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set(token, user) {
    localStorage.setItem(this.KEY, JSON.stringify({ token, user }));
  },
  clear() {
    localStorage.removeItem(this.KEY);
  },
};

/**
 * Wrapper around fetch() that:
 *  - prefixes API_BASE
 *  - attaches the Authorization header when logged in
 *  - parses JSON and throws a readable Error on failure
 *  - auto-logs-out and redirects if the token is invalid/expired
 */
async function apiFetch(path, options = {}) {
  const session = Session.get();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (session && session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    Session.clear();
    window.location.href = "index.html";
    throw new Error("Session expired. Please log in again.");
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error((body && body.error) || `Request failed (${res.status})`);
  }
  return body;
}

/** Call at the top of protected pages (home, dashboard). */
function requireAuth() {
  const session = Session.get();
  if (!session || !session.token) {
    window.location.href = "index.html";
  }
  return session;
}

function logout() {
  Session.clear();
  window.location.href = "index.html";
}

function initSidebarUser() {
  const session = Session.get();
  const nameEl = document.querySelector("[data-user-name]");
  if (session && session.user && nameEl) nameEl.textContent = session.user.name;

  const logoutLink = document.querySelector("[data-logout]");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  // mobile sidebar toggle
  const toggle = document.querySelector("[data-sidebar-toggle]");
  const sidebar = document.querySelector(".sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  }
}
