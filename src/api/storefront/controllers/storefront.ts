import type { Core } from '@strapi/strapi';

import { parsePagination } from '../../../utils/storefront';

function setCache(ctx: { set: (k: string, v: string) => void }, seconds: number) {
  ctx.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=60`);
}

function readBrand(ctx: { params?: { brandSlug?: string }; request?: { body?: Record<string, unknown> } }) {
  return (
    (ctx.params?.brandSlug as string | undefined)?.trim() ||
    (ctx.request?.body?.brand as string | undefined)?.trim() ||
    ''
  );
}

function readCategory(ctx: {
  query?: Record<string, unknown>;
  request?: { body?: Record<string, unknown> };
}) {
  return (
    (ctx.query?.category as string | undefined) ||
    (ctx.query?.mainCategory as string | undefined) ||
    (ctx.request?.body?.category as string | undefined) ||
    (ctx.request?.body?.mainCategory as string | undefined)
  )?.trim();
}

function readSubCategory(ctx: {
  query?: Record<string, unknown>;
  request?: { body?: Record<string, unknown> };
}) {
  return (
    (ctx.query?.subCategory as string | undefined) ||
    (ctx.request?.body?.subCategory as string | undefined)
  )?.trim();
}

function readProductKey(ctx: {
  params?: { productKey?: string };
  query?: Record<string, unknown>;
  request?: { body?: Record<string, unknown> };
}) {
  return (
    ctx.params?.productKey?.trim() ||
    (ctx.query?.product as string | undefined)?.trim() ||
    (ctx.request?.body?.product as string | undefined)?.trim() ||
    (ctx.request?.body?.sku as string | undefined)?.trim() ||
    ''
  );
}

function readPagination(ctx: {
  query?: Record<string, unknown>;
  request?: { body?: Record<string, unknown> };
}) {
  return parsePagination({
    page: ctx.query?.page ?? ctx.request?.body?.page,
    pageSize: ctx.query?.pageSize ?? ctx.request?.body?.pageSize,
  });
}

function usePagination(ctx: {
  query?: Record<string, unknown>;
  request?: { body?: Record<string, unknown> };
}) {
  const body = ctx.request?.body;
  if (body?.page != null || body?.pageSize != null) {
    return true;
  }
  if (ctx.query?.page != null || ctx.query?.pageSize != null) {
    return true;
  }
  return body?.paginate === true || ctx.query?.paginate === 'true';
}

function wantsStatsOnly(ctx: {
  query?: Record<string, unknown>;
  request?: { body?: Record<string, unknown> };
}) {
  return (
    ctx.query?.stats === 'true' ||
    ctx.query?.statsOnly === 'true' ||
    ctx.request?.body?.statsOnly === true
  );
}

export default {
  async home(ctx: {
    params?: { brandSlug?: string };
    query?: Record<string, unknown>;
    request?: { body?: Record<string, unknown> };
    notFound: (msg?: string) => unknown;
    badRequest: (msg?: string) => unknown;
    body: unknown;
    set: (k: string, v: string) => void;
  }) {
    if (wantsStatsOnly(ctx)) {
      return this.stats(ctx);
    }

    const { strapi } = global as unknown as { strapi: Core.Strapi };
    const brand = readBrand(ctx);
    if (!brand) {
      return ctx.badRequest('Provide "brand" (slug or name).');
    }

    const { page, pageSize } = readPagination(ctx);
    const data = await strapi.service('api::storefront.storefront').getHomeData(brand, page, pageSize);

    if (!data) {
      return ctx.notFound('Brand not found or not published.');
    }

    setCache(ctx, 60);
    ctx.body = data;
  },

  async catalog(ctx: {
    params?: { brandSlug?: string };
    query?: Record<string, unknown>;
    request?: { body?: Record<string, unknown> };
    notFound: (msg?: string) => unknown;
    badRequest: (msg?: string) => unknown;
    body: unknown;
    set: (k: string, v: string) => void;
  }) {
    const { strapi } = global as unknown as { strapi: Core.Strapi };
    const brand = readBrand(ctx);
    const category = readCategory(ctx);

    if (!brand) {
      return ctx.badRequest('Provide "brand" (slug or name).');
    }
    if (!category) {
      return ctx.badRequest('Provide "category" (main category slug).');
    }

    const paginate = usePagination(ctx);
    const { page, pageSize } = readPagination(ctx);
    const subCategory = readSubCategory(ctx);

    if (paginate) {
      const data = await strapi
        .service('api::storefront.storefront')
        .getCatalogPaginated(brand, category, subCategory, page, pageSize);

      if (!data) {
        return ctx.notFound('Brand or category not found.');
      }

      setCache(ctx, 120);
      ctx.body = data;
      return;
    }

    const data = await strapi.service('api::storefront.storefront').getCatalogNested(brand, category);

    if (data === null) {
      return ctx.notFound('Brand not found or not published.');
    }

    setCache(ctx, 120);
    ctx.body = data;
  },

  async product(ctx: {
    params?: { brandSlug?: string; productKey?: string };
    query?: Record<string, unknown>;
    request?: { body?: Record<string, unknown> };
    notFound: (msg?: string) => unknown;
    badRequest: (msg?: string) => unknown;
    body: unknown;
    set: (k: string, v: string) => void;
  }) {
    const { strapi } = global as unknown as { strapi: Core.Strapi };
    const brand = readBrand(ctx);
    const productKey = readProductKey(ctx);

    if (!brand) {
      return ctx.badRequest('Provide "brand" (slug or name).');
    }
    if (!productKey) {
      return ctx.badRequest('Provide "product" (slug), "sku", or use GET /api/product/:brand/:productKey.');
    }

    const data = await strapi
      .service('api::storefront.storefront')
      .getProductDetail(brand, productKey);

    if (!data) {
      return ctx.notFound('Product not found for this brand.');
    }

    setCache(ctx, 300);
    ctx.body = data;
  },

  async stats(ctx: {
    params?: { brandSlug?: string };
    request?: { body?: Record<string, unknown> };
    notFound: (msg?: string) => unknown;
    badRequest: (msg?: string) => unknown;
    body: unknown;
    set: (k: string, v: string) => void;
  }) {
    const { strapi } = global as unknown as { strapi: Core.Strapi };
    const brand = readBrand(ctx);
    if (!brand) {
      return ctx.badRequest('Provide "brand" (slug or name).');
    }

    const data = await strapi.service('api::storefront.storefront').getBrandStats(brand);
    if (!data) {
      return ctx.notFound('Brand not found or not published.');
    }

    setCache(ctx, 120);
    ctx.body = data;
  },
};
