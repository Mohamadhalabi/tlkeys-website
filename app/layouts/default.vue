<template>
  <div class="flex flex-col min-h-screen">
    <!-- Header -->
     <ClientOnly>
          <Header />
     </ClientOnly>

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

<script setup>
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
</script>