/**
 * Run the schema.sql file against MySQL using the credentials in .env.
 * Usage: npm run db:init
 *
 * This connects WITHOUT selecting a database first (since schema.sql
 * creates the database itself), then executes the whole file.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  console.log("Connected. Running schema.sql ...");
  await connection.query(sql);
  console.log("Done — database and tables are ready.");
  await connection.end();
}

main().catch((err) => {
  console.error("Failed to initialise database:\n", err.message);
  process.exit(1);
});
