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
import { useHead } from '#imports'
import FloatingCoupon from '~/components/ui/FloatingCoupon.vue'
const { locale, localeProperties } = useI18n()


useHead({
  // Fix <html lang> and dir per active locale
  htmlAttrs: {
    lang: computed(() => String(locale.value || 'en')),
    dir: computed(() => localeProperties.value.dir || 'ltr'),
  },
  // link: altLinks,
})
</script>
