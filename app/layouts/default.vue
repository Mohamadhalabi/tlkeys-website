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
const defaultLocale = 'en' // you want x-default to always be English

useHead({
  link: [
    // One <link rel="alternate"> per locale
    ...locales.value.map((loc: any) => ({
      rel: 'alternate',
      hreflang: loc.iso || loc.code,               // e.g. en-US, fr-FR, ar-SA...
      href: `${baseUrl}${switchLocalePath(loc.code)}`, // correct path for that locale
    })),
    // x-default should point to EN
    {
      rel: 'alternate',
      hreflang: 'x-default',
      href: `${baseUrl}${switchLocalePath(defaultLocale)}`
    }
  ]
})
</script>
