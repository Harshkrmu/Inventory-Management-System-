/**
 * Run schema-managed.sql against a REMOTE/managed MySQL database
 * (Clever Cloud, or any host that already gives you a database name)
 * using pure Node.js — no local "mysql" command-line client needed.
 *
 * Usage:
 *   1. Fill in DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env
 *      with the values from your Clever Cloud MySQL add-on.
 *   2. npm run db:init:managed
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing values in .env: ${missing.join(", ")}`);
    console.error("Fill these in from your Clever Cloud MySQL add-on's Information tab.");
    process.exit(1);
  }

  const sql = fs.readFileSync(path.join(__dirname, "schema-managed.sql"), "utf8");

  console.log(`Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT} as ${process.env.DB_USER} ...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, // this DB already exists on managed hosts — we don't create it
    multipleStatements: true,
  });

  console.log("Connected. Running schema-managed.sql ...");
  await connection.query(sql);
  console.log("Done — tables and demo data are ready on your remote database.");
  await connection.end();
}

main().catch((err) => {
  console.error("Failed to initialise the remote database:\n", err.message);
  process.exit(1);
});
