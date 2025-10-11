// nuxt.config.ts
import { fileURLToPath } from 'url'

const siteUrl  = (process.env.SITE_URL || 'https://www.tlkeys.com').replace(/\/+$/, '')
const siteName = 'tlkeys'
const logoUrl  = `${siteUrl}/images/logo/techno-lock-desktop-logo.webp`

const SAME_AS = [
  "https://www.facebook.com/technolockkeystrade",
  "https://www.instagram.com/technolock",
  "https://www.youtube.com/@technolock",
  "https://www.tiktok.com/@technolockkeys"
].filter(Boolean)


const OPENING_HOURS = [
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ],
    "opens": "09:00",
    "closes": "18:00"
  },
]

// --- i18n ---
const i18nOptions = {
  locales: [
    { code: 'en', iso: 'en-US', dir: 'ltr', file: 'en.json', name: 'English' },
    { code: 'ar', iso: 'ar-SA', dir: 'rtl', file: 'ar.json', name: 'العربية' },
    { code: 'es', iso: 'es-ES', dir: 'ltr', file: 'es.json', name: 'Español' },
    { code: 'fr', iso: 'fr-FR', dir: 'ltr', file: 'fr.json', name: 'Français' },
    { code: 'ru', iso: 'ru-RU', dir: 'ltr', file: 'ru.json', name: 'Русский' },
    { code: 'de', iso: 'de-DE', dir: 'ltr', file: 'de.json', name: 'Deutsch' }
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
  devServer: { host: '127.0.0.1', port: 4000 },
  ssr: true,
  srcDir: 'app',
  pages: true,

  modules: [
    '@nuxtjs/tailwindcss',
    ['@nuxtjs/i18n', i18nOptions],
    '@nuxt/image',
    '@pinia/nuxt',
    'nuxt-delay-hydration',
    'nuxt-vitalizer'
  ],

  /**
   * 🔧 BIG win: shrink entry.css
   * Keep only your absolute base file(s) globally.
   * Move the others to layout/component-level (see tweaks below).
   */
  css: [
    fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url)),
    // ⛔ moved to layout: common.css, layout-default.css, layout-header.css
  ],

  app: {
    head: {
      link: [
        // Preconnects that really help
        { rel: 'preconnect', href: 'https://www.google-analytics.com', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://dev-srv.tlkeys.com', crossorigin: 'anonymous' },

        // ✅ Preload fonts so they don’t block layout later
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/proximanova_regular.woff2', crossorigin: 'anonymous' },
        { rel: 'preload', as: 'font', type: 'font/woff2', href: '/fonts/proximanova_bold.woff2', crossorigin: 'anonymous' },

        // Favicons
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
            inLanguage: ['en-US', 'ar-SA', 'es-ES', 'fr-FR', 'ru-RU', 'de-DE'],
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
          // keep if you need GTM noscript. If you’re optimizing FCP, you can remove it.
          innerHTML:
            `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.NUXT_PUBLIC_GTM_ID || 'GTM-XXXXXXX'}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`
        }
      ]
    }
  },

  /**
   * Delay hydration as you already do, keeps JS from blocking LCP.
   */
  delayHydration: {
    mode: 'mount'
  },

  /**
   * Vitalizer can defer offscreen islands/images.
   * (Defaults are fine; heavy above-the-fold components shouldn’t be wrapped.)
   */
  vitalizer: { /* defaults */ },

  site: { url: siteUrl },

  /**
   * Images: ensure right formats and let IPX resize down huge sources.
   */
  // image: {
  //   domains: ['www.tlkeys.com', 'dev-srv.tlkeys.com'],
  //   format: ['avif', 'webp', 'jpeg'],
  //   quality: 85, // a notch lower
  //   presets: {
  //     // ✅ add a tiny logo preset so the 800×267 source isn’t shipped
  //     logo:   { modifiers: { width: 10, height: 26, quality: 70 } },
  //     product:{ modifiers: { width: 400, height: 400, fit: 'cover', quality: 80 } },
  //     thumb:  { modifiers: { width: 80, height: 80, fit: 'inside', quality: 70 } }
  //   }
  // },

  /**
   * Cache & ISR: make /_nuxt immutable and keep product pages fresh without blocking FCP.
   */
  routeRules: {
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/_ipx/**':  { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/images/**':{ headers: { 'cache-control': 'public, max-age=31536000, immutable' } },

    // Product pages: short SWR to keep them fast but up-to-date
    '/products/**': { swr: 600, cache: { browser: true, maxAge: 600 } }
  },

  /**
   * Compression of static assets is on (Brotli/Gzip). For HTML, enable Brotli on Nginx/Cloudflare.
   */
  nitro: {
    compressPublicAssets: true,
    prerender: { crawlLinks: false, routes: [] }
  },

  experimental: {
    inlineSSRStyles: true,   // ✅ inline critical CSS to cut render-blocking
    renderJsonPayloads: true
  },

  vite: {
    optimizeDeps: { include: ['swiper', 'lodash-es'] },
    build: {
      cssCodeSplit: true      // ✅ keep component CSS split
    }
  },

  compatibilityDate: '2025-09-22',
  devtools: { enabled: false },

  runtimeConfig: {
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
  }
})
