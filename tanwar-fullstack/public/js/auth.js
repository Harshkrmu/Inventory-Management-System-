/* ============================================================
   auth.js — login + signup pages
   ============================================================ */

function showFieldError(fieldEl, message) {
  fieldEl.classList.add("has-error");
  const err = fieldEl.querySelector(".field-error");
  if (err && message) err.textContent = message;
}

function clearFieldError(fieldEl) {
  fieldEl.classList.remove("has-error");
}

function showFormMsg(el, message, type) {
  el.textContent = message;
  el.className = "form-msg show " + (type === "error" ? "form-msg--error" : "form-msg--ok");
}

/* Show / Hide password buttons */
function initPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
      btn.setAttribute("aria-pressed", String(show));
    });
  });
}

function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;
  const msg = document.getElementById("login-msg");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailField = document.getElementById("field-email");
    const passField = document.getElementById("field-password");
    const email = form.elements.email.value.trim().toLowerCase();
    const password = form.elements.password.value;

    clearFieldError(emailField);
    clearFieldError(passField);
    msg.classList.remove("show");

    let hasError = false;
    if (!email) { showFieldError(emailField, "Enter the email you signed up with."); hasError = true; }
    if (!password) { showFieldError(passField, "Enter your password."); hasError = true; }
    if (hasError) return;

    setBusy(submitBtn, true, "Logging in…");
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      Session.set(data.token, data.user, form.elements.remember.checked);
      showFormMsg(msg, "Welcome back — opening your store…", "ok");
      setTimeout(() => window.location.replace("home.html"), 300);
    } catch (err) {
      showFormMsg(msg, err.message, "error");
      setBusy(submitBtn, false);
    }
  });
}

async function initSignupForm() {
  const form = document.getElementById("signup-form");
  if (!form) return;
  const msg = document.getElementById("signup-msg");
  const submitBtn = form.querySelector('button[type="submit"]');
  const codeField = document.getElementById("field-code");
  let codeRequired = false;

  // Only ask for an invite code if the server has one configured.
  try {
    const cfg = await apiFetch("/auth/config");
    codeRequired = !!cfg.signupCodeRequired;
    codeField.hidden = !codeRequired;
  } catch (e) { /* if this fails, the server will still enforce the code */ }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fields = {
      name: document.getElementById("field-name"),
      email: document.getElementById("field-signup-email"),
      password: document.getElementById("field-signup-password"),
      confirm: document.getElementById("field-confirm-password"),
      code: codeField,
    };

    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const password = form.elements.password.value;
    const confirm = form.elements.confirm.value;
    const code = form.elements.code.value.trim();

    Object.values(fields).forEach(clearFieldError);
    msg.classList.remove("show");

    let hasError = false;
    if (name.length < 2) { showFieldError(fields.name); hasError = true; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { showFieldError(fields.email); hasError = true; }
    if (password.length < 6) { showFieldError(fields.password); hasError = true; }
    if (confirm !== password) { showFieldError(fields.confirm); hasError = true; }
    if (codeRequired && !code) { showFieldError(fields.code); hasError = true; }
    if (hasError) return;

    setBusy(submitBtn, true, "Creating account…");
    try {
      const data = await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password, code }),
      });
      Session.set(data.token, data.user, true);
      showFormMsg(msg, "Account created — opening your store…", "ok");
      setTimeout(() => window.location.replace("home.html"), 400);
    } catch (err) {
      showFormMsg(msg, err.message, "error");
      setBusy(submitBtn, false);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof AUTH_OK !== "undefined" && !AUTH_OK) return;
  initPasswordToggles();
  initLoginForm();
  initSignupForm();
});
