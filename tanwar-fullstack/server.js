require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");

const app = express();
const isProd = process.env.NODE_ENV === "production";

// Deployed hosts (Railway, Render, etc.) sit behind a reverse proxy.
// This makes req.ip / rate limiting see the real visitor IP, not the proxy's.
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());

// CORS_ORIGIN can be "*" or a comma-separated list of allowed origins,
// e.g. "https://tanwarcollections.com,https://www.tanwarcollections.com"
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((o) => o.trim()),
  })
);

app.use(express.json());

// Simple request log — handy while developing.
if (!isProd) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Brute-force protection on login/signup: 20 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "tanwar-collections-backend" });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/products", productRoutes);

// Serve the frontend (login/signup/home/dashboard pages) from /public.
// Because this is the SAME server as the API, the frontend and backend
// share one origin — no CORS headaches, no separate "run the frontend"
// step. Visiting your domain loads index.html automatically.
app.use(express.static(path.join(__dirname, "public")));

// API 404 fallback (only reached if no static file and no API route matched)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// Central error handler. In production, never leak internals (stack
// traces, SQL errors, etc.) to the client — log them server-side instead.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: isProd ? "Unexpected server error." : err.message,
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Tanwar Collections API running on port ${PORT}`);
});
