export default {
  routes: [
    {
      method: 'GET',
      path: '/home/:brandSlug',
      handler: 'storefront.home',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/home',
      handler: 'storefront.home',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/catalog/:brandSlug',
      handler: 'storefront.catalog',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/catalog',
      handler: 'storefront.catalog',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/product/:brandSlug/:productKey',
      handler: 'storefront.product',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/product',
      handler: 'storefront.product',
      config: { auth: false },
    },
  ],
};
