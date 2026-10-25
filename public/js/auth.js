/* ============================================================
   auth.js — login + signup, backed by the real API
   ============================================================ */

function showFieldError(fieldEl, message) {
  fieldEl.classList.add("has-error");
  const err = fieldEl.querySelector(".field-error");
  if (err) err.textContent = message;
}

function clearFieldError(fieldEl) {
  fieldEl.classList.remove("has-error");
}

function showFormMsg(el, message, type) {
  el.textContent = message;
  el.className = "form-msg show " + (type === "error" ? "form-msg--error" : "form-msg--ok");
}

function setSubmitting(button, isSubmitting, idleText) {
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? "Please wait…" : idleText;
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
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;

    clearFieldError(emailField);
    clearFieldError(passField);
    msg.classList.remove("show");

    let hasError = false;
    if (!email) {
      showFieldError(emailField, "Enter the email you signed up with.");
      hasError = true;
    }
    if (!password) {
      showFieldError(passField, "Enter your password.");
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(submitBtn, true, "Log in");
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      Session.set(data.token, data.user);
      showFormMsg(msg, "Welcome back — taking you to your dashboard…", "ok");
      setTimeout(() => (window.location.href = "home.html"), 400);
    } catch (err) {
      showFormMsg(msg, err.message, "error");
      setSubmitting(submitBtn, false, "Log in");
    }
  });
}

function initSignupForm() {
  const form = document.getElementById("signup-form");
  if (!form) return;
  const msg = document.getElementById("signup-msg");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameField = document.getElementById("field-name");
    const emailField = document.getElementById("field-signup-email");
    const passField = document.getElementById("field-signup-password");
    const confirmField = document.getElementById("field-confirm-password");

    const name = form.name.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const confirm = form.confirm.value;

    [nameField, emailField, passField, confirmField].forEach(clearFieldError);
    msg.classList.remove("show");

    let hasError = false;
    if (name.length < 2) {
      showFieldError(nameField, "Enter the store owner or staff name.");
      hasError = true;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showFieldError(emailField, "Enter a valid email address.");
      hasError = true;
    }
    if (password.length < 6) {
      showFieldError(passField, "Use at least 6 characters.");
      hasError = true;
    }
    if (confirm !== password) {
      showFieldError(confirmField, "Passwords don't match.");
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(submitBtn, true, "Create account");
    try {
      const data = await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      Session.set(data.token, data.user);
      showFormMsg(msg, "Account created — setting up your dashboard…", "ok");
      setTimeout(() => (window.location.href = "home.html"), 500);
    } catch (err) {
      showFormMsg(msg, err.message, "error");
      setSubmitting(submitBtn, false, "Create account");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initSignupForm();
});
