<template>
  <div class="flex flex-col min-h-screen">
    <!-- Header -->
    <Header />

    <!-- Main -->
    <main class="flex-1 ">
      <slot />
    </main>

    <!-- Footer -->
    <Footer :links="[
      { label: 'About Us', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Delivery Info', to: '/deliveryinfo' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms And Conditions', to: '/terms' },
      { label: 'Return Policy', to: '/return-policy' },
    ]" />

  </div>
</template>

<script setup lang="ts">
import { useHead } from '#imports'
import { useI18n, useSwitchLocalePath } from '#imports'

const { locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const baseUrl = 'https://www.tlkeys.com'
const defaultLocale = 'en' // your default

// Exactly how you want each hreflang rendered:
const desiredHreflang: Record<string, string> = {
  en: 'en',     // language-only
  ar: 'ar',     // language-only
  es: 'es-ES',
  fr: 'fr-FR',
  tr: 'tr-TR',
  ru: 'ru-RU',
  it: 'it-IT',
  de: 'de-DE',
}

// join base + path with NO trailing slash (except we remove it even for root)
function joinClean(base: string, path: string) {
  // `switchLocalePath('en')` returns "/" for default; make it empty
  const cleaned =
    path === '/'
      ? ''
      : path.replace(/\/+$/, '') // strip trailing slash for non-root
  return `${base}${cleaned}`
}

useHead({
  link: [
    // one <link rel="alternate"> per locale in your desired format
    ...locales.value.map((loc: any) => {
      const code = String(loc.code)
      const hreflang = desiredHreflang[code] || loc.iso || code
      const href = joinClean(baseUrl, switchLocalePath(code))
      return {
        rel: 'alternate',
        hreflang,
        href,
      }
    }),
    // x-default should mirror EN (no trailing slash)
    {
      rel: 'alternate',
      hreflang: 'x-default',
      href: joinClean(baseUrl, switchLocalePath(defaultLocale)),
    },
  ],
})
</script>

