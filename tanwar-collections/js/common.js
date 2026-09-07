/* ============================================================
   common.js — shared storage + auth helpers
   NOTE: This demo uses localStorage as a stand-in backend so the
   UI has something real to read/write during the first sprint.
   Swap Storage.* calls for real API calls once the backend
   (auth + inventory endpoints) is ready.
   ============================================================ */

const Storage = {
  USERS_KEY: "tanwar_users",
  SESSION_KEY: "tanwar_session",
  INVENTORY_KEY: "tanwar_inventory",

  getUsers() {
    return JSON.parse(localStorage.getItem(this.USERS_KEY) || "[]");
  },
  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },
  getSession() {
    return JSON.parse(localStorage.getItem(this.SESSION_KEY) || "null");
  },
  setSession(user) {
    localStorage.setItem(
      this.SESSION_KEY,
      JSON.stringify({ name: user.name, email: user.email })
    );
  },
  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },
  getInventory() {
    return JSON.parse(localStorage.getItem(this.INVENTORY_KEY) || "[]");
  },
  saveInventory(items) {
    localStorage.setItem(this.INVENTORY_KEY, JSON.stringify(items));
  },
};

/** Seed a demo account + a handful of products so the dashboard
 *  isn't empty on first run. Runs once. */
function seedDemoData() {
  if (Storage.getUsers().length === 0) {
    Storage.saveUsers([
      { name: "Rakesh Tanwar", email: "owner@tanwarcollections.com", password: "demo1234" },
    ]);
  }

  if (Storage.getInventory().length === 0) {
    Storage.saveInventory([
      { id: cryptoId(), name: "Men's Cotton Kurta", category: "Men", sku: "TC-MK-101", size: "M", color: "White", price: 899, stock: 24, reorder: 8 },
      { id: cryptoId(), name: "Women's Anarkali Suit", category: "Women", sku: "TC-WA-204", size: "L", color: "Maroon", price: 2199, stock: 5, reorder: 6 },
      { id: cryptoId(), name: "Denim Jacket", category: "Unisex", sku: "TC-DJ-330", size: "XL", color: "Blue", price: 1599, stock: 12, reorder: 5 },
      { id: cryptoId(), name: "Kids Printed T-Shirt", category: "Kids", sku: "TC-KT-045", size: "6-7Y", color: "Yellow", price: 349, stock: 3, reorder: 10 },
      { id: cryptoId(), name: "Formal Trousers", category: "Men", sku: "TC-FT-118", size: "32", color: "Black", price: 1099, stock: 18, reorder: 6 },
      { id: cryptoId(), name: "Silk Dupatta", category: "Women", sku: "TC-SD-072", size: "Free", color: "Gold", price: 499, stock: 2, reorder: 8 },
    ]);
  }
}

function cryptoId() {
  return "p_" + Math.random().toString(36).slice(2, 10);
}

/** Call at the top of protected pages (home, dashboard). */
function requireAuth() {
  const session = Storage.getSession();
  if (!session) {
    window.location.href = "index.html";
  }
  return session;
}

function logout() {
  Storage.clearSession();
  window.location.href = "index.html";
}

function initSidebarUser() {
  const session = Storage.getSession();
  const nameEl = document.querySelector("[data-user-name]");
  const initialEl = document.querySelector("[data-user-initial]");
  if (session && nameEl) nameEl.textContent = session.name;
  if (session && initialEl) initialEl.textContent = session.name.charAt(0).toUpperCase();

  const logoutLink = document.querySelector("[data-logout]");
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  // mobile sidebar toggle
  const toggle = document.querySelector("[data-sidebar-toggle]");
  const sidebar = document.querySelector(".sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  }
}

document.addEventListener("DOMContentLoaded", seedDemoData);
