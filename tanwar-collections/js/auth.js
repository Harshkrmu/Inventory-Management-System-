/* ============================================================
   auth.js — login + signup form logic (demo, localStorage-backed)
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

function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;
  const msg = document.getElementById("login-msg");

  form.addEventListener("submit", (e) => {
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

    const user = Storage.getUsers().find((u) => u.email.toLowerCase() === email);

    if (!user || user.password !== password) {
      showFormMsg(msg, "Email or password doesn't match our records.", "error");
      return;
    }

    Storage.setSession(user);
    showFormMsg(msg, "Welcome back — taking you to your dashboard…", "ok");
    setTimeout(() => (window.location.href = "home.html"), 500);
  });
}

function initSignupForm() {
  const form = document.getElementById("signup-form");
  if (!form) return;
  const msg = document.getElementById("signup-msg");

  form.addEventListener("submit", (e) => {
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

    const users = Storage.getUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      showFormMsg(msg, "An account with this email already exists.", "error");
      return;
    }

    users.push({ name, email, password });
    Storage.saveUsers(users);
    Storage.setSession({ name, email });

    showFormMsg(msg, "Account created — setting up your dashboard…", "ok");
    setTimeout(() => (window.location.href = "home.html"), 600);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLoginForm();
  initSignupForm();
});
