/*
  ASHDRIP STORE LOGIC
  ───────────────────
  Handles: rendering products from PRODUCTS array (products.js),
  cart state, size-selection modal, and WhatsApp checkout handoff.

  WHATSAPP NUMBER: placeholder below. Replace with real number
  (international format, no + or leading 0) when ready.
  Example: Nigerian number 0803 123 4567 -> "2348031234567"
*/

const WHATSAPP_NUMBER = "2347070221241"; // <-- replace with real number

let cart = []; // { id, name, price, size, qty, image }
let activeProduct = null;
let activeSize = null;

const money = (n) => "₦" + n.toLocaleString("en-NG");

/* ---------- RENDER PRODUCTS ---------- */
function showCatalogueLoading() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = `<p class="catalogue-loading">Loading the drop…</p>`;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  if (!PRODUCTS.length) {
    grid.innerHTML = `<p class="catalogue-loading">Nothing in stock right now — check back soon.</p>`;
    return;
  }

  PRODUCTS.forEach((p) => {
    const totalStock = Object.values(p.stock).reduce((a, b) => a + b, 0);
    const isLow = totalStock > 0 && totalStock <= 5;
    const isSoldOut = totalStock === 0;

    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-card-img-wrap">
        <div class="drip">
          <svg viewBox="0 0 400 22" preserveAspectRatio="none"><path d="M0,0 L400,0 L400,8 Q380,22 360,8 Q340,22 320,8 Q300,22 280,8 Q260,22 240,8 Q220,22 200,8 Q180,22 160,8 Q140,22 120,8 Q100,22 80,8 Q60,22 40,8 Q20,22 0,8 Z" fill="var(--red)"/></svg>
        </div>
        <img src="${p.image}" alt="${p.name}" loading="lazy">
      </div>
      <div class="product-card-body">
        <span class="product-card-cat">${p.category}</span>
        <h3 class="product-card-name">${p.name}</h3>
        <p class="product-card-price">${money(p.price)}</p>
        <p class="product-card-stock ${isLow ? "low" : ""}">
          ${isSoldOut ? "Sold out" : isLow ? `Only ${totalStock} left` : "In stock"}
        </p>
        <button class="btn-add" data-id="${p.id}" ${isSoldOut ? "disabled" : ""}>
          ${isSoldOut ? "Sold Out" : "Select Size"}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });

  document.querySelectorAll(".btn-add").forEach((btn) => {
    btn.addEventListener("click", () => openSizeModal(btn.dataset.id));
  });
}

/* ---------- SIZE MODAL ---------- */
function openSizeModal(productId) {
  activeProduct = PRODUCTS.find((p) => p.id === productId);
  activeSize = null;

  const modal = document.getElementById("productModal");
  modal.innerHTML = `
    <h3>${activeProduct.name}</h3>
    <p class="modal-price">${money(activeProduct.price)}</p>
    <span class="modal-label">Select Size</span>
    <div class="size-options">
      ${activeProduct.sizes
        .map((s) => {
          const available = activeProduct.stock[s] > 0;
          return `<button class="size-option" data-size="${s}" ${!available ? "disabled" : ""}>${s}</button>`;
        })
        .join("")}
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" id="modalCancel">Cancel</button>
      <button class="btn-checkout" id="modalAdd" disabled>Add to Bag</button>
    </div>
  `;

  modal.querySelectorAll(".size-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      if (opt.disabled) return;
      modal.querySelectorAll(".size-option").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      activeSize = opt.dataset.size;
      document.getElementById("modalAdd").disabled = false;
    });
  });

  document.getElementById("modalCancel").addEventListener("click", closeSizeModal);
  document.getElementById("modalAdd").addEventListener("click", () => {
    addToCart(activeProduct, activeSize);
    closeSizeModal();
    openCart();
  });

  document.getElementById("modalOverlay").classList.add("active");
}

function closeSizeModal() {
  document.getElementById("modalOverlay").classList.remove("active");
}

/* ---------- CART ---------- */
function addToCart(product, size) {
  const existing = cart.find((item) => item.id === product.id && item.size === size);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      size,
      qty: 1,
      image: product.image,
    });
  }
  renderCart();
}

function changeQty(id, size, delta) {
  const item = cart.find((i) => i.id === id && i.size === size);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => !(i.id === id && i.size === size));
  }
  renderCart();
}

function removeFromCart(id, size) {
  cart = cart.filter((i) => !(i.id === id && i.size === size));
  renderCart();
}

function renderCart() {
  const itemsEl = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");
  const countEl = document.getElementById("cartCount");
  const checkoutBtn = document.getElementById("checkoutBtn");

  const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
  countEl.textContent = totalQty;

  if (cart.length === 0) {
    itemsEl.innerHTML = `<p class="cart-empty">Your bag is empty. Time to fix that.</p>`;
    totalEl.textContent = money(0);
    checkoutBtn.disabled = true;
    return;
  }

  checkoutBtn.disabled = false;
  itemsEl.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-meta">Size ${item.size} · ${money(item.price)}</span>
        <div class="cart-item-row">
          <div class="cart-item-qty">
            <button data-action="dec" data-id="${item.id}" data-size="${item.size}" aria-label="Decrease quantity">−</button>
            <span>${item.qty}</span>
            <button data-action="inc" data-id="${item.id}" data-size="${item.size}" aria-label="Increase quantity">+</button>
          </div>
          <button class="cart-item-remove" data-action="remove" data-id="${item.id}" data-size="${item.size}">Remove</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  totalEl.textContent = money(total);

  itemsEl.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { action, id, size } = btn.dataset;
      if (action === "inc") changeQty(id, size, 1);
      if (action === "dec") changeQty(id, size, -1);
      if (action === "remove") removeFromCart(id, size);
    });
  });
}

/* ---------- CART DRAWER OPEN/CLOSE ---------- */
function openCart() {
  document.getElementById("cartDrawer").classList.add("active");
  document.getElementById("cartOverlay").classList.add("active");
}
function closeCart() {
  document.getElementById("cartDrawer").classList.remove("active");
  document.getElementById("cartOverlay").classList.remove("active");
}

/* ---------- WHATSAPP CHECKOUT ---------- */
function checkoutViaWhatsApp() {
  if (cart.length === 0) return;

  let message = "Hey ASHDRIP! I'd like to order:\n\n";
  cart.forEach((item) => {
    message += `• ${item.name} (Size ${item.size}) x${item.qty} — ${money(item.price * item.qty)}\n`;
  });
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  message += `\nTotal: ${money(total)}\n\nMy name & delivery address:\n`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  showCatalogueLoading();
  await loadProducts();
  renderProducts();
  renderCart();

  document.getElementById("cartToggle").addEventListener("click", openCart);
  document.getElementById("cartClose").addEventListener("click", closeCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") closeSizeModal();
  });
  document.getElementById("checkoutBtn").addEventListener("click", checkoutViaWhatsApp);
  document.getElementById("waContact").addEventListener("click", (e) => {
    e.preventDefault();
    window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
  });

  // ---- HERO CAROUSEL ----
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot');
  let current = 0;
  let carouselTimer;

  function goToSlide(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = index;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function nextSlide() {
    goToSlide((current + 1) % slides.length);
  }

  function startCarousel() {
    carouselTimer = setInterval(nextSlide, 5000);
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      clearInterval(carouselTimer);
      goToSlide(parseInt(dot.dataset.index));
      startCarousel();
    });
  });

  startCarousel();

  /* ---------- MOBILE NAV ---------- */
  const navToggle = document.getElementById("navToggle");
  const navLinksMobile = document.getElementById("navLinksMobile");

  function closeMobileNav() {
    navLinksMobile.classList.remove("active");
    navToggle.classList.remove("active");
    navToggle.setAttribute("aria-expanded", "false");
  }

  navToggle.addEventListener("click", () => {
    const isOpen = navLinksMobile.classList.toggle("active");
    navToggle.classList.toggle("active", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinksMobile.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileNav);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCart();
      closeSizeModal();
      closeMobileNav();
    }
  });
});
