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
import { useHead, useRoute } from '#imports'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { locale, locales, t } = useI18n()

const baseUrl = 'https://www.tlkeys.com'

useHead({
  link: locales.value.map((loc: any) => {
    const prefix = loc.code === 'en' ? '' : `/${loc.code}`
    return {
      rel: 'alternate',
      hreflang: loc.iso || loc.code,
      href: `${baseUrl}${prefix}${route.fullPath}`
    }
  }).concat([
    {
      rel: 'alternate',
      hreflang: 'x-default',
      href: `${baseUrl}${route.fullPath}`
    }
  ])
})
</script>
