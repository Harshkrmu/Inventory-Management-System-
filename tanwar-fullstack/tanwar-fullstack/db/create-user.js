/**
 * Create a login — or reset its password if the email already exists —
 * on whichever database your .env points to (local or Clever Cloud).
 *
 * Usage:
 *   npm run user:add -- <email> <password> "<Full Name>"
 *
 * Example (re-creates the demo login):
 *   npm run user:add -- owner@tanwarcollections.com demo1234 "Rakesh Tanwar"
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

async function main() {
  const [emailArg, password, ...nameParts] = process.argv.slice(2);
  const email = (emailArg || "").trim().toLowerCase();
  const name = nameParts.join(" ").trim() || email.split("@")[0];

  if (!/^\S+@\S+\.\S+$/.test(email) || !password || password.length < 6) {
    console.error('Usage: npm run user:add -- <email> <password (6+ chars)> "<Full Name>"');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const hash = await bcrypt.hash(password, 10);
  const [result] = await connection.query(
    `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash)`,
    [name, email, hash]
  );

  console.log(`Connected to ${process.env.DB_HOST} / ${process.env.DB_NAME}`);
  console.log(result.affectedRows === 1 ? `Created login: ${email}` : `Updated login (password reset): ${email}`);
  await connection.end();
}

main().catch((err) => {
  console.error("Could not create the login:\n", err.message);
  process.exit(1);
});
