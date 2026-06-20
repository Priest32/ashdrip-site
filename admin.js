/*
  ASHDRIP ADMIN LOGIC
  ───────────────────
  - compressImage()       resizes/compresses a photo client-side before
                           upload (max 1600px edge, ~82% JPEG quality)
                           so large phone photos don't take forever
  - uploadImage()          compresses then uploads to the "products" bucket
  - loadProducts()         fetches all rows, renders the list below the form
  - renderProductList()    draws the table with thumbnail / stock / edit / delete
  - searchProducts()       filters the list as you type
  - editProduct(id)        loads a row's values back into the form for editing
  - cancelEdit()           exits edit mode, clears the form
  - saveProduct()          inserts OR updates depending on whether we're
                           editing, shows live status text ("Compressing
                           image…" → "Uploading…" → "Saving…") and disables
                           the button while in flight
  - deleteProduct(id)      deletes the DB row AND the storage file
  - previewSelectedImage() shows a thumbnail before upload

  The form behaves as BOTH the "add" and "edit" form — clicking Edit on a
  row fills it in and flips the button to "Update Product"; clicking
  Cancel (or successfully saving) resets it back to "Add Product" mode.
*/

let allProducts = [];
let editingId = null; // null = adding a new product, otherwise we're editing this id

/* ---------- COMPRESS IMAGE BEFORE UPLOAD ---------- */
function compressImage(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // fill white first — avoids transparent PNGs turning black when
      // converted to JPEG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Image compression failed"));
            return;
          }
          const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
          resolve(new File([blob], newName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image file"));
    };

    img.src = objectUrl;
  });
}

/* ---------- IMAGE UPLOAD ---------- */
async function uploadImage(file, onStatus) {
  if (onStatus) onStatus("Compressing image…");
  const compressed = await compressImage(file);

  if (onStatus) onStatus("Uploading image…");
  const fileName = `${Date.now()}-${compressed.name}`;

  const { error } = await window.supabaseClient
    .storage
    .from("products")
    .upload(fileName, compressed);

  if (error) {
    throw error;
  }

  const { data } = window.supabaseClient
    .storage
    .from("products")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

/* ---------- DELETE A FILE FROM STORAGE GIVEN ITS PUBLIC URL ---------- */
function extractStoragePath(imageUrl) {
  if (!imageUrl) return null;
  const marker = "/object/public/products/";
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return imageUrl.slice(idx + marker.length);
}

async function deleteImageFromStorage(imageUrl) {
  const path = extractStoragePath(imageUrl);
  if (!path) return;
  await window.supabaseClient.storage.from("products").remove([path]);
}

/* ---------- LOAD + RENDER PRODUCT LIST ---------- */
async function loadProducts() {
  const listEl = document.getElementById("productList");
  listEl.innerHTML = `<p class="admin-loading">Loading products…</p>`;

  const { data, error } = await window.supabaseClient
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    listEl.innerHTML = `<p class="admin-error">Couldn't load products: ${error.message}</p>`;
    return;
  }

  allProducts = data || [];
  renderProductList(allProducts);
}

function renderProductList(products) {
  const listEl = document.getElementById("productList");

  if (!products.length) {
    listEl.innerHTML = `<p class="admin-empty">No products found.</p>`;
    return;
  }

  listEl.innerHTML = products
    .map((p) => {
      const totalStock =
        (Number(p.stock_s) || 0) +
        (Number(p.stock_m) || 0) +
        (Number(p.stock_l) || 0) +
        (Number(p.stock_xl) || 0);

      const stockLabel = totalStock === 0
        ? `<span class="stock-badge sold-out">Sold out</span>`
        : `<span class="stock-badge">${totalStock} in stock</span>`;

      return `
        <div class="admin-row" data-id="${p.id}">
          <img class="admin-thumb" src="${p.image_url || ""}" alt="${p.name}" onerror="this.style.opacity=0.2">
          <div class="admin-row-info">
            <p class="admin-row-name">${p.name}</p>
            <p class="admin-row-meta">₦${Number(p.price || 0).toLocaleString("en-NG")} · ${p.category || "—"}</p>
            <p class="admin-row-sizes">S:${p.stock_s ?? 0} &nbsp; M:${p.stock_m ?? 0} &nbsp; L:${p.stock_l ?? 0} &nbsp; XL:${p.stock_xl ?? 0}</p>
            ${stockLabel}
          </div>
          <div class="admin-row-actions">
            <button class="btn-edit" data-action="edit" data-id="${p.id}">Edit</button>
            <button class="btn-delete" data-action="delete" data-id="${p.id}">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  listEl.querySelectorAll("[data-action='edit']").forEach((btn) => {
    btn.addEventListener("click", () => editProduct(btn.dataset.id));
  });
  listEl.querySelectorAll("[data-action='delete']").forEach((btn) => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.id));
  });
}

/* ---------- SEARCH ---------- */
function searchProducts() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!query) {
    renderProductList(allProducts);
    return;
  }
  const filtered = allProducts.filter((p) =>
    (p.name || "").toLowerCase().includes(query) ||
    (p.category || "").toLowerCase().includes(query)
  );
  renderProductList(filtered);
}

/* ---------- IMAGE PREVIEW ON FILE SELECT ---------- */
function previewSelectedImage() {
  const file = document.getElementById("imageFile").files[0];
  const preview = document.getElementById("imagePreview");
  if (!file) {
    preview.style.display = "none";
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
}

/* ---------- ENTER EDIT MODE ---------- */
function editProduct(id) {
  const product = allProducts.find((p) => String(p.id) === String(id));
  if (!product) return;

  editingId = product.id;

  document.getElementById("name").value = product.name || "";
  document.getElementById("price").value = product.price || "";
  document.getElementById("category").value = product.category || "";
  document.getElementById("description").value = product.description || "";
  document.getElementById("stock_s").value = product.stock_s ?? "";
  document.getElementById("stock_m").value = product.stock_m ?? "";
  document.getElementById("stock_l").value = product.stock_l ?? "";
  document.getElementById("stock_xl").value = product.stock_xl ?? "";

  document.getElementById("imageFile").value = "";
  const preview = document.getElementById("imagePreview");
  if (product.image_url) {
    preview.src = product.image_url;
    preview.style.display = "block";
  } else {
    preview.style.display = "none";
  }

  document.getElementById("submitBtn").textContent = "Update Product";
  document.getElementById("cancelBtn").style.display = "inline-block";
  document.getElementById("formTitle").textContent = `Editing: ${product.name}`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- EXIT EDIT MODE ---------- */
function cancelEdit() {
  editingId = null;
  document.getElementById("name").value = "";
  document.getElementById("price").value = "";
  document.getElementById("category").value = "";
  document.getElementById("description").value = "";
  document.getElementById("stock_s").value = "";
  document.getElementById("stock_m").value = "";
  document.getElementById("stock_l").value = "";
  document.getElementById("stock_xl").value = "";
  document.getElementById("imageFile").value = "";
  document.getElementById("imagePreview").style.display = "none";

  document.getElementById("submitBtn").textContent = "Add Product";
  document.getElementById("cancelBtn").style.display = "none";
  document.getElementById("formTitle").textContent = "Add New Product";
  setSaveStatus("");
}

/* ---------- SAVE (ADD or UPDATE depending on editingId) ---------- */
function setSaveStatus(text) {
  const statusEl = document.getElementById("saveStatus");
  if (statusEl) statusEl.textContent = text || "";
}

async function saveProduct() {
  const imageFile = document.getElementById("imageFile").files[0];
  const submitBtn = document.getElementById("submitBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const originalLabel = submitBtn.textContent;

  const product = {
    name: document.getElementById("name").value,
    price: Number(document.getElementById("price").value),
    category: document.getElementById("category").value,
    description: document.getElementById("description").value,
    stock_s: Number(document.getElementById("stock_s").value) || 0,
    stock_m: Number(document.getElementById("stock_m").value) || 0,
    stock_l: Number(document.getElementById("stock_l").value) || 0,
    stock_xl: Number(document.getElementById("stock_xl").value) || 0
  };

  submitBtn.disabled = true;
  cancelBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    if (imageFile) {
      product.image_url = await uploadImage(imageFile, setSaveStatus);
    }

    setSaveStatus(editingId ? "Saving changes…" : "Adding product…");

    if (editingId) {
      const { error } = await window.supabaseClient
        .from("products")
        .update(product)
        .eq("id", editingId);

      if (error) throw error;
      setSaveStatus("Product updated ✓");
    } else {
      if (!product.image_url) product.image_url = "";
      const { error } = await window.supabaseClient
        .from("products")
        .insert([product]);

      if (error) throw error;
      setSaveStatus("Product added ✓");
    }

    cancelEdit();
    await loadProducts();
  } catch (err) {
    setSaveStatus("");
    submitBtn.textContent = originalLabel;
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    cancelBtn.disabled = false;
    setTimeout(() => setSaveStatus(""), 2500);
  }
}

/* ---------- DELETE ---------- */
async function deleteProduct(id) {
  const product = allProducts.find((p) => String(p.id) === String(id));
  if (!product) return;

  const confirmed = confirm(`Delete "${product.name}"? This can't be undone.`);
  if (!confirmed) return;

  const { error } = await window.supabaseClient
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  if (product.image_url) {
    await deleteImageFromStorage(product.image_url);
  }

  if (editingId === id) cancelEdit();
  loadProducts();
}

/* ---------- AUTH ---------- */
async function requireLogin() {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

async function logout() {
  await window.supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireLogin();
  if (!session) return; // redirecting to login

  const userEmailEl = document.getElementById("userEmail");
  if (userEmailEl) userEmailEl.textContent = session.user.email;

  window.supabaseClient.auth.onAuthStateChange((event, newSession) => {
    if (!newSession) window.location.href = "login.html";
  });

  loadProducts();
  document.getElementById("imageFile").addEventListener("change", previewSelectedImage);
  document.getElementById("searchInput").addEventListener("input", searchProducts);
});
