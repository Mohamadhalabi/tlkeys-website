// nuxt.config.ts
import { fileURLToPath } from 'url'

const siteUrl  = (process.env.SITE_URL || 'https://www.tlkeys.com').replace(/\/+$/, '')
const siteName = 'tlkeys'
const logoUrl  = `${siteUrl}/images/logo/techno-lock-desktop-logo.webp`
const searchTarget = `${siteUrl}/shop?q={search_term_string}`

const SAME_AS = [
  process.env.SOCIAL_FACEBOOK,
  process.env.SOCIAL_INSTAGRAM,
  process.env.SOCIAL_YOUTUBE,
  process.env.SOCIAL_TIKTOK
].filter(Boolean)

const ADDRESS =
  process.env.BUSINESS_STREET ||
  process.env.BUSINESS_LOCALITY ||
  process.env.BUSINESS_REGION ||
  process.env.BUSINESS_POSTCODE ||
  process.env.BUSINESS_COUNTRY
    ? {
        '@type': 'PostalAddress',
        streetAddress: process.env.BUSINESS_STREET,
        addressLocality: process.env.BUSINESS_LOCALITY,
        addressRegion: process.env.BUSINESS_REGION,
        postalCode: process.env.BUSINESS_POSTCODE,
        addressCountry: process.env.BUSINESS_COUNTRY || 'AE'
      }
    : undefined

let OPENING_HOURS: any
try {
  OPENING_HOURS = process.env.OPENING_HOURS_JSON ? JSON.parse(process.env.OPENING_HOURS_JSON) : undefined
} catch { OPENING_HOURS = undefined }

// --- i18n (inline on module!) ---
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
  // Must be RELATIVE to srcDir ("app")
  langDir: 'locales',
  // Minimal file (don’t import messages here when using lazy+langDir)
  vueI18n: 'i18n.config.ts'
}

export default defineNuxtConfig({
  devServer: { host: '127.0.0.1', port: 4000 },
  ssr: true,
  srcDir: 'app',
  pages: true,

  modules: [
    '@nuxtjs/tailwindcss',
    ['@nuxtjs/i18n', i18nOptions], // ← single source of truth
    '@nuxt/image',
    '@pinia/nuxt'
  ],

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
            telephone: process.env.BUSINESS_PHONE || undefined,
            email: process.env.BUSINESS_EMAIL || undefined,
            address: ADDRESS,
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

  // image: {
  //   domains: ['www.tlkeys.com', 'dev-srv.tlkeys.com'],
  //   format: ['avif', 'webp'],
  //   quality: 70
  // },

  routeRules: {
    '/products/**': { headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
    '/_nuxt/**':    { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/fonts/**':    { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/_ipx/**':     { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/images/**':   { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }
  },

  nitro: {
    compressPublicAssets: true,
    prerender: { crawlLinks: false, routes: [] }
  },

  experimental: { payloadExtraction: false },

  vite: {
    optimizeDeps: { include: ['swiper', 'lodash-es'] },
    build: { cssCodeSplit: false }
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
