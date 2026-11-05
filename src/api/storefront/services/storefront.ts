import type { Core } from '@strapi/strapi';

import {
  buildPaginationMeta,
  activeProductFilters,
  findPublishedBrand,
  getSubCategoryIdsForBrand,
  mapBrandPublic,
  mapProduct,
  productBelongsToBrand,
  productPopulate,
  type CatalogProduct,
  type PaginationMeta,
  type ProductRow,
} from '../../../utils/storefront';

// Strapi populate typing is stricter than runtime accepts for nested components.
const productPopulateQuery = productPopulate as Record<string, unknown>;

type MainCategoryRow = {
  documentId: string;
  slug?: string;
  label?: string;
  subtitle?: string;
  sortOrder?: number | null;
};

type SubCategoryRow = {
  documentId: string;
  slug?: string;
  label?: string;
  description?: string;
  sortOrder?: number | null;
  main_category?: { documentId: string };
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async getHomeData(
    brandKey: string,
    page: number,
    pageSize: number
  ): Promise<{
    brand: ReturnType<typeof mapBrandPublic>;
    categories: Array<{ id: string; label: string; subtitle?: string; sortOrder?: number }>;
    products: CatalogProduct[];
    pagination: PaginationMeta;
  } | null> {
    const brand = await findPublishedBrand(strapi, brandKey);
    if (!brand) {
      return null;
    }

    const mainCategories = (await strapi.documents('api::main-category.main-category').findMany({
      filters: { brand: { documentId: { $eq: brand.documentId } } },
      status: 'published',
      sort: ['sortOrder:asc', 'label:asc'],
    })) as MainCategoryRow[];

    const categories = mainCategories.map((main) => ({
      id: main.slug || main.documentId,
      label: main.label ?? '',
      ...(main.subtitle ? { subtitle: main.subtitle } : {}),
      ...(main.sortOrder != null ? { sortOrder: main.sortOrder } : {}),
    }));

    const subIds = await getSubCategoryIdsForBrand(strapi, brand.documentId);
    if (subIds.length === 0) {
      return {
        brand: mapBrandPublic(brand),
        categories,
        products: [],
        pagination: buildPaginationMeta(page, pageSize, 0),
      };
    }

    const baseFilter = activeProductFilters(subIds);

    const total = await strapi.documents('api::product.product').count({
      filters: baseFilter,
      status: 'published',
    });

    const allForSort = (await strapi.documents('api::product.product').findMany({
      filters: baseFilter,
      status: 'published',
      populate: productPopulateQuery,
    })) as ProductRow[];

    allForSort.sort((a, b) => {
      const aFeatured = a.featuredOnHome ? 1 : 0;
      const bFeatured = b.featuredOnHome ? 1 : 0;
      if (bFeatured !== aFeatured) {
        return bFeatured - aFeatured;
      }
      const aHome = a.homeSort ?? 9999;
      const bHome = b.homeSort ?? 9999;
      if (aHome !== bHome) {
        return aHome - bHome;
      }
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bDate - aDate;
    });

    const start = (page - 1) * pageSize;
    const slice = allForSort.slice(start, start + pageSize);
    const products = slice
      .map((p) => mapProduct(strapi, p, { includeSubCategory: true }))
      .filter((p): p is CatalogProduct => p !== null);

    return {
      brand: mapBrandPublic(brand),
      categories,
      products,
      pagination: buildPaginationMeta(page, pageSize, total),
    };
  },

  async getCatalogNested(brandKey: string, mainCategorySlug: string) {
    const brand = await findPublishedBrand(strapi, brandKey);
    if (!brand) {
      return null;
    }

    const mains = (await strapi.documents('api::main-category.main-category').findMany({
      filters: {
        brand: { documentId: { $eq: brand.documentId } },
        slug: { $eq: mainCategorySlug },
      },
      status: 'published',
      limit: 1,
    })) as MainCategoryRow[];

    const main = mains[0];
    if (!main) {
      return { categories: [] };
    }

    const subs = (await strapi.documents('api::sub-category.sub-category').findMany({
      filters: { main_category: { documentId: { $eq: main.documentId } } },
      status: 'published',
      sort: ['sortOrder:asc', 'label:asc'],
    })) as SubCategoryRow[];

    const subIds = subs.map((s) => s.documentId);
    let productsBySub = new Map<string, ProductRow[]>();

    if (subIds.length > 0) {
      const products = (await strapi.documents('api::product.product').findMany({
        filters: activeProductFilters(subIds),
        status: 'published',
        populate: productPopulateQuery,
        sort: ['sortOrder:asc', 'name:asc'],
      })) as ProductRow[];

      productsBySub = new Map();
      for (const product of products) {
        const subId = product.sub_category?.documentId;
        if (!subId) continue;
        const list = productsBySub.get(subId) ?? [];
        list.push(product);
        productsBySub.set(subId, list);
      }
    }

    const subcategories = subs.map((sub) => ({
      id: sub.slug || sub.documentId,
      label: sub.label ?? '',
      ...(sub.description ? { description: sub.description } : {}),
      ...(sub.sortOrder != null ? { sortOrder: sub.sortOrder } : {}),
      products: (productsBySub.get(sub.documentId) ?? [])
        .map((p) => mapProduct(strapi, p))
        .filter((p): p is CatalogProduct => p !== null),
    }));

    return {
      categories: [
        {
          id: main.slug || main.documentId,
          label: main.label ?? '',
          ...(main.subtitle ? { subtitle: main.subtitle } : {}),
          ...(main.sortOrder != null ? { sortOrder: main.sortOrder } : {}),
          subcategories,
        },
      ],
    };
  },

  async getCatalogPaginated(
    brandKey: string,
    mainCategorySlug: string,
    subCategorySlug: string | undefined,
    page: number,
    pageSize: number
  ) {
    const brand = await findPublishedBrand(strapi, brandKey);
    if (!brand) {
      return null;
    }

    const mains = (await strapi.documents('api::main-category.main-category').findMany({
      filters: {
        brand: { documentId: { $eq: brand.documentId } },
        slug: { $eq: mainCategorySlug },
      },
      status: 'published',
      limit: 1,
    })) as MainCategoryRow[];

    const main = mains[0];
    if (!main) {
      return null;
    }

    const subFilters: Record<string, unknown> = {
      main_category: { documentId: { $eq: main.documentId } },
    };
    if (subCategorySlug) {
      subFilters.slug = { $eq: subCategorySlug };
    }

    const subs = (await strapi.documents('api::sub-category.sub-category').findMany({
      filters: subFilters,
      status: 'published',
      sort: ['sortOrder:asc', 'label:asc'],
    })) as SubCategoryRow[];

    const subIds = subs.map((s) => s.documentId);
    const subcategories = subs.map((sub) => ({
      id: sub.slug || sub.documentId,
      label: sub.label ?? '',
      ...(sub.description ? { description: sub.description } : {}),
      ...(sub.sortOrder != null ? { sortOrder: sub.sortOrder } : {}),
    }));

    if (subIds.length === 0) {
      return {
        category: {
          id: main.slug || main.documentId,
          label: main.label ?? '',
          ...(main.subtitle ? { subtitle: main.subtitle } : {}),
          ...(main.sortOrder != null ? { sortOrder: main.sortOrder } : {}),
        },
        subcategories,
        products: [] as CatalogProduct[],
        pagination: buildPaginationMeta(page, pageSize, 0),
      };
    }

    const productFilters = activeProductFilters(subIds);

    const total = await strapi.documents('api::product.product').count({
      filters: productFilters,
      status: 'published',
    });

    const products = (await strapi.documents('api::product.product').findMany({
      filters: productFilters,
      status: 'published',
      populate: productPopulateQuery,
      sort: ['sortOrder:asc', 'name:asc'],
      start: (page - 1) * pageSize,
      limit: pageSize,
    })) as ProductRow[];

    return {
      category: {
        id: main.slug || main.documentId,
        label: main.label ?? '',
        ...(main.subtitle ? { subtitle: main.subtitle } : {}),
        ...(main.sortOrder != null ? { sortOrder: main.sortOrder } : {}),
      },
      subcategories,
      products: products
        .map((p) => mapProduct(strapi, p, { includeSubCategory: true }))
        .filter((p): p is CatalogProduct => p !== null),
      pagination: buildPaginationMeta(page, pageSize, total),
    };
  },

  async getProductDetail(brandKey: string, productKey: string) {
    const brand = await findPublishedBrand(strapi, brandKey);
    if (!brand) {
      return null;
    }

    const key = productKey.trim();
    let products = (await strapi.documents('api::product.product').findMany({
      filters: { sku: { $eq: key } },
      status: 'published',
      populate: productPopulateQuery,
      limit: 1,
    })) as ProductRow[];

    if (!products[0]) {
      products = (await strapi.documents('api::product.product').findMany({
        filters: { slug: { $eq: key } },
        status: 'published',
        populate: productPopulateQuery,
        limit: 1,
      })) as ProductRow[];
    }

    const row = products[0];
    if (!row || !productBelongsToBrand(row, brand.documentId) || row.isActive === false) {
      return null;
    }

    const mapped = mapProduct(strapi, row);
    if (!mapped) {
      return null;
    }

    const main = row.sub_category?.main_category;
    const sub = row.sub_category;

    return {
      category: main
        ? {
            id: main.slug || main.documentId,
            label: main.label ?? '',
          }
        : undefined,
      subCategory: sub
        ? {
            id: sub.slug || sub.documentId,
            label: sub.label ?? '',
          }
        : undefined,
      product: mapped,
    };
  },

  async getBrandStats(brandKey: string) {
    const brand = await findPublishedBrand(strapi, brandKey);
    if (!brand) {
      return null;
    }

    const mainCategories = await strapi.documents('api::main-category.main-category').findMany({
      filters: { brand: { documentId: { $eq: brand.documentId } } },
      status: 'published',
    });

    const subIds = await getSubCategoryIdsForBrand(strapi, brand.documentId);

    let activeProducts = 0;
    if (subIds.length > 0) {
      activeProducts = await strapi.documents('api::product.product').count({
        filters: activeProductFilters(subIds),
        status: 'published',
      });
    }

    return {
      brand: {
        slug: brand.slug ?? '',
        name: brand.name ?? '',
      },
      totals: {
        activeProducts,
        mainCategories: mainCategories.length,
        subCategories: subIds.length,
      },
    };
  },
});
