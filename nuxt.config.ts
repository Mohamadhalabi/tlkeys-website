import { fileURLToPath } from 'url'
import { visualizer } from 'rollup-plugin-visualizer';

const siteUrl = (process.env.SITE_URL || 'https://www.tlkeys.com').replace(/\/+$/, '')
const siteName = 'tlkeys'
const logoUrl = `${siteUrl}/images/logo/techno-lock-desktop-logo.webp`
const searchTarget = `${siteUrl}/shop?q={search_term_string}`

const OPENING_HOURS = [{ "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], "opens": "09:00", "closes": "18:00" }]

const SAME_AS = ["https://www.facebook.com/technolockkeystrade", "https://www.instagram.com/technolock", "https://www.youtube.com/@technolock", "https://www.tiktok.com/@technolockkeys"].filter(Boolean)

const i18nOptions = {
  locales: [
    { code: 'en', iso: 'en', dir: 'ltr', file: 'en.json', name: 'English' },
    { code: 'ar', iso: 'ar', dir: 'rtl', file: 'ar.json', name: 'العربية' },
    { code: 'es', iso: 'es', dir: 'ltr', file: 'es.json', name: 'Español' },
    { code: 'fr', iso: 'fr', dir: 'ltr', file: 'fr.json', name: 'Français' },
    { code: 'ru', iso: 'ru', dir: 'ltr', file: 'ru.json', name: 'Русский' },
    { code: 'de', iso: 'de', dir: 'ltr', file: 'de.json', name: 'Deutsch' },
    { code: 'tr', iso: 'tr', dir: 'ltr', file: 'tr.json', name: 'Turkish' },
    { code: 'pt', iso: 'pt', dir: 'ltr', file: 'pt.json', name: 'Portuguese' },
    { code: 'it', iso: 'it', dir: 'ltr', file: 'it.json', name: 'Italian' }
  ],
  defaultLocale: 'en',
  strategy: 'prefix_except_default',
  detectBrowserLanguage: false,
  baseUrl: siteUrl,
  seo: true,
  lazy: true,
  langDir: 'locales',
  vueI18n: 'i18n.config.ts'
}

export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2025-09-22',

  devServer: { host: '127.0.0.1', port: 4000 },
  ssr: true,
  srcDir: 'app',
  pages: true,
  middleware: ['shop-redirect'],

  modules: [
    '@nuxtjs/tailwindcss',
    ['@nuxtjs/i18n', i18nOptions],
    '@nuxt/image',
    '@nuxt/scripts',
    '@pinia/nuxt',
    'nuxt-delay-hydration',
    'nuxt-vitalizer',
    '@vite-pwa/nuxt',
    '@nuxtjs/sitemap',
    '@nuxt/scripts' // NEW: Added for better 3rd party script management
  ],

  // --- DELAY HYDRATION OPTIMIZATION ---
  // Switching to 'init' and adding 'replayClick' directly targets INP issues
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
    sources: ['/api/sitemap-routes'],
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
      // Note: GTM Script removed from here to be used via @nuxt/scripts in app.vue
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

  routeRules: {
    '/products/**': { headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    // NEW: Cache the sitemap endpoint and the XML files for 24 hours
    '/api/sitemap-routes': { cache: { maxAge: 86400 } },
    '/sitemap.xml': { cache: { maxAge: 86400 } },
    '/sitemap-*.xml': { cache: { maxAge: 86400 } }
  },

  nitro: {
    compressPublicAssets: true,
  },

  // --- EXPERIMENTAL SETTINGS ---
  experimental: {
    payloadExtraction: false,
    emitRouteChunkError: 'automatic',
    viewTransition: true, // Improves perceived navigation speed
    renderJsonPayloads: true,
    navigationRepaint: false,
  },

  vite: {
    optimizeDeps: { include: ['swiper'] },
    build: {
      rollupOptions: {
        output: {
          // Helps INP by preventing one massive JS execution block
          manualChunks(id) {
            if (id.includes('node_modules')) return 'vendor';
          }
        }
      }
    },
    plugins: [
      ...(process.env.ANALYZE === 'true' ? [visualizer({ open: true, filename: 'stats.html' })] : [])
    ],
  },
})