const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = "$2a$10$rZ4SsYiRMCvO4uRMyDERfObIW4rkpv8tzpDFPPTFrF4UnngRiA49.";

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

const signupCode = () => (process.env.SIGNUP_CODE || "").trim();

/** GET /api/auth/config — lets the signup page know if an invite code is needed */
function config(req, res) {
  res.json({ signupCodeRequired: signupCode() !== "" });
}

function passwordProblem(password) {
  if (typeof password !== "string" || password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  // bcrypt only uses the first 72 bytes of a password
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Password is too long (72 characters maximum).";
  }
  return null;
}

/** POST /api/auth/signup */
async function signup(req, res) {
  try {
    const { name, email, password, code } = req.body || {};

    if (signupCode() && String(code || "").trim() !== signupCode()) {
      return res.status(403).json({ error: "That invite code isn't correct. Ask the store owner for it." });
    }
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120) {
      return res.status(400).json({ error: "Enter the store owner or staff name." });
    }
    if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email) || email.length > 190) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    const pwProblem = passwordProblem(password);
    if (pwProblem) return res.status(400).json({ error: pwProblem });

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name.trim(), cleanEmail, passwordHash]
    );

    const user = { id: result.insertId, name: name.trim(), email: cleanEmail };
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong creating your account." });
  }
}

/** POST /api/auth/login */
async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email.trim().toLowerCase(),
    ]);
    const dbUser = rows[0];

    const match = await bcrypt.compare(password, dbUser ? dbUser.password_hash : DUMMY_HASH);
    if (!dbUser || !match) {
      return res.status(401).json({ error: "Email or password doesn't match our records." });
    }

    const user = { id: dbUser.id, name: dbUser.name, email: dbUser.email };
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong logging you in." });
  }
}

/** GET /api/auth/me — who am I? (also confirms the account still exists) */
async function me(req, res) {
  try {
    const [rows] = await pool.query("SELECT id, name, email FROM users WHERE id = ?", [req.user.id]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "This account no longer exists." });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load your account." });
  }
}

/** PUT /api/auth/password */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({ error: "Enter your current password." });
    }
    const pwProblem = passwordProblem(newPassword);
    if (pwProblem) return res.status(400).json({ error: pwProblem });
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: "Your new password must be different from the current one." });
    }

    const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "This account no longer exists." });
    }

    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) {
      // 400 (not 401) so the browser doesn't mistake this for an expired session
      return res.status(400).json({ error: "Your current password is incorrect." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.user.id]);
    res.json({ message: "Password updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update your password." });
  }
}

module.exports = { config, signup, login, me, changePassword };
