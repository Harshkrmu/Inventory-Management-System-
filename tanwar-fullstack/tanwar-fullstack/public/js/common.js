/* ============================================================
   common.js — shared by every page
   session, API helper, toasts, confirm dialog, sidebar/menu,
   logout, change-password
   (No inline scripts anywhere: the server's security headers
   only allow scripts loaded from this site.)
   ============================================================ */

const API_BASE = "/api";

/* ---------------- session ---------------- */

function tokenExpiry(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).exp * 1000;
  } catch (e) {
    return null;
  }
}

const Session = {
  KEY: "tanwar_session",

  get() {
    const raw = localStorage.getItem(this.KEY) || sessionStorage.getItem(this.KEY);
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      if (!s || !s.token) { this.clear(); return null; }
      const exp = tokenExpiry(s.token);
      if (exp && exp < Date.now()) { this.clear(); return null; }
      return s;
    } catch (e) {
      this.clear();
      return null;
    }
  },
  // remember = true  -> survives closing the browser
  // remember = false -> cleared when the browser/tab closes
  set(token, user, remember = true) {
    this.clear();
    (remember ? localStorage : sessionStorage).setItem(this.KEY, JSON.stringify({ token, user }));
  },
  clear() {
    localStorage.removeItem(this.KEY);
    sessionStorage.removeItem(this.KEY);
  },
};

/* ---------------- API ---------------- */

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function apiFetch(path, options = {}) {
  const session = Session.get();
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (session && session.token) headers.Authorization = "Bearer " + session.token;

  let res;
  try {
    res = await fetch(API_BASE + path, { ...options, headers });
  } catch (e) {
    throw new ApiError("Can't reach the server. Check your internet connection and try again.", 0);
  }

  // A 401 on a normal request means the login expired. (Wrong password on the
  // login form is also a 401, but that must show an error, not reload the page.)
  const isLoginCall = path.startsWith("/auth/login") || path.startsWith("/auth/signup");
  if (res.status === 401 && !isLoginCall) {
    Session.clear();
    window.location.replace("index.html");
    throw new ApiError("Your session has expired. Please log in again.", 401);
  }

  let body = null;
  if (res.status !== 204) {
    try { body = await res.json(); } catch (e) { body = null; }
  }
  if (!res.ok) {
    throw new ApiError((body && body.error) || "Something went wrong (" + res.status + ").", res.status);
  }
  return body;
}

/* ---------------- small helpers ---------------- */

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function setBusy(button, busy, busyText) {
  if (!button) return;
  if (busy) {
    button.dataset.idleText = button.textContent;
    button.textContent = busyText || "Please wait…";
    button.disabled = true;
  } else {
    if (button.dataset.idleText) button.textContent = button.dataset.idleText;
    button.disabled = false;
  }
}

/* ---------------- toast ---------------- */

function toast(message, type) {
  let region = document.getElementById("toast-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "toast-region";
    region.className = "toast-region";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
  }
  const el = document.createElement("div");
  el.className = "toast" + (type ? " toast--" + type : "");
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.2s";
    setTimeout(() => el.remove(), 220);
  }, type === "error" ? 5000 : 3000);
}

/* ---------------- confirm dialog (replaces window.confirm) ---------------- */

function confirmDialog({ title, message, confirmText = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop open";
    backdrop.setAttribute("role", "alertdialog");
    backdrop.setAttribute("aria-modal", "true");

    const modal = document.createElement("div");
    modal.className = "modal modal--sm";

    const head = document.createElement("div");
    head.className = "modal__head";
    const h2 = document.createElement("h2");
    h2.textContent = title;
    head.appendChild(h2);

    const body = document.createElement("div");
    body.className = "modal__body";
    const p = document.createElement("p");
    p.className = "modal__text";
    p.textContent = message;
    body.appendChild(p);

    const foot = document.createElement("div");
    foot.className = "modal__foot";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-ghost btn-sm";
    cancel.textContent = "Cancel";
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "btn btn-sm " + (danger ? "btn-danger" : "btn-gold");
    ok.textContent = confirmText;
    foot.append(cancel, ok);

    modal.append(head, body, foot);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    document.body.classList.add("modal-open");

    function close(result) {
      document.removeEventListener("keydown", onKey, true);
      backdrop.remove();
      if (!document.querySelector(".modal-backdrop.open")) document.body.classList.remove("modal-open");
      resolve(result);
    }
    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); close(false); }
    }
    document.addEventListener("keydown", onKey, true);
    cancel.addEventListener("click", () => close(false));
    ok.addEventListener("click", () => close(true));
    backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) close(false); });
    (danger ? cancel : ok).focus();
  });
}

/* ---------------- auth guard ---------------- */

function guard() {
  const s = Session.get();
  if (document.body.hasAttribute("data-protected") && !s) {
    window.location.replace("index.html");
    return false;
  }
  if (document.body.hasAttribute("data-auth-page") && s) {
    window.location.replace("home.html");
    return false;
  }
  return true;
}

const AUTH_OK = guard();

// Back/forward button can restore a cached page after logout — re-check.
window.addEventListener("pageshow", (e) => { if (e.persisted) guard(); });

/* ---------------- logout (works regardless of load order) ---------------- */

function logout() {
  Session.clear();
  window.location.replace("index.html");
}

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-logout]");
  if (!link) return;
  e.preventDefault();
  logout();
});

/* ---------------- sidebar, mobile menu ---------------- */

function setNav(open) {
  document.body.classList.toggle("nav-open", open);
}

function initSidebar() {
  const session = Session.get();
  if (session && session.user) {
    const nameEl = document.querySelector("[data-user-name]");
    const emailEl = document.querySelector("[data-user-email]");
    if (nameEl) nameEl.textContent = session.user.name;
    if (emailEl) emailEl.textContent = session.user.email;
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-menu-toggle]")) setNav(!document.body.classList.contains("nav-open"));
    else if (e.target.closest("[data-menu-close]") || e.target.closest(".sidebar .nav-link")) setNav(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNav(false); });
}

/* ---------------- change password ---------------- */

function initPasswordModal() {
  const backdrop = document.getElementById("pw-modal-backdrop");
  if (!backdrop) return;
  const form = document.getElementById("pw-form");
  const msg = document.getElementById("pw-msg");
  const submit = form.querySelector('button[type="submit"]');

  function open() {
    form.reset();
    msg.classList.remove("show");
    backdrop.classList.add("open");
    document.body.classList.add("modal-open");
    setNav(false);
    document.getElementById("pw-current").focus();
  }
  function close() {
    backdrop.classList.remove("open");
    document.body.classList.remove("modal-open");
  }
  function showError(text) {
    msg.textContent = text;
    msg.classList.add("show");
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-password]")) open();
    if (e.target.closest("[data-close-pw]")) close();
  });
  backdrop.addEventListener("mousedown", (e) => { if (e.target === backdrop) close(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop.classList.contains("open")) close();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.classList.remove("show");
    const current = form.elements.current.value;
    const next = form.elements.next.value;
    const confirm = form.elements.confirm.value;

    if (!current) return showError("Enter your current password.");
    if (next.length < 6) return showError("The new password must be at least 6 characters.");
    if (next !== confirm) return showError("The new passwords don't match.");

    setBusy(submit, true, "Updating…");
    try {
      await apiFetch("/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      close();
      toast("Password updated.", "success");
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(submit, false);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!AUTH_OK) return;
  if (document.body.hasAttribute("data-protected")) {
    initSidebar();
    initPasswordModal();
  }
});
