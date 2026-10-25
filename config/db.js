const mysql = require("mysql2/promise");

// A connection pool is reused across requests instead of opening a new
// MySQL connection every time — this is the standard pattern for a
// web server talking to a relational database.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tanwar_collections",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
