<template>
  <div class="flex flex-col min-h-screen">
    <Header />
    <main class="flex-1">
      <slot />
    </main>
        <FloatingCoupon />
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
import { computed } from 'vue'
import { useHead, useRuntimeConfig, useRoute } from '#imports'
import { useI18n, useSwitchLocalePath } from '#imports'
import FloatingCoupon from '~/components/ui/FloatingCoupon.vue'
const route = useRoute()
const { locales, locale, localeProperties } = useI18n()
const switchLocalePath = useSwitchLocalePath()

// Use SITE_URL (from .env) so it works on localhost and prod
const { public: { siteUrl: cfgSiteUrl } } = useRuntimeConfig()
const baseUrl = (cfgSiteUrl || 'http://127.0.0.1:4000').replace(/\/+$/, '')
const defaultLocale = 'en'

// Desired hreflang codes per locale
const desiredHreflang: Record<string, string> = {
  en: 'en',
  ar: 'ar',
  es: 'es',
  fr: 'fr',
  ru: 'ru',
  de: 'de',
}

// Join base + path with NO trailing slash (except root)
function joinClean(base: string, path: string) {
  const cleaned = path === '/' ? '' : path.replace(/\/+$/, '')
  return `${base}${cleaned}`
}

// Build rel="alternate" for this exact page in every locale
const altLinks = computed(() => [
  ...locales.value.map((loc: any) => {
    const code = String(loc.code)
    const hreflang = desiredHreflang[code] || loc.iso || code
    const path = switchLocalePath(code, route as any)
    return { rel: 'alternate', hreflang, href: joinClean(baseUrl, path) }
  }),
  {
    rel: 'alternate',
    hreflang: 'x-default',
    href: joinClean(baseUrl, switchLocalePath(defaultLocale, route as any)),
  },
])

useHead({
  // Fix <html lang> and dir per active locale
  htmlAttrs: {
    lang: computed(() => String(locale.value || 'en')),
    dir: computed(() => localeProperties.value.dir || 'ltr'),
  },
  link: altLinks,
})
</script>
