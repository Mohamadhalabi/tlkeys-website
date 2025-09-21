// nuxt.config.ts
import { fileURLToPath } from 'url'
import { createResolver } from '@nuxt/kit'

const { resolve } = createResolver(import.meta.url)

// 🔧 Build-time constants used by JSON-LD
const siteUrl  = ('https://www.tlkeys.com').replace(/\/+$/, '')
const siteName = 'tlkeys'
const logoUrl  = `${siteUrl}/images/logo/techno-lock-desktop-logo.webp`
const searchTarget = `${siteUrl}/shop?q={search_term_string}`

// ✅ Optional business metadata via env (leave empty if unknown)
const SAME_AS = [
  process.env.SOCIAL_FACEBOOK,
  process.env.SOCIAL_INSTAGRAM,
  process.env.SOCIAL_YOUTUBE,
  process.env.SOCIAL_TIKTOK,
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

// If you want opening hours, set OPENING_HOURS_JSON to a JSON array of objects
// e.g. [{"dayOfWeek":["Monday","Tuesday"],"opens":"09:00","closes":"18:00"}]
let OPENING_HOURS
try {
  OPENING_HOURS = process.env.OPENING_HOURS_JSON
    ? JSON.parse(process.env.OPENING_HOURS_JSON)
    : undefined
} catch { OPENING_HOURS = undefined }

export default defineNuxtConfig({
    devServer: {
    host: '127.0.0.1',
    port: 4000,
  },
  ssr: true,
  srcDir: 'app',
  pages: true,

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxt/image',
    '@pinia/nuxt',
  ],

  css: [
    fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/common.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/layout-default.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/layout-header.css', import.meta.url)),
  ],

  app: {
    head: {
      htmlAttrs: { lang: 'en' },

      link: [
        { rel: 'preconnect', href: 'https://www.google-analytics.com', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
        { rel: 'preconnect', href: 'https://dev-srv.tlkeys.com', crossorigin: 'anonymous' },

        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],

      meta: [
        { name: 'theme-color', content: '#ffffff' },
        { name: 'msapplication-TileColor', content: '#ffffff' },
        { name: 'format-detection', content: 'telephone=no' },

        { name: 'description', content: 'Automotive locksmith tools, remotes, shells, and key programming devices.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Techno Lock Keys' },
        { property: 'og:image', content: 'https://www.tlkeys.com/images/og-image.jpg' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://www.tlkeys.com/images/og-image.jpg' }
      ],

      // ✅ Global JSON-LD schema
      script: [
        {
          key: 'ld-org',
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${siteUrl}`,
            name: siteName,
            url: siteUrl,
            logo: logoUrl,
            // sameAs: ['https://www.facebook.com/...']
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
            publisher: { '@id': `${siteUrl}` },
            inLanguage: ['en-US','ar-AR','es-ES','fr-FR','ru-RU','de-DE'],
            potentialAction: {
              '@type': 'SearchAction',
              target: searchTarget,
              'query-input': 'required name=search_term_string'
            }
          })
        },
        // ➕ LocalBusiness / AutoPartsStore
        {
          key: 'ld-local',
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AutoPartsStore',               // fits your niche better than generic LocalBusiness
            '@id': `${siteUrl}`,
            url: siteUrl,
            name: 'Techno Lock Keys',
            image: logoUrl,
            logo: logoUrl,
            // reference your org node
            parentOrganization: { '@id': `${siteUrl}` },

            // Optional but helpful signals:
            priceRange: '$$',
            currenciesAccepted: 'USD, EUR, TRY, AED, GBP',
            areaServed: 'Worldwide',

            // Will only appear if envs are provided (undefined is dropped by JSON.stringify)
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
            `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.NUXT_PUBLIC_GTM_ID || 'GTM-XXXXXXX'}"
               height="0" width="0" style="display:none;visibility:hidden"></iframe>`
        }
      ],
      __dangerouslyDisableSanitizersByTagID: {
        'ld-org': ['innerHTML'],
        'ld-website': ['innerHTML'],
        'ld-local': ['innerHTML'],     // ⬅️ add this
        'ld-json': ['innerHTML']
      },
      __dangerouslyDisableSanitizers: ['noscript']
    }
  },
  // image: {
  //   domains: ['www.tlkeys.com', 'dev-srv.tlkeys.com'],
  //   format: ['webp', 'avif'],
  //   screens: {
  //     sm: 320,
  //     md: 640,
  //     lg: 1024,
  //     xl: 1280,
  //     xxl: 1536
  //   }
  // },

  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', name: 'English', dir: 'ltr', file: 'en.json' },
      { code: 'ar', iso: 'ar-SA', name: 'العربية', dir: 'rtl', file: 'ar.json' },
      { code: 'es', iso: 'es-ES', name: 'Español', dir: 'ltr', file: 'es.json' },
      { code: 'fr', iso: 'fr-FR', name: 'Français', dir: 'ltr', file: 'fr.json' },
      { code: 'ru', iso: 'ru-RU', name: 'Русский', dir: 'ltr', file: 'ru.json' },
      { code: 'de', iso: 'de-DE', name: 'Deutsch', dir: 'ltr', file: 'de.json' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: { enabled: false },
    lazy: true,
    seo: true,
    baseUrl: 'https://www.tlkeys.com',
    langDir: resolve('app/locales'),
    vueI18n: resolve('i18n.config.ts'),
  },

  routeRules: {
    '/products/**': { isr: 60 * 60, headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },
  nitro: { compressPublicAssets: true },
  experimental: { payloadExtraction: false, inlineSSRStyles: true },
  vite: {
    optimizeDeps: {
      include: ['swiper', 'lodash-es']
    }
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      siteName: 'Techno Lock Keys',
      siteUrl: process.env.SITE_URL || 'https://www.tlkeys.com',
      defaultOgImage: 'https://www.tlkeys.com/images/og-image.jpg',
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
