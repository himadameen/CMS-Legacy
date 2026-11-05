import type { Core } from '@strapi/strapi';

export default {
  register() {},

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    strapi.server.routes({
      type: 'content-api',
      routes: [
        {
          method: 'GET',
          path: '/stats/:brandSlug',
          handler: 'api::storefront.storefront.stats',
          config: { auth: false },
          info: {},
        },
        {
          method: 'POST',
          path: '/stats',
          handler: 'api::storefront.storefront.stats',
          config: { auth: false },
          info: {},
        },
      ],
    });
  },
};
