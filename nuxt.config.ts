// nuxt.config.ts
import { fileURLToPath } from 'url'
import { createResolver } from '@nuxt/kit'

const { resolve } = createResolver(import.meta.url)

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
  ],

  delayHydration: { mode: 'mount' },
  critters: { config: { preload: 'swap' } },

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
        // preconnects you already had
        { rel: 'preconnect', href: 'https://www.google-analytics.com', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
        { rel: 'preconnect', href: 'https://dev-srv.tlkeys.com', crossorigin: 'anonymous' },

        // ✅ FAVICONS (put files in /public)
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        // { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#f07905' },
        // { rel: 'manifest', href: '/site.webmanifest' },

        // preload your self-hosted fonts (optional)
        { rel: 'preload', as: 'font', href: '/fonts/proximanova_regular.woff2', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', as: 'font', href: '/fonts/proximanova_bold.woff2',    type: 'font/woff2', crossorigin: 'anonymous' },
      ],

      meta: [
        { name: 'theme-color', content: '#ffffff' },
        { name: 'msapplication-TileColor', content: '#ffffff' },
        { name: 'format-detection', content: 'telephone=no' },

        // safe global fallbacks (pages can override via useSeoMeta)
        { name: 'description', content: 'Automotive locksmith tools, remotes, shells, and key programming devices.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Techno Lock Keys' },
        { property: 'og:image', content: '/images/og-default.jpg' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: '/images/og-default.jpg' }
      ],

      // Keep your GTM <noscript> here if you want (optional)
      // It will only render on client; SSR won’t show an iframe.
      noscript: [
        {
          innerHTML:
            `<iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.NUXT_PUBLIC_GTM_ID || 'GTM-XXXXXXX'}"
               height="0" width="0" style="display:none;visibility:hidden"></iframe>`
        }
      ],
      __dangerouslyDisableSanitizersByTagID: { 'ld-json': ['innerHTML'] },
      __dangerouslyDisableSanitizers: ['noscript']
    }
  },

  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', name: 'English', dir: 'ltr', file: 'en.json' },
      { code: 'ar', iso: 'ar',    name: 'العربية', dir: 'rtl', file: 'ar.json' },
      { code: 'es', iso: 'es-ES', name: 'Español', dir: 'ltr', file: 'es.json' },
      { code: 'fr', iso: 'fr-FR', name: 'Français', dir: 'ltr', file: 'fr.json' },
      { code: 'ru', iso: 'ru',    name: 'Русский', dir: 'ltr', file: 'ru.json' },
      { code: 'de', iso: 'de-DE', name: 'Deutsch', dir: 'ltr', file: 'de.json' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: { useCookie: true, cookieKey: 'i18n_redirected', redirectOn: 'root' },
    lazy: true,
    langDir: resolve('app/locales'),
    vueI18n: resolve('i18n.config.ts'),
  },

  // image, routeRules, nitro… (keep what you already had)
  routeRules: {
    '/': { prerender: true },
    '/products/**': { isr: 60 * 60, headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },
  nitro: { compressPublicAssets: true },
  experimental: { payloadExtraction: true, inlineSSRStyles: true },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
  public: {
    // SEO defaults (used by plugins/seo-defaults.ts)
    siteName: 'Techno Lock Keys',
    siteUrl: process.env.SITE_URL || 'https://www.tlkeys.com',
    defaultOgImage: '/images/og-image.jpg',
    defaultDescription: 'Automotive locksmith tools, remotes, shells, and key programming devices.',

    // Google Tag Manager (used by your GTM plugin + <noscript>)
    gtmId: process.env.NUXT_PUBLIC_GTM_ID || 'GTM-PWSSMVC7',

    // Your existing public keys
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
