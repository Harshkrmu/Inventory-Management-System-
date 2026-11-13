const pool = require("../config/db");

const CATEGORIES = ["Men", "Women", "Kids", "Unisex"];

const SORTS = {
  newest: "created_at DESC, id DESC",
  name: "name ASC",
  price_asc: "price ASC, name ASC",
  price_desc: "price DESC, name ASC",
  stock_asc: "stock ASC, name ASC",
  stock_desc: "stock DESC, name ASC",
};

/** Number that is NaN for blank/missing values (so "" doesn't silently become 0). */
function toNum(v) {
  if (v === undefined || v === null || v === "") return NaN;
  return Number(v);
}

/** Validates + cleans a product payload. Returns { error } or { value }. */
function parseProduct(body) {
  const b = body || {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");

  const name = str(b.name);
  const category = str(b.category);
  const sku = str(b.sku).toUpperCase();
  const size = str(b.size);
  const color = str(b.color);
  const price = toNum(b.price);
  const stock = toNum(b.stock);
  const reorder = toNum(b.reorder_level);

  if (!name) return { error: "Product name is required." };
  if (name.length > 150) return { error: "Product name is too long (150 characters maximum)." };
  if (!CATEGORIES.includes(category)) return { error: `Category must be one of: ${CATEGORIES.join(", ")}.` };
  if (!sku) return { error: "SKU is required." };
  if (sku.length > 60) return { error: "SKU is too long (60 characters maximum)." };
  if (!size) return { error: "Size is required." };
  if (size.length > 30) return { error: "Size is too long (30 characters maximum)." };
  if (!color) return { error: "Color is required." };
  if (color.length > 40) return { error: "Color is too long (40 characters maximum)." };
  if (!Number.isFinite(price) || price < 0 || price > 99999999.99) {
    return { error: "Enter a valid price (0 or more)." };
  }
  if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) {
    return { error: "Stock must be a whole number (0 or more)." };
  }
  if (!Number.isInteger(reorder) || reorder < 0 || reorder > 1000000) {
    return { error: "Reorder level must be a whole number (0 or more)." };
  }

  return {
    value: { name, category, sku, size, color, price: Math.round(price * 100) / 100, stock, reorder_level: reorder },
  };
}

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** GET /api/products?search=&category=&status=&sort= */
async function list(req, res) {
  try {
    const { category = "all", status = "all", sort = "newest" } = req.query;
    const search = String(req.query.search || "").trim().slice(0, 100);

    let sql = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (search) {
      // escape LIKE wildcards so searching for "50%" or "_" behaves literally
      const like = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
      sql += " AND (name LIKE ? OR sku LIKE ? OR color LIKE ?)";
      params.push(like, like, like);
    }
    if (category !== "all") {
      sql += " AND category = ?";
      params.push(category);
    }
    if (status === "low") {
      sql += " AND stock <= reorder_level";
    } else if (status === "ok") {
      sql += " AND stock > reorder_level";
    } else if (status === "out") {
      sql += " AND stock = 0";
    }

    sql += ` ORDER BY ${SORTS[sort] || SORTS.newest}`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load products." });
  }
}

/** GET /api/products/stats — powers the Home page summary cards */
async function stats(req, res) {
  try {
    const [[totals]] = await pool.query(
      `SELECT COUNT(*)                          AS totalProducts,
              COALESCE(SUM(stock), 0)           AS totalUnits,
              COALESCE(SUM(stock * price), 0)   AS stockValue,
              COUNT(DISTINCT category)          AS categories,
              COALESCE(SUM(stock = 0), 0)       AS outOfStock,
              COALESCE(SUM(stock <= reorder_level), 0) AS lowStockCount
         FROM products`
    );
    const [lowStock] = await pool.query(
      `SELECT * FROM products
        WHERE stock <= reorder_level
        ORDER BY (stock - reorder_level) ASC, name ASC
        LIMIT 8`
    );

    res.json({
      totalProducts: Number(totals.totalProducts),
      totalUnits: Number(totals.totalUnits),
      stockValue: Number(totals.stockValue),
      categories: Number(totals.categories),
      outOfStock: Number(totals.outOfStock),
      lowStockCount: Number(totals.lowStockCount),
      lowStock,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load stats." });
  }
}

/** POST /api/products */
async function create(req, res) {
  try {
    const { error, value } = parseProduct(req.body);
    if (error) return res.status(400).json({ error });

    const [result] = await pool.query(
      `INSERT INTO products (name, category, sku, size, color, price, stock, reorder_level, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [value.name, value.category, value.sku, value.size, value.color, value.price, value.stock, value.reorder_level, req.user.id]
    );

    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "A product with this SKU already exists." });
    }
    console.error(err);
    res.status(500).json({ error: "Could not create product." });
  }
}

/** PUT /api/products/:id */
async function update(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: "Product not found." });

    const { error, value } = parseProduct(req.body);
    if (error) return res.status(400).json({ error });

    const [existing] = await pool.query("SELECT id FROM products WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    await pool.query(
      `UPDATE products
          SET name = ?, category = ?, sku = ?, size = ?, color = ?, price = ?, stock = ?, reorder_level = ?
        WHERE id = ?`,
      [value.name, value.category, value.sku, value.size, value.color, value.price, value.stock, value.reorder_level, id]
    );

    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "A product with this SKU already exists." });
    }
    console.error(err);
    res.status(500).json({ error: "Could not update product." });
  }
}

/** PATCH /api/products/:id/stock  { delta: +5 | -1 } — quick stock adjustment */
async function adjustStock(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: "Product not found." });

    const delta = toNum((req.body || {}).delta);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) {
      return res.status(400).json({ error: "delta must be a non-zero whole number." });
    }

    // GREATEST(...,0) means stock can never go negative
    const [result] = await pool.query(
      "UPDATE products SET stock = GREATEST(stock + ?, 0) WHERE id = ?",
      [delta, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not adjust stock." });
  }
}

/** DELETE /api/products/:id */
async function remove(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: "Product not found." });

    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found." });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete product." });
  }
}

module.exports = { list, stats, create, update, adjustStock, remove, CATEGORIES };
