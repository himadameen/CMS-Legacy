# Storefront API (Next.js)

Public routes (no auth). Set `PUBLIC_URL` in `.env` for absolute image URLs.

## Home — brand + paginated products

Featured products first (`featuredOnHome`, then `homeSort`), then by publish date.

**POST** `/api/home`

```json
{ "brand": "oviron", "page": 1, "pageSize": 8 }
```

**GET** `/api/home/oviron?page=1&pageSize=8`

**Response**

```json
{
  "brand": { "name", "slug", "tagline", "aboutBrand", ... },
  "categories": [{ "id": "shoes", "label", "subtitle", "sortOrder" }],
  "products": [{ "id", "sku", "name", "description", "imageUrl", "imageUrls", "imageAlt", "specs", "subCategoryId", "subCategoryLabel" }],
  "pagination": { "page", "pageSize", "total", "pageCount" }
}
```

## Catalog — brand + main category

### Full nested tree (no pagination)

**POST** `/api/catalog`

```json
{ "brand": "oviron", "category": "shoes" }
```

**GET** `/api/catalog/oviron?category=shoes`

**Response:** `{ "categories": [ { "id", "label", "subtitle", "sortOrder", "subcategories": [ { "id", "label", "description", "sortOrder", "products": [...] } ] } ] }`

### Paginated product grid (faster)

Add `page` and `pageSize` (or `paginate=true` with page params).

**POST** `/api/catalog`

```json
{ "brand": "oviron", "category": "shoes", "page": 1, "pageSize": 12, "subCategory": "formal" }
```

`subCategory` is optional (filter to one sub-category slug).

**GET** `/api/catalog/oviron?category=shoes&page=1&pageSize=12`

**Response**

```json
{
  "category": { "id", "label", "subtitle", "sortOrder" },
  "subcategories": [{ "id", "label", "description", "sortOrder" }],
  "products": [...],
  "pagination": { "page", "pageSize", "total", "pageCount" }
}
```

## Product detail

**POST** `/api/product`

```json
{ "brand": "oviron", "sku": "OV-SH-01" }
```

Or `"product": "oxford"` (slug). **`brand` is required** (slug or name) so the product is scoped to the right tenant.

**GET** `/api/product/oviron/oxford` or `/api/product/oviron/OV-SH-01`

**Response** (no `brand` object)

```json
{
  "category": { "id", "label" },
  "subCategory": { "id", "label" },
  "product": { "id", "sku", "name", "quantityAvailable", "tags", "isActive", ... }
}
```

## Stats — totals for a brand

**Restart Strapi** after pulling code so `/api/stats` routes register (`npm run develop`).

**POST** `/api/stats`

```json
{ "brand": "oviron" }
```

**GET** `/api/stats/oviron`

**Alternate (works if `/api/stats` returns 405 until restart):**

- **GET** `/api/home/oviron?stats=true`
- **POST** `/api/home` with `{ "brand": "oviron", "statsOnly": true }`

**Response**

```json
{
  "brand": { "slug": "oviron", "name": "Oviron ExIm Leathers" },
  "totals": {
    "activeProducts": 12,
    "mainCategories": 5,
    "subCategories": 18
  }
}
```

- **activeProducts** — published products with `isActive` ≠ false for this brand  
- **mainCategories** — published main categories for this brand  
- **subCategories** — published sub categories under those mains  

Product payloads also include **`quantityAvailable`**, **`tags`** (display labels), and **`isActive`**.

See **docs/product-fields-admin.md** for Strapi Admin setup.
