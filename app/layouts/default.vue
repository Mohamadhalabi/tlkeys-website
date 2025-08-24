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
      { label: 'About Us', to: '/about-us' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Delivery Info', to: '/delivery-info' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms And Conditions', to: '/terms-and-conditions' },
      { label: 'Return Policy', to: '/return-policy' },
    ]" />

  </div>
</template>

<script setup>
import Header from '~/components/Header.vue'
import Footer from '~/components/Footer.vue'
</script>