require("dotenv").config();
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const pool = require("./config/db");
const { ensureSchema } = require("./db/ensure-schema");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");

const isProd = process.env.NODE_ENV === "production";

/* ---------- startup safety checks ---------- */
// A login-signing secret is always in place. If JWT_SECRET is missing, a known
// placeholder, or too short, a strong key is derived from the database
// credentials instead (stable across restarts, never guessable without the DB
// password). Setting your own long random JWT_SECRET is still the best option.
function resolveJwtSecret() {
  const given = process.env.JWT_SECRET || "";
  if (given && given !== "change_this_to_a_long_random_string" && given.length >= 32) return given;

  const dbPassword = process.env.DB_PASSWORD || "";
  if (!dbPassword && isProd) {
    console.error("\nSet JWT_SECRET (a long random string) or DB_PASSWORD so logins can be signed securely.\n");
    process.exit(1);
  }
  console.warn("JWT_SECRET is missing or too weak — using a key derived from the database credentials instead.");
  return crypto
    .createHash("sha256")
    .update(["tanwar-jwt-v1", process.env.DB_HOST, process.env.DB_PORT, process.env.DB_USER, dbPassword, process.env.DB_NAME].join("|"))
    .digest("hex");
}
process.env.JWT_SECRET = resolveJwtSecret();

const app = express();

// Hosts like Render/Railway sit behind a reverse proxy; this makes
// req.ip (used by the rate limiter) the real visitor IP.
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "upgrade-insecure-requests": null, // keeps http://localhost working
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        "img-src": ["'self'", "data:"],
      },
    },
  })
);
app.use(compression());

// CORS_ORIGIN can be "*" or a comma-separated list of allowed origins.
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((o) => o.trim()) }));

app.use(express.json({ limit: "100kb" }));

if (!isProd) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Brute-force protection: only genuine credential failures (wrong password,
// wrong invite code = 401/403) count — 30 per 15 minutes per IP. Successful
// requests and ordinary typos/validation errors (400, 409) do not, so a whole
// classroom sharing one network won't lock each other out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode < 401 || res.statusCode === 409,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

/* ---------- API ---------- */
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "up" });
  } catch (err) {
    res.status(503).json({ status: "degraded", db: "down" });
  }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productRoutes);

/* ---------- Frontend ---------- */
// The frontend is served by this same server, so there is no CORS setup and
// nothing separate to run. HTML/JS/CSS are always revalidated so a new deploy
// takes effect immediately instead of being served stale from the browser cache.
app.use(
  express.static(path.join(__dirname, "public"), {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (/\.(html|js|css)$/.test(filePath)) res.setHeader("Cache-Control", "no-cache");
    },
  })
);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((req, res) => {
  if (req.method === "GET" && req.accepts("html")) {
    return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  }
  res.status(404).type("text").send("Not found");
});

// Central error handler. In production never leak internals to the client.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request is too large." });
  }
  console.error(err);
  res.status(500).json({ error: isProd ? "Unexpected server error." : err.message });
});

const PORT = process.env.PORT || 4000;
let server;

(async () => {
  // Create tables / demo account if needed. If the database is unreachable the
  // server still starts (and /api/health reports it) instead of crashing.
  try {
    await ensureSchema(pool);
  } catch (err) {
    console.error("Could not prepare the database:", err.message);
  }
  server = app.listen(PORT, () => {
    console.log(`Tanwar Collections API running on port ${PORT}`);
  });
})();

// Clean shutdown (Render sends SIGTERM on every redeploy)
function shutdown(signal) {
  console.log(`${signal} received — shutting down.`);
  const finish = async () => {
    try { await pool.end(); } catch (e) { /* ignore */ }
    process.exit(0);
  };
  if (server) server.close(finish); else finish();
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));
