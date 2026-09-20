/* ============================================================
   inventory.js — home stats + dashboard CRUD, backed by the API
   ============================================================ */

function money(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

/* ---------------- HOME PAGE STATS ---------------- */

async function renderHomeStats() {
  const grid = document.getElementById("home-stats");
  if (!grid) return; // not on this page

  grid.innerHTML = `<p style="color:var(--muted); font-size:13.5px;">Loading…</p>`;

  let s;
  try {
    s = await apiFetch("/products/stats");
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--brick); font-size:13.5px;">Couldn't load stats: ${err.message}</p>`;
    return;
  }

  grid.innerHTML = `
    <div class="tag-card">
      <div class="tag-card__label">Total products</div>
      <div class="tag-card__value">${s.totalProducts}</div>
      <div class="tag-card__foot">across ${s.categories} categories</div>
    </div>
    <div class="tag-card">
      <div class="tag-card__label">Units in stock</div>
      <div class="tag-card__value">${s.totalUnits}</div>
      <div class="tag-card__foot">stock value ${money(s.stockValue)}</div>
    </div>
    <div class="tag-card">
      <div class="tag-card__label">Low stock alerts</div>
      <div class="tag-card__value ${s.lowStock.length ? "alert" : ""}">${s.lowStock.length}</div>
      <div class="tag-card__foot ${s.lowStock.length ? "down" : ""}">
        ${s.lowStock.length ? "need reordering soon" : "everything's well stocked"}
      </div>
    </div>
    <div class="tag-card">
      <div class="tag-card__label">Today's sign-in</div>
      <div class="tag-card__value" style="font-size:20px; padding-top:8px;">${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
      <div class="tag-card__foot">live data from the API</div>
    </div>
  `;

  const lowList = document.getElementById("home-low-stock-list");
  if (lowList) {
    if (s.lowStock.length === 0) {
      lowList.innerHTML = `<tr><td colspan="4"><div class="empty-state"><h3>Nothing to reorder</h3><p>All products are above their reorder level.</p></div></td></tr>`;
    } else {
      lowList.innerHTML = s.lowStock
        .slice(0, 5)
        .map(
          (i) => `
        <tr>
          <td><span class="prod-name">${i.name}</span><br><span class="prod-sku">${i.sku}</span></td>
          <td>${i.category}</td>
          <td>${i.stock} left</td>
          <td><span class="pill pill--low">Reorder</span></td>
        </tr>`
        )
        .join("");
    }
  }
}

/* ---------------- DASHBOARD TABLE ---------------- */

let currentEditId = null;

function initDashboard() {
  const tableBody = document.getElementById("inv-table-body");
  if (!tableBody) return; // not on this page

  const searchInput = document.getElementById("inv-search");
  const categoryFilter = document.getElementById("inv-category-filter");
  const statusFilter = document.getElementById("inv-status-filter");
  const addBtn = document.getElementById("open-add-modal");
  const modalBackdrop = document.getElementById("product-modal-backdrop");
  const modalCloseEls = document.querySelectorAll("[data-close-modal]");
  const form = document.getElementById("product-form");
  const saveBtn = form.querySelector('button[type="submit"]');

  let debounceTimer = null;

  async function fetchProducts() {
    const params = new URLSearchParams({
      search: searchInput.value.trim(),
      category: categoryFilter.value,
      status: statusFilter.value,
    });
    return apiFetch(`/products?${params.toString()}`);
  }

  async function renderTable() {
    tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>Loading products…</p></div></td></tr>`;

    let items;
    try {
      items = await fetchProducts();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><h3>Couldn't load products</h3><p>${err.message}</p></div></td></tr>`;
      return;
    }

    const countEl = document.getElementById("inv-count");
    if (countEl) countEl.textContent = items.length;

    if (items.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <h3>No products match</h3>
            <p>Try a different search term or filter, or add a new product.</p>
          </div>
        </td></tr>`;
      return;
    }

    tableBody.innerHTML = items
      .map((i) => {
        const isLow = Number(i.stock) <= Number(i.reorder_level);
        return `
        <tr>
          <td><span class="prod-name">${i.name}</span><br><span class="prod-sku">${i.sku}</span></td>
          <td>${i.category}</td>
          <td>${i.size} · ${i.color}</td>
          <td>${money(i.price)}</td>
          <td>${i.stock} units</td>
          <td><span class="pill ${isLow ? "pill--low" : "pill--ok"}">${isLow ? "Low stock" : "In stock"}</span></td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" title="Edit" data-edit="${i.id}">${ICONS.edit}</button>
              <button class="icon-btn danger" title="Delete" data-delete="${i.id}">${ICONS.trash}</button>
            </div>
          </td>
        </tr>`;
      })
      .join("");

    tableBody.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.edit, items));
    });
    tableBody.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.delete, btn));
    });
  }

  async function deleteProduct(id, btn) {
    const row = btn.closest("tr");
    const name = row.querySelector(".prod-name")?.textContent || "this product";
    if (!confirm(`Remove "${name}" from inventory?`)) return;

    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      renderTable();
    } catch (err) {
      alert(`Couldn't delete: ${err.message}`);
    }
  }

  function openModal(id, items) {
    currentEditId = id || null;
    const title = document.getElementById("modal-title");
    form.reset();

    if (id) {
      const item = items.find((i) => String(i.id) === String(id));
      title.textContent = "Edit product";
      form.name.value = item.name;
      form.category.value = item.category;
      form.sku.value = item.sku;
      form.size.value = item.size;
      form.color.value = item.color;
      form.price.value = item.price;
      form.stock.value = item.stock;
      form.reorder.value = item.reorder_level;
    } else {
      title.textContent = "Add product";
    }
    modalBackdrop.classList.add("open");
  }

  function closeModal() {
    modalBackdrop.classList.remove("open");
    currentEditId = null;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name.value.trim(),
      category: form.category.value,
      sku: form.sku.value.trim(),
      size: form.size.value.trim(),
      color: form.color.value.trim(),
      price: Number(form.price.value),
      stock: Number(form.stock.value),
      reorder_level: Number(form.reorder.value),
    };

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      if (currentEditId) {
        await apiFetch(`/products/${currentEditId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/products`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      closeModal();
      renderTable();
    } catch (err) {
      alert(`Couldn't save product: ${err.message}`);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save product";
    }
  });

  addBtn.addEventListener("click", () => openModal(null, []));
  modalCloseEls.forEach((el) => el.addEventListener("click", closeModal));
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  function debouncedRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(renderTable, 250);
  }

  searchInput.addEventListener("input", debouncedRender);
  categoryFilter.addEventListener("change", renderTable);
  statusFilter.addEventListener("change", renderTable);

  renderTable();
}

const ICONS = {
  edit: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
};

document.addEventListener("DOMContentLoaded", () => {
  renderHomeStats();
  initDashboard();
});
