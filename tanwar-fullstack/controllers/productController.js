const pool = require("../config/db");

/** GET /api/products?search=&category=&status= */
async function list(req, res) {
  try {
    const { search = "", category = "all", status = "all" } = req.query;

    let sql = "SELECT * FROM products WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND (name LIKE ? OR sku LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== "all") {
      sql += " AND category = ?";
      params.push(category);
    }
    if (status === "low") {
      sql += " AND stock <= reorder_level";
    } else if (status === "ok") {
      sql += " AND stock > reorder_level";
    }

    sql += " ORDER BY created_at DESC";

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
    const [rows] = await pool.query("SELECT * FROM products");
    const totalProducts = rows.length;
    const totalUnits = rows.reduce((sum, r) => sum + r.stock, 0);
    const stockValue = rows.reduce((sum, r) => sum + r.stock * Number(r.price), 0);
    const lowStock = rows.filter((r) => r.stock <= r.reorder_level);
    const categories = new Set(rows.map((r) => r.category)).size;

    res.json({
      totalProducts,
      totalUnits,
      stockValue,
      categories,
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
    const { name, category, sku, size, color, price, stock, reorder_level } = req.body;

    if (!name || !category || !sku || !size || !color) {
      return res.status(400).json({ error: "All product fields are required." });
    }

    const [result] = await pool.query(
      `INSERT INTO products (name, category, sku, size, color, price, stock, reorder_level, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category, sku, size, color, price || 0, stock || 0, reorder_level || 0, req.user.id]
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
    const { id } = req.params;
    const { name, category, sku, size, color, price, stock, reorder_level } = req.body;

    const [existing] = await pool.query("SELECT id FROM products WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    await pool.query(
      `UPDATE products
       SET name = ?, category = ?, sku = ?, size = ?, color = ?, price = ?, stock = ?, reorder_level = ?
       WHERE id = ?`,
      [name, category, sku, size, color, price, stock, reorder_level, id]
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

/** DELETE /api/products/:id */
async function remove(req, res) {
  try {
    const { id } = req.params;
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

module.exports = { list, stats, create, update, remove };
