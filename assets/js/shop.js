const PRODUCTS = [
  {
    id: "sg-full", cat: "sparring", name: "Complete Sparring Set", price: 89.99,
    desc: "Head guard, chest protector, forearm & shin guards — everything you need for the mat.",
    badge: "Best Value", icon: "🛡️"
  },
  {
    id: "sg-head", cat: "sparring", name: "Head Guard", price: 29.99,
    desc: "WT-style padded helmet with face shield and adjustable hook-and-loop strap.",
    icon: "⛑️"
  },
  {
    id: "sg-chest", cat: "sparring", name: "Chest Protector (Hogu)", price: 34.99,
    desc: "Lightweight reversible hogu available in white and blue. Electronic scoring compatible.",
    icon: "🏋️"
  },
  {
    id: "sg-limbs", cat: "sparring", name: "Forearm & Shin Guards", price: 24.99,
    desc: "Foam-padded arm and leg guards for competition-style sparring. Sold as a set.",
    icon: "🦾"
  },
  {
    id: "ap-tee", cat: "apparel", name: "AraTKD T-Shirt", price: 24.99,
    desc: "Classic AraTKD logo tee in 100% cotton. Available in sizes S – XXL.",
    icon: "👕"
  },
  {
    id: "ap-hoodie", cat: "apparel", name: "AraTKD Hoodie", price: 44.99,
    desc: "Pullover hoodie with embroidered ARA logo. Perfect for cool dojang mornings.",
    badge: "New", icon: "🧥"
  },
  {
    id: "ap-hat", cat: "apparel", name: "AraTKD Snapback", price: 19.99,
    desc: "Embroidered snapback cap with the ARA TKD crest. One size fits most.",
    icon: "🧢"
  },
  {
    id: "un-student", cat: "uniforms", name: "Student Dobok (White)", price: 39.99,
    desc: "Traditional white TKD uniform, cotton-poly blend. All sizes from 00 to 7.",
    badge: "Most Popular", icon: "🥋"
  },
  {
    id: "un-comp", cat: "uniforms", name: "Competition Dobok", price: 64.99,
    desc: "Lightweight WT-cut performance uniform for testing and tournaments.",
    icon: "🎖️"
  },
  {
    id: "eq-pad", cat: "equipment", name: "Kicking Target Pad", price: 19.99,
    desc: "Foam striking pad with hand grip. Ideal for partner drills and power training.",
    icon: "🎯"
  },
  {
    id: "eq-boards", cat: "equipment", name: "Breaking Boards (5-pack)", price: 12.99,
    desc: "Rebreakable plastic boards — white for beginners, colored for intermediate students.",
    icon: "🪵"
  },
  {
    id: "eq-belt", cat: "equipment", name: "Replacement Belt", price: 9.99,
    desc: "Replacement belt for your current rank. Specify your color and size in the order notes.",
    icon: "🏅"
  }
];

const CAT_LABELS = {
  all: "All Gear",
  sparring: "Sparring Gear",
  apparel: "Apparel",
  uniforms: "Uniforms",
  equipment: "Equipment"
};

const CAT_COLORS = {
  sparring: "#d81f26",
  apparel: "#2563eb",
  uniforms: "#7c3aed",
  equipment: "#059669"
};

let cart = [];
let activeFilter = "all";

function fmt(n) { return "$" + n.toFixed(2); }

function cartTotal() {
  return cart.reduce((s, e) => s + e.product.price * e.qty, 0);
}

function cartCount() {
  return cart.reduce((s, e) => s + e.qty, 0);
}

function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  const entry = cart.find(e => e.product.id === id);
  if (entry) entry.qty++;
  else cart.push({ product, qty: 1 });
  renderCartTray();
  showAddedFeedback(id);
}

function removeFromCart(id) {
  cart = cart.filter(e => e.product.id !== id);
  renderCartTray();
  renderOrderItems();
}

function setQty(id, qty) {
  const entry = cart.find(e => e.product.id === id);
  if (!entry) return;
  if (qty < 1) { removeFromCart(id); return; }
  entry.qty = qty;
  renderCartTray();
  renderOrderItems();
}

function showAddedFeedback(id) {
  const btn = document.querySelector(`[data-add-id="${id}"]`);
  if (!btn) return;
  btn.textContent = "✓ Added";
  btn.classList.add("added");
  setTimeout(() => { btn.textContent = "Add to Order"; btn.classList.remove("added"); }, 1400);
}

function renderProducts(filter) {
  activeFilter = filter;
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const visible = filter === "all" ? PRODUCTS : PRODUCTS.filter(p => p.cat === filter);

  grid.innerHTML = visible.map(p => {
    const color = CAT_COLORS[p.cat] || "#d81f26";
    const badgeHtml = p.badge ? `<span class="product-badge">${p.badge}</span>` : "";
    return `
    <article class="product-card" data-cat="${p.cat}">
      <div class="product-thumb" style="--cat-color:${color}">
        <span class="product-icon">${p.icon}</span>
        ${badgeHtml}
        <span class="product-cat-tag">${CAT_LABELS[p.cat]}</span>
      </div>
      <div class="product-body">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-desc">${p.desc}</p>
        <div class="product-footer">
          <span class="product-price">${fmt(p.price)}</span>
          <button class="add-btn" data-add-id="${p.id}" onclick="addToCart('${p.id}')">Add to Order</button>
        </div>
      </div>
    </article>`;
  }).join("");

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
}

function renderCartTray() {
  const tray = document.getElementById("cart-tray");
  if (!tray) return;
  const count = cartCount();
  tray.classList.toggle("visible", count > 0);
  const countEl = tray.querySelector(".tray-count");
  const totalEl = tray.querySelector(".tray-total");
  if (countEl) countEl.textContent = count + " item" + (count !== 1 ? "s" : "");
  if (totalEl) totalEl.textContent = fmt(cartTotal());
}

function renderOrderItems() {
  const list = document.getElementById("order-items-list");
  const totalEl = document.getElementById("order-total");
  if (!list) return;
  if (cart.length === 0) {
    list.innerHTML = `<p class="order-empty">Your order is empty. <button class="link-btn" onclick="closeOrderModal()">Keep shopping</button></p>`;
    if (totalEl) totalEl.textContent = "";
    return;
  }
  list.innerHTML = cart.map(({ product: p, qty }) => `
    <div class="order-item">
      <span class="oi-icon">${p.icon}</span>
      <div class="oi-info">
        <span class="oi-name">${p.name}</span>
        <span class="oi-price">${fmt(p.price)} each</span>
      </div>
      <div class="oi-qty">
        <button class="qty-btn" onclick="setQty('${p.id}', ${qty - 1})">−</button>
        <span>${qty}</span>
        <button class="qty-btn" onclick="setQty('${p.id}', ${qty + 1})">+</button>
      </div>
      <span class="oi-sub">${fmt(p.price * qty)}</span>
      <button class="oi-remove" onclick="removeFromCart('${p.id}')" aria-label="Remove">✕</button>
    </div>
  `).join("");
  if (totalEl) totalEl.innerHTML = `<strong>Total: ${fmt(cartTotal())}</strong> &mdash; <em>Pay at pickup or we'll contact you to arrange payment.</em>`;

  // Sync hidden order summary field
  const summary = document.getElementById("order-summary-field");
  if (summary) {
    summary.value = cart.map(({ product: p, qty }) =>
      `${p.name} x${qty} @ ${fmt(p.price)} = ${fmt(p.price * qty)}`
    ).join("\n") + `\n\nTotal: ${fmt(cartTotal())}`;
  }
}

function openOrderModal() {
  const modal = document.getElementById("order-modal");
  if (!modal) return;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  renderOrderItems();
}

function closeOrderModal() {
  const modal = document.getElementById("order-modal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.style.overflow = "";
}

function handleOrderSubmit(e) {
  e.preventDefault();
  if (cart.length === 0) return;
  const form = e.target;
  const statusEl = document.getElementById("order-status");

  // Sync summary one more time before submit
  const summary = document.getElementById("order-summary-field");
  if (summary) {
    summary.value = cart.map(({ product: p, qty }) =>
      `${p.name} x${qty} @ ${fmt(p.price)} = ${fmt(p.price * qty)}`
    ).join("\n") + `\n\nTotal: ${fmt(cartTotal())}`;
  }

  if (statusEl) statusEl.textContent = "Sending your order...";
  const data = new FormData(form);

  fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } })
    .then(r => {
      if (r.ok) {
        if (statusEl) statusEl.textContent = "✓ Order received! We'll contact you within 24 hours to confirm and arrange pickup.";
        form.reset();
        cart = [];
        renderCartTray();
        setTimeout(() => { closeOrderModal(); if (statusEl) statusEl.textContent = ""; }, 4000);
      } else {
        throw new Error("failed");
      }
    })
    .catch(() => {
      if (statusEl) statusEl.textContent = "Something went wrong. Please text us at (919) 533-9313 to place your order.";
    });
}

document.addEventListener("DOMContentLoaded", () => {
  renderProducts("all");
  renderCartTray();

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => renderProducts(btn.dataset.filter));
  });

  const orderForm = document.getElementById("order-form");
  if (orderForm) orderForm.addEventListener("submit", handleOrderSubmit);

  document.getElementById("order-modal")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) closeOrderModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeOrderModal();
  });

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile nav toggle
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("open", !open);
    });
  }
});
