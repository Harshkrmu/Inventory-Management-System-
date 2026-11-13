const mysql = require("mysql2/promise");

// One shared pool for the whole app (cheaper than opening a new
// connection on every request).
//
// DB_POOL_LIMIT defaults to 4 on purpose: free hosted MySQL plans
// (e.g. Clever Cloud "Dev") only allow a handful of simultaneous
// connections per user, and going over that limit makes requests fail.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tanwar_collections",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 4,
  queueLimit: 0,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  decimalNumbers: true, // return DECIMAL columns (price) as numbers, not strings
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;
