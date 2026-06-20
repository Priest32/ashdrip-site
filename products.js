/*
  PRODUCTS DATA — LIVE FROM SUPABASE
  ───────────────────────────────────
  Loads the live catalogue from the "products" Supabase table and
  reshapes each row into the format the rest of the site expects:
  image / sizes (array) / stock (object), instead of Supabase's
  image_url / stock_s / stock_m / stock_l / stock_xl columns.

  KNOWN LIMITATION: every product always shows all 4 sizes (S/M/L/XL)
  as buttons — a size with 0 stock shows as disabled/"sold out" rather
  than not appearing at all. Fine as long as every product genuinely
  comes in all 4 sizes; flag if that's ever not true.

  If the Supabase fetch fails for any reason (offline, RLS blocking
  the read, table renamed, etc.), the site falls back to
  FALLBACK_PRODUCTS below so the store never shows a blank page.
*/

let PRODUCTS = [];

const FALLBACK_PRODUCTS = [
  {
    id: "ad-tracksuit-olive",
    name: "AD Tracksuit — Olive Trail",
    price: 45000,
    category: "Tracksuits",
    image: "images/ad-tracksuit-olive.png",
    sizes: ["S", "M", "L", "XL"],
    stock: { S: 4, M: 7, L: 5, XL: 2 },
    description: "Black tracksuit with olive panel detailing and the signature AD mark. Built for those who move different."
  },
  {
    id: "ad-tracksuit-navy",
    name: "AD Tracksuit — Navy Storm",
    price: 45000,
    category: "Tracksuits",
    image: "images/ad-tracksuit-navy.png",
    sizes: ["S", "M", "L", "XL"],
    stock: { S: 0, M: 3, L: 6, XL: 4 },
    description: "Black tracksuit with navy panel detailing and the signature AD mark. Made for those who leave a mark."
  }
];
async function loadProducts() {
  try {
    const { data, error } = await window.supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    PRODUCTS = data.map((row) => ({
      id: String(row.id), // force string — Supabase returns a number, but data-id attributes/dataset always read back as strings, and downstream comparisons use ===
      name: row.name,
      price: row.price,
      category: row.category || "Tracksuits",
      image: row.image_url || "",
      description: row.description || "",
      sizes: ["S", "M", "L", "XL"],
      stock: {
        S: row.stock_s || 0,
        M: row.stock_m || 0,
        L: row.stock_l || 0,
        XL: row.stock_xl || 0
      }
    }));

    if (!PRODUCTS.length) {
      PRODUCTS = FALLBACK_PRODUCTS;
    }
  } catch (err) {
    console.error("Supabase load failed:", err);
    PRODUCTS = FALLBACK_PRODUCTS;
  }

  return PRODUCTS;
}