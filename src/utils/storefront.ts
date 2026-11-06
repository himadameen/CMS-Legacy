import type { Core } from '@strapi/strapi';

export type MediaFile = { url?: string };

export type SizeMatrix = { eu?: string; uk?: string; us?: string };

export type SpecsRow = {
  typicalUse?: string;
  upperMaterial?: string;
  lining?: string;
  soleType?: string;
  construction?: string;
  Sizes?: SizeMatrix;
  sizes?: SizeMatrix;
  colorRuns?: string;
  gradeOptions?: string;
  privateLabel?: string;
  packaging?: string;
};

export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  imageAlt: string;
  specs?: Record<string, unknown>;
  subCategoryId?: string;
  subCategoryLabel?: string;
  quantityAvailable?: number;
  tags: string[];
  isActive?: boolean;
};

export const PRODUCT_TAG_LABELS: Record<string, string> = {
  hot_sale: 'Hot Sale',
  sold: 'Sold',
  recommended: 'Recommended',
  fast_moving: 'Fast moving',
  most_likable: 'Most likable',
  most_sale: 'Most sale',
  trending: 'Trending',
};

export type ProductTagKey = keyof typeof PRODUCT_TAG_LABELS;

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export type BrandRow = {
  documentId: string;
  name?: string;
  slug?: string;
  legalName?: string;
  logoTagline?: string;
  tagline?: string;
  AboutBrand?: string;
  skuPrefix?: string;
  isActive?: boolean | null;
};

export type ProductRow = {
  documentId: string;
  slug?: string | null;
  sku?: string | null;
  name?: string | null;
  description?: string | null;
  imageAlt?: string | null;
  sortOrder?: number | null;
  featuredOnHome?: boolean | null;
  homeSort?: number | null;
  publishedAt?: string | null;
  quantityAvailable?: number | null;
  isActive?: boolean | null;
  productTags?: ProductTagKey[] | ProductTagKey | string | string[] | null;
  primaryImage?: MediaFile;
  gallery?: MediaFile[];
  specs?: SpecsRow;
  sub_category?: {
    documentId: string;
    slug?: string;
    label?: string;
    main_category?: {
      documentId: string;
      slug?: string;
      label?: string;
      brand?: { documentId: string };
    };
  };
};

export const productPopulate = {
  primaryImage: true,
  gallery: true,
  specs: { populate: ['Sizes' as const] },
  sub_category: {
    populate: {
      main_category: {
        populate: ['brand' as const],
      },
    },
  },
};

export function absoluteMediaUrl(strapi: Core.Strapi, media: MediaFile | null | undefined): string {
  if (!media?.url) {
    return '';
  }
  if (media.url.startsWith('http')) {
    return media.url;
  }
  const base = ((strapi.config.get('server.url') as string) || '').replace(/\/$/, '');
  return `${base}${media.url}`;
}

function mapSpecs(specs: SpecsRow | null | undefined): Record<string, unknown> | undefined {
  if (!specs) {
    return undefined;
  }

  const rawSizes = specs.Sizes ?? specs.sizes;
  const sizes =
    rawSizes && (rawSizes.eu || rawSizes.uk || rawSizes.us)
      ? { eu: rawSizes.eu ?? '', uk: rawSizes.uk ?? '', us: rawSizes.us ?? '' }
      : undefined;

  const mapped: Record<string, unknown> = {};
  const assign = (key: string, value: string | undefined) => {
    if (value !== undefined && value !== '') {
      mapped[key] = value;
    }
  };

  assign('typicalUse', specs.typicalUse);
  assign('upperMaterial', specs.upperMaterial);
  assign('lining', specs.lining);
  assign('soleType', specs.soleType);
  assign('construction', specs.construction);
  assign('colorRuns', specs.colorRuns);
  assign('gradeOptions', specs.gradeOptions);
  assign('privateLabel', specs.privateLabel);
  assign('packaging', specs.packaging);
  if (sizes) {
    mapped.sizes = sizes;
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

export function normalizeProductTags(
  tags: ProductRow['productTags'] | string | null | undefined
): string[] {
  if (tags == null) {
    return [];
  }
  if (Array.isArray(tags)) {
    return tags.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
  }
  if (typeof tags === 'string' && tags.length > 0) {
    return [tags];
  }
  return [];
}

export function mapProductTags(tags: ProductRow['productTags'] | string | null | undefined): string[] {
  const list = normalizeProductTags(tags);
  return list.map((tag) => PRODUCT_TAG_LABELS[tag] ?? tag);
}

/** Published, not disabled, optional in-stock filter for counts/listings */
export function activeProductFilters(subCategoryIds: string[]) {
  return {
    sub_category: { documentId: { $in: subCategoryIds } },
    isActive: { $ne: false },
  };
}

export function mapProduct(
  strapi: Core.Strapi,
  product: ProductRow,
  options?: { includeSubCategory?: boolean }
): CatalogProduct | null {
  if (!product.sku || !product.name) {
    return null;
  }

  const imageUrl = absoluteMediaUrl(strapi, product.primaryImage);
  const galleryUrls = (product.gallery ?? [])
    .map((file) => absoluteMediaUrl(strapi, file))
    .filter(Boolean);

  const id = product.slug?.trim() || product.documentId;
  const specs = mapSpecs(product.specs);
  const tags = mapProductTags(product.productTags);

  const base: CatalogProduct = {
    id,
    sku: product.sku,
    name: product.name,
    description: product.description ?? '',
    imageUrl,
    ...(galleryUrls.length > 0 ? { imageUrls: galleryUrls } : {}),
    imageAlt: product.imageAlt ?? product.name,
    ...(specs ? { specs } : {}),
    quantityAvailable: product.quantityAvailable ?? 0,
    tags,
    ...(product.isActive === false ? { isActive: false } : { isActive: true }),
  };

  if (options?.includeSubCategory && product.sub_category) {
    base.subCategoryId = product.sub_category.slug || product.sub_category.documentId;
    base.subCategoryLabel = product.sub_category.label;
  }

  return base;
}

export function parsePagination(
  input: { page?: unknown; pageSize?: unknown },
  defaults: { page: number; pageSize: number; maxPageSize: number } = {
    page: 1,
    pageSize: 12,
    maxPageSize: 100,
  }
): { page: number; pageSize: number; start: number } {
  const page = Math.max(1, Number.parseInt(String(input.page ?? defaults.page), 10) || defaults.page);
  const rawSize =
    Number.parseInt(String(input.pageSize ?? defaults.pageSize), 10) || defaults.pageSize;
  const pageSize = Math.min(defaults.maxPageSize, Math.max(1, rawSize));
  return { page, pageSize, start: (page - 1) * pageSize };
}

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const pageCount = total === 0 ? 0 : Math.ceil(total / pageSize);
  return { page, pageSize, total, pageCount };
}

export async function findPublishedBrand(
  strapi: Core.Strapi,
  brandKey: string
): Promise<BrandRow | null> {
  const normalized = brandKey.trim();
  if (!normalized) {
    return null;
  }

  const bySlug = await strapi.documents('api::brand.brand').findMany({
    filters: {
      slug: { $eq: normalized },
      isActive: { $ne: false },
    },
    status: 'published',
    limit: 1,
  });

  if (bySlug[0]) {
    return bySlug[0] as BrandRow;
  }

  const byName = await strapi.documents('api::brand.brand').findMany({
    filters: {
      name: { $eqi: normalized },
      isActive: { $ne: false },
    },
    status: 'published',
    limit: 1,
  });

  return (byName[0] as BrandRow) ?? null;
}

export function mapBrandPublic(brand: BrandRow) {
  return {
    name: brand.name ?? '',
    slug: brand.slug ?? '',
    legalName: brand.legalName,
    logoTagline: brand.logoTagline,
    tagline: brand.tagline,
    aboutBrand: brand.AboutBrand,
    skuPrefix: brand.skuPrefix,
  };
}

export async function getSubCategoryIdsForBrand(
  strapi: Core.Strapi,
  brandDocumentId: string,
  mainCategorySlug?: string
): Promise<string[]> {
  const mainFilters: Record<string, unknown> = {
    brand: { documentId: { $eq: brandDocumentId } },
  };
  if (mainCategorySlug) {
    mainFilters.slug = { $eq: mainCategorySlug };
  }

  const mains = await strapi.documents('api::main-category.main-category').findMany({
    filters: mainFilters,
    status: 'published',
  });

  const mainIds = mains.map((m) => (m as { documentId: string }).documentId);
  if (mainIds.length === 0) {
    return [];
  }

  const subs = await strapi.documents('api::sub-category.sub-category').findMany({
    filters: {
      main_category: { documentId: { $in: mainIds } },
    },
    status: 'published',
  });

  return subs.map((s) => (s as { documentId: string }).documentId);
}

export function productBelongsToBrand(product: ProductRow, brandDocumentId: string): boolean {
  return product.sub_category?.main_category?.brand?.documentId === brandDocumentId;
}
