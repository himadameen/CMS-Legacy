import type { Schema, Struct } from '@strapi/strapi';

export interface CatalogCatalog extends Struct.ComponentSchema {
  collectionName: 'components_catalog_catalogs';
  info: {
    displayName: 'Catalog';
  };
  attributes: {};
}

export interface CatalogSizeMatrix extends Struct.ComponentSchema {
  collectionName: 'components_catalog_size_matrices';
  info: {
    displayName: 'Size Matrix';
  };
  attributes: {
    eu: Schema.Attribute.String;
    uk: Schema.Attribute.String;
    us: Schema.Attribute.String;
  };
}

export interface ProductspecsProductSpecs extends Struct.ComponentSchema {
  collectionName: 'components_productspecs_product_specs';
  info: {
    displayName: 'Product Specs';
  };
  attributes: {
    colorRuns: Schema.Attribute.String;
    gradeOptions: Schema.Attribute.String;
    lining: Schema.Attribute.String;
    privateLabel: Schema.Attribute.String;
    Sizes: Schema.Attribute.Component<'catalog.size-matrix', false>;
    soleType: Schema.Attribute.String;
    typicalUse: Schema.Attribute.String;
    upperMaterial: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'catalog.catalog': CatalogCatalog;
      'catalog.size-matrix': CatalogSizeMatrix;
      'productspecs.product-specs': ProductspecsProductSpecs;
    }
  }
}
