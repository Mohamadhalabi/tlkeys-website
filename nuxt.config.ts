import { fileURLToPath } from 'url'

export default defineNuxtConfig({
  srcDir: 'app',
  pages: true,
  modules: ['@nuxtjs/tailwindcss','@nuxtjs/i18n','@nuxt/image','@pinia/nuxt'],
  css: [
    fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url)),          // 👈 add this
    fileURLToPath(new URL('./app/assets/css/common.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/layout-default.css', import.meta.url)),
    fileURLToPath(new URL('./app/assets/css/layout-header.css', import.meta.url)), // if you need it
  ],
  
  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', file: 'en.json', name: 'English', dir: 'ltr' },
      { code: 'ar', iso: 'ar',     file: 'ar.json', name: 'العربية', dir: 'rtl' }
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',

    // 🔥 absolute path to app/locales
    langDir: fileURLToPath(new URL('./app/locales', import.meta.url)),

    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      alwaysRedirect: false,
      fallbackLocale: 'en'
    },

    // path to your i18n config file in project root
    vueI18n: './i18n.config.ts'
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      SECRET_KEY: process.env.SECRET_KEY,
      API_KEY: process.env.API_KEY,
      API_BASE_URL: process.env.API_BASE_URL, // match key name & case
      PUBLIC_PATH: process.env.PUBLIC_PATH,
      PUBLIC_PATH_WITHOUT_SLASH: process.env.PUBLIC_PATH_WITHOUT_SLASH,
      version: process.env.version,
      host: process.env.host
    }
  }
})
