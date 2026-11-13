/**
 * Runs automatically every time the server starts, so nobody has to run any
 * database command by hand:
 *   - creates the `users` and `products` tables if they don't exist yet
 *   - adds sample products ONLY when the products table is brand new
 *   - makes sure the built-in demo login exists (turn off with SEED_DEMO=false)
 * Existing data is never changed or removed.
 */

// bcrypt hash of the demo password (the plain password is never stored)
const DEMO_HASH = "$2a$10$rZ4SsYiRMCvO4uRMyDERfObIW4rkpv8tzpDFPPTFrF4UnngRiA49.";

const CREATE_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    email         VARCHAR(190)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`;

const CREATE_PRODUCTS = `
  CREATE TABLE IF NOT EXISTS products (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150)  NOT NULL,
    category      VARCHAR(60)   NOT NULL,
    sku           VARCHAR(60)   NOT NULL UNIQUE,
    size          VARCHAR(30)   NOT NULL,
    color         VARCHAR(40)   NOT NULL,
    price         DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock         INT           NOT NULL DEFAULT 0,
    reorder_level INT           NOT NULL DEFAULT 0,
    created_by    INT           NULL,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_created_by
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`;

const SAMPLE_PRODUCTS = [
  ["Men's Cotton Kurta", "Men", "TC-MK-101", "M", "White", 899, 24, 8],
  ["Women's Anarkali Suit", "Women", "TC-WA-204", "L", "Maroon", 2199, 5, 6],
  ["Denim Jacket", "Unisex", "TC-DJ-330", "XL", "Blue", 1599, 12, 5],
  ["Kids Printed T-Shirt", "Kids", "TC-KT-045", "6-7Y", "Yellow", 349, 3, 10],
  ["Formal Trousers", "Men", "TC-FT-118", "32", "Black", 1099, 18, 6],
  ["Silk Dupatta", "Women", "TC-SD-072", "Free", "Gold", 499, 2, 8],
];

async function ensureSchema(pool) {
  const [rows] = await pool.query(
    `SELECT table_name AS t FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name IN ('users', 'products')`
  );
  const existing = rows.map((r) => String(r.t || r.T || r.TABLE_NAME).toLowerCase());
  const productsExisted = existing.includes("products");

  if (!(existing.includes("users") && productsExisted)) {
    await pool.query(CREATE_USERS);
    await pool.query(CREATE_PRODUCTS);
    console.log("Database tables created.");
  }

  if (!productsExisted) {
    await pool.query(
      `INSERT INTO products (name, category, sku, size, color, price, stock, reorder_level)
       VALUES ? ON DUPLICATE KEY UPDATE sku = sku`,
      [SAMPLE_PRODUCTS]
    );
    console.log("Sample products added.");
  }

  if (process.env.SEED_DEMO !== "false") {
    await pool.query(
      `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE email = email`,
      ["Rakesh Tanwar", "owner@tanwarcollections.com", DEMO_HASH]
    );
  }
}

module.exports = { ensureSchema };
