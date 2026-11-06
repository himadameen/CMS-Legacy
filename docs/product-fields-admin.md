# Product fields — Strapi Admin UI

After restarting Strapi, open **Content Manager → Product**. New fields appear from the schema (or add them in **Content-Type Builder** if you only use the UI).

## Fields to fill on each product

| Field | Type | Purpose |
|--------|------|--------|
| **quantityAvailable** | Number | Stock / units available (shown in API as `quantityAvailable`) |
| **isActive** | Boolean | Default **true**. Set **false** to hide from storefront APIs and from **active** counts |
| **productTags** | Multi-select | FE badges (see labels below) |

### Product tags (API → frontend label)

| Select in admin | API `tags[]` value |
|-----------------|-------------------|
| hot_sale | Hot Sale |
| sold | Sold |
| recommended | Recommended |
| fast_moving | Fast moving |
| most_likable | Most likable |
| most_sale | Most sale |
| trending | Trending |

You can pick **more than one** tag per product.

## Still required for APIs

- **Published** (not draft only)
- **sub_category** linked correctly
- **sku**, **name**, **primaryImage**, **imageAlt**

## Stats API

**Active product** = published + `isActive` is not false + belongs to brand via category chain.

**Categories** = published **Main categories** and **Sub categories** for that brand.
