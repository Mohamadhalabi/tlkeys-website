// nuxt.config.ts
import { fileURLToPath } from 'url'

const siteUrl = (process.env.SITE_URL || 'https://www.tlkeys.com').replace(/\/+$/, '')
const siteName = 'tlkeys'

// --- i18n ---
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

const OPENING_HOURS = [{ "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], "opens": "09:00", "closes": "18:00" },]

const SAME_AS = ["https://www.facebook.com/technolockkeystrade", "https://www.instagram.com/technolock", "https://www.youtube.com/@technolock", "https://www.tiktok.com/@technolockkeys"].filter(Boolean)


export default defineNuxtConfig({
  devServer: { host: '127.0.0.1', port: 4000 },
  ssr: true,
  srcDir: 'app',
  pages: true,
  middleware: ['shop-redirect'],

  modules: [
    '@nuxtjs/tailwindcss',
    ['@nuxtjs/i18n', i18nOptions],
    '@nuxt/image',
    '@pinia/nuxt',
    'nuxt-delay-hydration',
    'nuxt-vitalizer',
    '@vite-pwa/nuxt',
    '@nuxtjs/sitemap'
  ],

  // --- SITEMAP CONFIGURATION ---
  sitemap: {
    debug: true,
    autoI18n: true,
    sitemaps: true,

    // Point to our local proxy
    sources: [
      '/api/sitemap-routes'
    ],

    defaults: {
      changefreq: 'daily',
      priority: 0.8,
      lastmod: new Date().toISOString(),
    },

    // Exclude protected routes for ALL languages
    exclude: [
      '/checkout/**',
      '/account/**',
      '/cart',
      '/complete-order',
      '/complete-custom-order',
      '/custom-order',
      '/**/checkout/**',
      '/**/account/**',
      '/**/cart',
      '/**/complete-order',
      '/**/complete-custom-order',
      '/**/custom-order',
      '/3e00ce51bde3addf1fa11b7',
      '/6b750ddca9d27708692942d7d85ee5a16b3fc2e6',
      '/435d7eb240c0e460cbb0281d1956b68c0ca99c33'
    ]
  },

  // --- IMPORTANT: RUNTIME CONFIG ---
  runtimeConfig: {
    // 🔒 PRIVATE KEYS (Used by Sitemap Proxy on Server)
    apiKey: process.env.API_KEY,
    secretKey: process.env.SECRET_KEY,
    apiBaseUrl: process.env.API_BASE_URL,

    // 🔓 PUBLIC KEYS (Used by Browser / Search Bar)
    // We PUT THEM BACK here so your frontend stops crashing
    public: {
      siteName: 'Techno Lock Keys',
      siteUrl,
      defaultOgImage: `${siteUrl}/images/og-image.jpg`,
      defaultDescription: 'Automotive locksmith tools, remotes, shells, and key programming devices.',
      gtmId: process.env.NUXT_PUBLIC_GTM_ID || 'GTM-PWSSMVC7',

      // RESTORED KEYS FOR FRONTEND:
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

  pwa: {
    registerType: 'autoUpdate',
    devOptions: { enabled: true },
    manifest: {
      name: 'TLKeys',
      short_name: 'TLKeys',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#111827',
      theme_color: '#111827',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff2}'] },
  },

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://www.google-analytics.com', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
        { rel: 'preconnect', href: 'https://dev-srv.tlkeys.com', crossorigin: 'anonymous' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
      ],
      meta: [
        { name: 'theme-color', content: '#ffffff' },
        { name: 'msapplication-TileColor', content: '#ffffff' },
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'description', content: 'Automotive locksmith tools, remotes, shells, and key programming devices.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Techno Lock Keys' },
        { property: 'og:image', content: `${siteUrl}/images/og-image.jpg` },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: `${siteUrl}/images/og-image.jpg` }
      ],
      script: [
        {
          key: 'ld-org',
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': siteUrl,
            name: siteName,
            url: siteUrl,
            logo: logoUrl
          })
        },
        {
          key: 'ld-website',
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteName,
            url: siteUrl,
            publisher: { '@id': siteUrl },
            inLanguage: ['en', 'ar', 'es', 'fr', 'ru', 'de', 'pt', 'it', 'tr'],
            potentialAction: {
              '@type': 'SearchAction',
              target: `${siteUrl}/shop?q={search_term_string}`,
              'query-input': 'required name=search_term_string'
            }
          })
        },
        {
          key: 'ld-local',
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AutoPartsStore',
            '@id': siteUrl,
            url: siteUrl,
            name: 'Techno Lock Keys',
            image: logoUrl,
            logo: logoUrl,
            parentOrganization: { '@id': siteUrl },
            priceRange: '$$',
            currenciesAccepted: 'USD, EUR, TRY, AED, GBP',
            areaServed: 'Worldwide',
            telephone: "+971504429045",
            email: "info@tlkeys.com",
            address: "Sharjah – Industrial No. 5, behind Maliha Road Shop No. 8, Property of Ali Nasir Mohamed Suleiman United Arab Emirates",
            openingHoursSpecification: OPENING_HOURS,
            sameAs: SAME_AS.length ? SAME_AS : undefined
          })
        }
      ],
      noscript: [
        {
          innerHTML:
            `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.NUXT_PUBLIC_GTM_ID || 'GTM-XXXXXXX'}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`
        }
      ]
    }
  },

  site: { url: siteUrl },

  routeRules: {
    '/products/**': { headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/_ipx/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/images/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },

  nitro: {
    compressPublicAssets: true,
    prerender: {
      crawlLinks: false,
      routes: []
    }
  },

  delayHydration: { mode: 'mount' },
  vitalizer: { /* defaults */ },
  experimental: { payloadExtraction: false },

  vite: {
    optimizeDeps: { include: ['swiper', 'lodash-es'] },
    build: { cssCodeSplit: false }
  },

  compatibilityDate: '2025-09-22',
  devtools: { enabled: false },
})