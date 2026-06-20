# ASHDRIP — Google Sheets Catalogue Setup

This is the one-time setup so the owner can manage stock without touching code.

## 1. Create the Sheet

Make a new Google Sheet (or a tab in an existing one) with these exact column
headers in row 1 — spelling and capitalization matter:

| id | name | price | category | image | description | stock_S | stock_M | stock_L | stock_XL |
|----|------|-------|----------|-------|--------------|---------|---------|---------|----------|

**Column notes:**
- `id` — can be left blank. The site auto-generates one from the product name.
- `price` — plain number, e.g. `45000` (commas or ₦ symbols are fine too, the site strips them).
- `image` — paste a normal image URL, **or** a Google Drive share link (see step 3).
- `stock_S` / `stock_M` / `stock_L` / `stock_XL` — one column per size:
  - **Leave the cell blank** if that size isn't offered at all for this product.
  - **Put `0`** if the size is offered but currently sold out.
  - Put the actual count (e.g. `7`) if in stock.

Add one row per product, exactly like the two AD Tracksuits already on the site.

## 2. Publish the Sheet as CSV

In Google Sheets:

1. `File → Share → Publish to web`
2. Under "Link", choose the specific sheet/tab with your catalogue (not "Entire Document")
3. Under the format dropdown, choose **Comma-separated values (.csv)**
4. Click **Publish**
5. Copy the link it gives you

## 3. Drop the link into `products.js`

Open `products.js` and replace this line near the top:

```js
const SHEET_CSV_URL = "PASTE_YOUR_PUBLISHED_CSV_LINK_HERE";
```

with the link you copied. Save, reload the site — the catalogue now pulls
live from the Sheet.

## 4. Adding product images via Google Drive (for the owner)

Since the owner won't want to learn hosting, the easiest path is:

1. Upload the photo to Google Drive
2. Right-click the file → **Share** → set to "Anyone with the link" → Viewer
3. Copy the link (it'll look like `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`)
4. Paste that link directly into the `image` column

The site automatically converts that Drive link into a direct image URL —
no extra steps needed on the owner's end.

## 5. Safety net

If the Sheet is ever unpublished, the link breaks, or there's no internet
when the page loads, the site automatically falls back to the two real
products already coded into `products.js` (`FALLBACK_PRODUCTS`). The store
never shows a blank page — worst case, it just shows the old catalogue
until the Sheet issue is fixed.

## 6. Updating stock day-to-day

Once this is set up, the owner just edits numbers in the Sheet directly.
No publishing step needed again — a published Sheet stays live and
auto-updates the published CSV whenever the underlying Sheet changes.
Changes show up on the site within a few minutes (Google's CDN caches the
published CSV briefly).
