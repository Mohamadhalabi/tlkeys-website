import { fileURLToPath } from 'url'
import { visualizer } from 'rollup-plugin-visualizer';

const siteUrl = (process.env.SITE_URL || 'https://www.tlkeys.com').replace(/\/+$/, '')

const i18nOptions = {
  locales: [
    { code: 'en', iso: 'en', dir: 'ltr', file: 'en.ts', name: 'English' },
    { code: 'ar', iso: 'ar', dir: 'rtl', file: 'ar.ts', name: 'العربية' },
    { code: 'es', iso: 'es', dir: 'ltr', file: 'es.ts', name: 'Español' },
    { code: 'fr', iso: 'fr', dir: 'ltr', file: 'fr.ts', name: 'Français' },
    { code: 'ru', iso: 'ru', dir: 'ltr', file: 'ru.ts', name: 'Русский' },
    { code: 'de', iso: 'de', dir: 'ltr', file: 'de.ts', name: 'Deutsch' },
    { code: 'tr', iso: 'tr', dir: 'ltr', file: 'tr.ts', name: 'Turkish' },
    { code: 'pt', iso: 'pt', dir: 'ltr', file: 'pt.ts', name: 'Portuguese' },
    { code: 'it', iso: 'it', dir: 'ltr', file: 'it.ts', name: 'Italian' }
  ],
  defaultLocale: 'en',
  strategy: 'prefix_except_default',
  detectBrowserLanguage: false,
  baseUrl: siteUrl,
  seo: true,
  lazy: true,
  langDir: '../i18n/locales', // <-- THIS IS THE CRUCIAL PATH FIX
  vueI18n: 'i18n.config.ts' // Note: Make sure this file is also in the root, or update its path too
}

export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2025-09-22',

  devServer: { host: '127.0.0.1', port: 4000 },
  ssr: true,
  srcDir: 'app',
  pages: true,
  middleware: ['shop-redirect'],

  site: {
    url: 'https://www.tlkeys.com'
  },

  modules: [
    '@nuxtjs/tailwindcss',
    ['@nuxtjs/i18n', i18nOptions],
    '@nuxt/image',
    '@nuxt/scripts',
    '@pinia/nuxt',
    'nuxt-delay-hydration',
    'nuxt-vitalizer',
    '@vite-pwa/nuxt',
    '@nuxtjs/sitemap'
  ],

  // --- DELAY HYDRATION OPTIMIZATION ---
  delayHydration: {
    mode: 'mount',
    debug: process.env.NODE_ENV === 'development',
    replayClick: true
  },

  image: {
    domains: ['dev-srv.tlkeys.com'],
    alias: { backend: 'https://dev-srv.tlkeys.com/storage/images' },
    provider: 'ipx',
  },

  sitemap: {
    debug: false,
    autoI18n: true,
    autoLastmod: true,
    xslUrl: false,
    strictNuxtContentPaths: false,
    sitemaps: {
      en: { sources: ['/api/sitemap-routes?lang=en'] },
      ar: { sources: ['/api/sitemap-routes?lang=ar'] },
      es: { sources: ['/api/sitemap-routes?lang=es'] },
      fr: { sources: ['/api/sitemap-routes?lang=fr'] },
      ru: { sources: ['/api/sitemap-routes?lang=ru'] },
      de: { sources: ['/api/sitemap-routes?lang=de'] },
      tr: { sources: ['/api/sitemap-routes?lang=tr'] },
      pt: { sources: ['/api/sitemap-routes?lang=pt'] },
      it: { sources: ['/api/sitemap-routes?lang=it'] },
    },
    defaults: {
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date().toISOString(),
    },
    exclude: [
      '/checkout/**', '/account/**', '/cart', '/complete-order', '/complete-custom-order', '/custom-order',
      '/**/checkout/**', '/**/account/**', '/**/cart', '/**/complete-order', '/**/complete-custom-order', '/**/custom-order',
      '/3e00ce51bde3addf1fa11b7', '/6b750ddca9d27708692942d7d85ee5a16b3fc2e6', '/435d7eb240c0e460cbb0281d1956b68c0ca99c33'
    ]
  },

  // --- MERGED AND FIXED ROUTE RULES ---
  routeRules: {
    // Cache the English products route
    '/products/**': { swr: 3600 },

    // Cache the localized products routes
    '/ar/products/**': { swr: 3600 },
    '/es/products/**': { swr: 3600 },
    '/fr/products/**': { swr: 3600 },
    '/ru/products/**': { swr: 3600 },
    '/de/products/**': { swr: 3600 },
    '/tr/products/**': { swr: 3600 },
    '/pt/products/**': { swr: 3600 },
    '/it/products/**': { swr: 3600 },

    // Static assets
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },

  runtimeConfig: {
    apiKey: process.env.API_KEY,
    secretKey: process.env.SECRET_KEY,
    apiBaseUrl: process.env.API_BASE_URL,
    public: {
      siteName: 'Techno Lock Keys',
      siteUrl,
      defaultOgImage: `${siteUrl}/images/og-image.jpg`,
      defaultDescription: 'Automotive locksmith tools, remotes, shells, and key programming devices.',
      gtmId: process.env.NUXT_PUBLIC_GTM_ID || 'GTM-PWSSMVC7',
      SECRET_KEY: process.env.SECRET_KEY,
      API_KEY: process.env.API_KEY,
      API_BASE_URL: process.env.API_BASE_URL,
      PUBLIC_PATH: process.env.PUBLIC_PATH,
      PUBLIC_PATH_WITHOUT_SLASH: process.env.PUBLIC_PATH_WITHOUT_SLASH,
      version: process.env.version,
      host: process.env.host
    }
  },

  css: [
    fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/common.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/layout-default.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/layout-header.css', import.meta.url))
  ],

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://www.google-analytics.com', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
        { rel: 'preconnect', href: 'https://dev-srv.tlkeys.com', crossorigin: 'anonymous' },
      ],
      meta: [
        { name: 'theme-color', content: '#111827' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
    }
  },

  nitro: {
    compressPublicAssets: true,
    minify: true,
  },

  // --- EXPERIMENTAL SETTINGS ---
  experimental: {
    payloadExtraction: false,
    emitRouteChunkError: 'automatic',
    viewTransition: true,
    renderJsonPayloads: true,
    navigationRepaint: false,
  },

  vite: {
    plugins: [
      ...(process.env.ANALYZE === 'true' ? [visualizer({ open: true, filename: 'stats.html' })] : [])
    ],
  },
})