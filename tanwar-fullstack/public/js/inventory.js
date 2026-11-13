/* ============================================================
   inventory.js — Home page + Inventory (dashboard) page
   ============================================================ */

const ICONS = {
  edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
};

const $ = (id) => document.getElementById(id);

function plural(n, one, many) {
  return n + " " + (n === 1 ? one : many);
}

function stockStatus(item) {
  const stock = Number(item.stock);
  if (stock <= 0) return { label: "Out of stock", cls: "pill--low" };
  if (stock <= Number(item.reorder_level)) return { label: "Low stock", cls: "pill--low" };
  return { label: "In stock", cls: "pill--ok" };
}

/* ---------------- CSV export ---------------- */

function csvCell(value) {
  let s = String(value == null ? "" : value);
  // stop spreadsheet apps from running text like "=SUM(...)" as a formula
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadCsv(items) {
  const header = ["Name", "SKU", "Category", "Size", "Color", "Price (INR)", "Stock", "Reorder level", "Status"];
  const lines = [header.map(csvCell).join(",")];
  items.forEach((i) => {
    lines.push([i.name, i.sku, i.category, i.size, i.color, i.price, i.stock, i.reorder_level, stockStatus(i).label]
      .map(csvCell).join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tanwar-inventory-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
   HOME PAGE
   ============================================================ */

function greetingWord() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

async function initHome() {
  const grid = $("home-stats");
  if (!grid) return;

  const session = Session.get();
  const first = session && session.user ? session.user.name.split(" ")[0] : "";
  $("home-greeting").textContent = greetingWord() + (first ? ", " + first : "");

  const exportBtn = $("home-export");
  if (!exportBtn.dataset.bound) exportBtn.addEventListener("click", async () => {
    try {
      const items = await apiFetch("/products?sort=name");
      if (!items.length) return toast("There's nothing to export yet.");
      downloadCsv(items);
      toast("Exported " + plural(items.length, "product", "products") + ".", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  });
  exportBtn.dataset.bound = "1";

  grid.innerHTML = '<p class="loading-row" style="grid-column:1/-1;"><span class="spinner"></span>Loading…</p>';

  let s;
  try {
    s = await apiFetch("/products/stats");
  } catch (err) {
    grid.innerHTML = '<p class="loading-row" style="grid-column:1/-1;color:var(--brick);">Couldn\'t load your stats: '
      + escapeHtml(err.message) + ' <button type="button" class="btn btn-ghost btn-sm" id="retry-stats">Try again</button></p>';
    $("retry-stats").addEventListener("click", initHome);
    return;
  }

  /* dynamic banner */
  const title = $("banner-title");
  const text = $("banner-text");
  const cta = $("banner-cta");
  if (s.totalProducts === 0) {
    title.textContent = "Your store is empty";
    text.textContent = "Add your first product to start tracking stock.";
    cta.textContent = "Add a product";
    cta.href = "dashboard.html#add";
  } else if (s.lowStockCount > 0) {
    title.textContent = plural(s.lowStockCount, "product needs", "products need") + " reordering";
    text.textContent = "These items are at or below their reorder level. Restock them to avoid missing sales.";
    cta.textContent = "Review low stock";
    cta.href = "dashboard.html?status=low";
  } else {
    title.textContent = "Everything is well stocked";
    text.textContent = "No product is at or below its reorder level right now.";
    cta.textContent = "Open inventory";
    cta.href = "dashboard.html";
  }

  grid.innerHTML = `
    <div class="tag-card">
      <div class="tag-card__label">Total products</div>
      <div class="tag-card__value">${s.totalProducts}</div>
      <div class="tag-card__foot">across ${plural(s.categories, "category", "categories")}</div>
    </div>
    <div class="tag-card">
      <div class="tag-card__label">Units in stock</div>
      <div class="tag-card__value">${s.totalUnits.toLocaleString("en-IN")}</div>
      <div class="tag-card__foot">stock value ${money(s.stockValue)}</div>
    </div>
    <div class="tag-card">
      <div class="tag-card__label">Low stock alerts</div>
      <div class="tag-card__value ${s.lowStockCount ? "alert" : ""}">${s.lowStockCount}</div>
      <div class="tag-card__foot ${s.lowStockCount ? "down" : "up"}">${s.lowStockCount ? "need reordering soon" : "all above reorder level"}</div>
    </div>
    <div class="tag-card">
      <div class="tag-card__label">Out of stock</div>
      <div class="tag-card__value ${s.outOfStock ? "alert" : ""}">${s.outOfStock}</div>
      <div class="tag-card__foot ${s.outOfStock ? "down" : "up"}">${s.outOfStock ? "restock these first" : "nothing sold out"}</div>
    </div>`;

  const list = $("home-low-stock-list");
  if (s.lowStock.length === 0) {
    list.innerHTML = '<tr><td colspan="4"><div class="empty-state"><h3>Nothing to reorder</h3><p>All products are above their reorder level.</p></div></td></tr>';
  } else {
    let rows = s.lowStock.map((i) => {
      const st = stockStatus(i);
      return `<tr>
        <td><a class="prod-link" href="dashboard.html?search=${encodeURIComponent(i.sku)}">${escapeHtml(i.name)}</a><br><span class="prod-sku">${escapeHtml(i.sku)}</span></td>
        <td>${escapeHtml(i.category)}</td>
        <td>${Number(i.stock) <= 0 ? "none left" : i.stock + " left"}</td>
        <td><span class="pill ${st.cls}">${st.label === "Out of stock" ? "Out of stock" : "Reorder"}</span></td>
      </tr>`;
    }).join("");
    if (s.lowStockCount > s.lowStock.length) {
      rows += `<tr><td colspan="4" style="text-align:center;color:var(--muted);">+ ${s.lowStockCount - s.lowStock.length} more — <a class="prod-link" href="dashboard.html?status=low">view all</a></td></tr>`;
    }
    list.innerHTML = rows;
  }
}

/* ============================================================
   INVENTORY PAGE
   ============================================================ */

function initDashboard() {
  const tableBody = $("inv-table-body");
  if (!tableBody) return;

  const els = {
    search: $("inv-search"),
    category: $("inv-category-filter"),
    status: $("inv-status-filter"),
    sort: $("inv-sort"),
    clear: $("clear-filters"),
    heading: $("inv-heading"),
    exportBtn: $("export-csv"),
    addBtn: $("open-add-modal"),
    backdrop: $("product-modal-backdrop"),
    form: $("product-form"),
    title: $("modal-title"),
    msg: $("product-msg"),
    save: $("product-save"),
  };
  const state = { items: [], editId: null, reqId: 0 };

  /* start from the URL, e.g. dashboard.html?status=low or ?search=TC-MK-101 */
  const params = new URLSearchParams(window.location.search);
  els.search.value = (params.get("search") || "").slice(0, 100);
  [["status", els.status], ["category", els.category], ["sort", els.sort]].forEach(([key, el]) => {
    const v = params.get(key);
    if (v) { el.value = v; if (el.value !== v) el.selectedIndex = 0; }
  });

  const hasFilters = () => els.search.value.trim() !== "" || els.category.value !== "all" || els.status.value !== "all";

  /* ---------- loading + rendering ---------- */

  async function load(silent) {
    const mine = ++state.reqId; // ignore out-of-date responses (fast typing)
    els.clear.hidden = !hasFilters();
    if (!silent) {
      tableBody.innerHTML = '<tr><td colspan="7"><div class="loading-row"><span class="spinner"></span>Loading products…</div></td></tr>';
    }

    const qs = new URLSearchParams({
      search: els.search.value.trim(),
      category: els.category.value,
      status: els.status.value,
      sort: els.sort.value,
    });

    let items;
    try {
      items = await apiFetch("/products?" + qs.toString());
    } catch (err) {
      if (mine !== state.reqId) return;
      tableBody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><h3>Couldn\'t load products</h3><p>'
        + escapeHtml(err.message) + '</p><button type="button" class="btn btn-ghost btn-sm" data-action="retry">Try again</button></div></td></tr>';
      return;
    }
    if (mine !== state.reqId) return;
    state.items = items;
    render();
  }

  function render() {
    const items = state.items;
    els.heading.innerHTML = '<span id="inv-count">' + items.length + "</span> " + (items.length === 1 ? "product" : "products");

    if (items.length === 0) {
      tableBody.innerHTML = hasFilters()
        ? '<tr><td colspan="7"><div class="empty-state"><h3>No products match</h3><p>Try a different search or filter.</p><button type="button" class="btn btn-ghost btn-sm" data-action="clear">Clear filters</button></div></td></tr>'
        : '<tr><td colspan="7"><div class="empty-state"><h3>No products yet</h3><p>Add your first product to start tracking stock.</p><button type="button" class="btn btn-gold btn-sm" data-action="add">+ Add product</button></div></td></tr>';
      return;
    }

    tableBody.innerHTML = items.map((i) => {
      const st = stockStatus(i);
      const name = escapeHtml(i.name);
      return `<tr>
        <td><span class="prod-name">${name}</span><br><span class="prod-sku">${escapeHtml(i.sku)}</span></td>
        <td>${escapeHtml(i.category)}</td>
        <td>${escapeHtml(i.size)} · ${escapeHtml(i.color)}</td>
        <td>${money(i.price)}</td>
        <td>
          <div class="stepper">
            <button type="button" class="step-btn" data-action="stock" data-delta="-1" data-id="${i.id}" aria-label="Decrease stock of ${name}" ${Number(i.stock) <= 0 ? "disabled" : ""}>−</button>
            <span class="stepper__n">${i.stock}</span>
            <button type="button" class="step-btn" data-action="stock" data-delta="1" data-id="${i.id}" aria-label="Increase stock of ${name}">+</button>
          </div>
        </td>
        <td><span class="pill ${st.cls}">${st.label}</span></td>
        <td>
          <div class="row-actions">
            <button type="button" class="icon-btn" title="Edit" aria-label="Edit ${name}" data-action="edit" data-id="${i.id}">${ICONS.edit}</button>
            <button type="button" class="icon-btn danger" title="Delete" aria-label="Delete ${name}" data-action="delete" data-id="${i.id}">${ICONS.trash}</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  /* ---------- row actions (one delegated listener) ---------- */

  tableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "edit") openModal(btn.dataset.id);
    else if (action === "delete") deleteProduct(btn.dataset.id);
    else if (action === "stock") adjustStock(btn.dataset.id, Number(btn.dataset.delta), btn);
    else if (action === "retry") load(false);
    else if (action === "clear") clearFilters();
    else if (action === "add") openModal(null);
  });

  async function adjustStock(id, delta, btn) {
    const row = btn.closest("tr");
    row.querySelectorAll(".step-btn").forEach((b) => (b.disabled = true));
    try {
      await apiFetch("/products/" + id + "/stock", { method: "PATCH", body: JSON.stringify({ delta }) });
    } catch (err) {
      toast(err.message, "error");
    }
    load(true);
  }

  async function deleteProduct(id) {
    const item = state.items.find((i) => String(i.id) === String(id));
    if (!item) return;
    const ok = await confirmDialog({
      title: "Delete this product?",
      message: '"' + item.name + '" will be permanently removed from your inventory. This can\'t be undone.',
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch("/products/" + id, { method: "DELETE" });
      toast('Deleted "' + item.name + '".', "success");
    } catch (err) {
      toast(err.message, "error");
    }
    load(true);
  }

  /* ---------- add / edit modal ---------- */

  function showModalError(text) {
    els.msg.textContent = text;
    els.msg.classList.add("show");
  }

  function openModal(id) {
    state.editId = id || null;
    els.form.reset();
    els.msg.classList.remove("show");
    const f = els.form;

    if (id) {
      const item = state.items.find((i) => String(i.id) === String(id));
      if (!item) return;
      els.title.textContent = "Edit product";
      f.elements.name.value = item.name;
      f.elements.category.value = item.category;
      f.elements.sku.value = item.sku;
      f.elements.size.value = item.size;
      f.elements.color.value = item.color;
      f.elements.price.value = item.price;
      f.elements.stock.value = item.stock;
      f.elements.reorder.value = item.reorder_level;
    } else {
      els.title.textContent = "Add product";
    }
    els.backdrop.classList.add("open");
    document.body.classList.add("modal-open");
    f.elements.name.focus();
  }

  function closeModal() {
    els.backdrop.classList.remove("open");
    if (!document.querySelector(".modal-backdrop.open")) document.body.classList.remove("modal-open");
    state.editId = null;
  }

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.msg.classList.remove("show");
    const f = els.form;

    const payload = {
      name: f.elements.name.value.trim(),
      category: f.elements.category.value,
      sku: f.elements.sku.value.trim(),
      size: f.elements.size.value.trim(),
      color: f.elements.color.value.trim(),
      price: f.elements.price.value === "" ? NaN : Number(f.elements.price.value),
      stock: f.elements.stock.value === "" ? NaN : Number(f.elements.stock.value),
      reorder_level: f.elements.reorder.value === "" ? NaN : Number(f.elements.reorder.value),
    };

    if (!payload.name) return showModalError("Enter the product name.");
    if (!payload.sku) return showModalError("Enter a SKU.");
    if (!payload.size) return showModalError("Enter a size (e.g. M, 32 or Free).");
    if (!payload.color) return showModalError("Enter a color.");
    if (!Number.isFinite(payload.price) || payload.price < 0) return showModalError("Enter a valid price (0 or more).");
    if (!Number.isInteger(payload.stock) || payload.stock < 0) return showModalError("Stock must be a whole number (0 or more).");
    if (!Number.isInteger(payload.reorder_level) || payload.reorder_level < 0) return showModalError("Reorder level must be a whole number (0 or more).");

    const editing = !!state.editId;
    setBusy(els.save, true, "Saving…");
    try {
      await apiFetch(editing ? "/products/" + state.editId : "/products", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      closeModal();
      toast(editing ? "Changes saved." : "Product added.", "success");
      load(true);
    } catch (err) {
      showModalError(err.message); // e.g. "A product with this SKU already exists."
    } finally {
      setBusy(els.save, false);
    }
  });

  els.addBtn.addEventListener("click", () => openModal(null));
  document.querySelectorAll("[data-close-modal]").forEach((el) => el.addEventListener("click", closeModal));
  els.backdrop.addEventListener("mousedown", (e) => { if (e.target === els.backdrop) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.backdrop.classList.contains("open")) closeModal();
  });

  /* ---------- filters ---------- */

  let timer = null;
  els.search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => load(false), 250);
  });
  [els.category, els.status, els.sort].forEach((el) => el.addEventListener("change", () => load(false)));

  function clearFilters() {
    els.search.value = "";
    els.category.value = "all";
    els.status.value = "all";
    load(false);
  }
  els.clear.addEventListener("click", clearFilters);

  els.exportBtn.addEventListener("click", () => {
    if (!state.items.length) return toast("There's nothing to export.");
    downloadCsv(state.items);
    toast("Exported " + plural(state.items.length, "product", "products") + ".", "success");
  });

  /* ---------- go ---------- */
  load(false);

  // Coming from Home's "Add a product" shortcut
  if (window.location.hash === "#add") {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    openModal(null);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof AUTH_OK !== "undefined" && !AUTH_OK) return;
  initHome();
  initDashboard();
});
