import { fileURLToPath } from 'url'

export default defineNuxtConfig({
  srcDir: 'app',
  pages: true,

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxt/image',
    '@pinia/nuxt',
    '@nuxtjs/critters',
    'nuxt-delay-hydration'
    
    // 🔥 SEO modules
    // '@nuxtjs/seo',       // Canonicals, OG/Twitter defaults, schema helpers
    // '@nuxtjs/sitemap',   // /sitemap.xml (+ i18n aware)
    // '@nuxtjs/robots',    // /robots.txt
    // 'nuxt-og-image'      // On-the-fly social share images
  ],
  delayHydration: { mode: 'mount' },
  critters: {
    // Options passed directly to beasties: https://github.com/danielroe/beasties#beasties-
    config: {
      // Default: 'media'
      preload: 'swap',
    },
  },
  css: [
    fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/common.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/layout-default.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/layout-header.css', import.meta.url)),
  ],

  /* =========================================
   *  Global <head> defaults (fallbacks)
   * =======================================*/
  app: {
    head: {
      __dangerouslyDisableSanitizersByTagID: {
        'ld-json': ['innerHTML']
      },
      htmlAttrs: {
        lang: 'en' // will be overridden per-locale below
      },
      link: [
        // Preconnects (adjust to your domains/CDNs)
        { rel: 'preconnect', href: 'https://www.google-analytics.com', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
              
        { rel: 'preconnect', href: 'https://dev-srv.tlkeys.com', crossorigin: 'anonymous' },
        // 🔑 Preload WOFF2 (self-hosted in /public/fonts)
        { rel: 'preload', as: 'font', href: '/fonts/proximanova_regular.woff2', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', as: 'font', href: '/fonts/proximanova_bold.woff2',    type: 'font/woff2', crossorigin: 'anonymous' },

      ],
      meta: [
        { name: 'theme-color', content: '#ffffff' },
        { name: 'format-detection', content: 'telephone=no' }
      ]
    }
  },

  /* =========================================
   *  i18n (hreflang + SEO)
   * =======================================*/
  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', file: 'en.json', name: 'English', dir: 'ltr' },
      { code: 'ar', iso: 'ar',    file: 'ar.json', name: 'العربية', dir: 'rtl' }
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    langDir: fileURLToPath(new URL('./app/locales', import.meta.url)),
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      alwaysRedirect: false,
      fallbackLocale: 'en'
    },
    vueI18n: './i18n.config.ts',
    // ✅ add canonical & hreflang automatically
    experimental: { localeDetector: 'cookie', typedOptions: true, /* for Nuxt i18n v8+ */ },
    seo: true // (if your @nuxtjs/i18n version exposes direct seo flag)
  },

  /* =========================================
   *  @nuxtjs/seo defaults
   * =======================================*/
  site: {
    url: process.env.SITE_URL || 'https://www.tlkeys.com', // REQUIRED for canonical/sitemap
    name: 'TechnoLock',                                     // brand / site_name
    description: 'Automotive locksmith tools, remotes, shells, and key programming devices.',
    defaultLocale: 'en',
    trailingSlash: false
  },
  ogImage: {
    // Default OG image (rendered server-side on the fly)
    // You can customize the template at /app/og-image/[...].vue if you like.
    enabled: true
  },

  /* =========================================
   *  Images (lighter, faster, better)
   * =======================================*/
  image: {
    quality: 70,
    domains: ['dev-srv.tlkeys.com', 'dev.tlkeys.com'], // no https://
    presets: {
      productLCP:  { modifiers: { width: 420,  fit: 'inside',  quality: 70, format: 'webp' } },
      productCard: { modifiers: { width: 378,  fit: 'cover',   quality: 70, format: 'webp' } },
      thumb80:     { modifiers: { width: 80,   height: 80,     fit: 'cover', quality: 60, format: 'webp' } },
      logo96:      { modifiers: { width: 96,   height: 32,     fit: 'inside', quality: 70, format: 'webp' } },
    }
  },

  /* =========================================
   *  Route rules (ISR + caching for SEO)
   * =======================================*/
  routeRules: {
    // Statically prerender evergreen pages
    '/': { prerender: true },
    '/products/**':  { isr: 60 * 60, headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },

  /* =========================================
   *  Nitro (prerender/compression)
   * =======================================*/
  nitro: {
    prerender: {
      // Add a few critical routes you know you want in every deploy
      routes: ['/', '/products/**']
    },
    compressPublicAssets: true
  },

  /* =========================================
   *  Misc performance that helps SEO
   * =======================================*/
  experimental: {
    payloadExtraction: true,
    inlineSSRStyles: true,
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      SECRET_KEY: process.env.SECRET_KEY,
      API_KEY: process.env.API_KEY,
      API_BASE_URL: process.env.API_BASE_URL,
      PUBLIC_PATH: process.env.PUBLIC_PATH,
      PUBLIC_PATH_WITHOUT_SLASH: process.env.PUBLIC_PATH_WITHOUT_SLASH,
      version: process.env.version,
      host: process.env.host
    }
  }
})
