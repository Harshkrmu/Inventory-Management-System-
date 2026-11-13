/**
 * Read-only peek at what is in your database right now (users + products).
 * Uses the same DB_* values as your .env, so it works for a local database
 * or a hosted one (e.g. Clever Cloud) — whichever your .env points to.
 *
 * Usage: npm run db:view
 */
require("dotenv").config();
const mysql = require("mysql2/promise");

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log(`\nConnected to ${process.env.DB_HOST} / ${process.env.DB_NAME}\n`);

  const [users] = await connection.query("SELECT id, name, email, created_at FROM users");
  console.log(`USERS (${users.length}):`);
  console.table(users);

  const [products] = await connection.query(
    "SELECT id, name, category, sku, size, color, price, stock, reorder_level FROM products ORDER BY id"
  );
  console.log(`\nPRODUCTS (${products.length}):`);
  console.table(products);

  await connection.end();
}

main().catch((err) => {
  console.error("Could not read the database:\n", err.message);
  process.exit(1);
});
