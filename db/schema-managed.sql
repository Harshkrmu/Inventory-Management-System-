-- Tanwar Collections — Inventory Manager
-- Use THIS file (instead of schema.sql) on any free/shared MySQL host
-- that already assigns you a database name (Clever Cloud, etc.) —
-- those hosts don't let you run CREATE DATABASE yourself, so this
-- version skips straight to creating the tables inside the database
-- you were already given.
--
-- Run it with:
--   mysql -h HOST -P PORT -u USER -p DATABASE_NAME < db/schema-managed.sql


CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)        NOT NULL,
  email         VARCHAR(190)        NOT NULL UNIQUE,
  password_hash VARCHAR(255)        NOT NULL,
  created_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150)        NOT NULL,
  category      VARCHAR(60)         NOT NULL,
  sku           VARCHAR(60)         NOT NULL UNIQUE,
  size          VARCHAR(30)         NOT NULL,
  color         VARCHAR(40)         NOT NULL,
  price         DECIMAL(10,2)       NOT NULL DEFAULT 0,
  stock         INT                 NOT NULL DEFAULT 0,
  reorder_level INT                 NOT NULL DEFAULT 0,
  created_by    INT                 NULL,
  created_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Demo login so the app works out of the box:
--   email:    owner@tanwarcollections.com
--   password: demo1234
INSERT INTO users (name, email, password_hash)
VALUES ('Rakesh Tanwar', 'owner@tanwarcollections.com', '$2a$10$rZ4SsYiRMCvO4uRMyDERfObIW4rkpv8tzpDFPPTFrF4UnngRiA49.')
ON DUPLICATE KEY UPDATE email = email;

-- A couple of demo rows so the dashboard isn't empty on first run.
INSERT INTO products (name, category, sku, size, color, price, stock, reorder_level)
VALUES
  ('Men''s Cotton Kurta',   'Men',   'TC-MK-101', 'M',    'White',  899.00,  24, 8),
  ('Women''s Anarkali Suit','Women', 'TC-WA-204', 'L',    'Maroon', 2199.00, 5,  6),
  ('Denim Jacket',          'Unisex','TC-DJ-330', 'XL',   'Blue',   1599.00, 12, 5),
  ('Kids Printed T-Shirt',  'Kids',  'TC-KT-045', '6-7Y', 'Yellow', 349.00,  3,  10),
  ('Formal Trousers',       'Men',   'TC-FT-118', '32',   'Black',  1099.00, 18, 6),
  ('Silk Dupatta',          'Women', 'TC-SD-072', 'Free', 'Gold',   499.00,  2,  8)
ON DUPLICATE KEY UPDATE sku = sku;
