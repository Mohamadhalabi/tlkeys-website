<template>
  <header>
    <!-- Desktop (>= 993px) -->
    <template v-if="!isMobile">
      <HeaderTopBar />
      <HeaderMiddle />
      <HeaderMainNav />
    </template>

    <!-- Mobile (< 993px) -->
    <template v-else>
      <HeaderTopBarMobile />
      <HeaderMiddleMobile />
      <HeaderMobileNav />
    </template>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// ✅ Desktop components
import HeaderTopBar from '~/components/header/HeaderTopBar.vue'
import HeaderMiddle from '~/components/header/HeaderMiddle.vue'
import HeaderMainNav from '~/components/header/HeaderMainNav.vue'

// ✅ Mobile components (fixed path)
import HeaderTopBarMobile from '~/components/header/mobile/HeaderTopBarMobile.vue'
import HeaderMiddleMobile from '~/components/header/mobile/HeaderMiddleMobile.vue'
import HeaderMobileNav from '~/components/header/mobile/HeaderMobileNav.vue'

// Track viewport width
const isMobile = ref(false)

onMounted(() => {
  const checkViewport = () => {
    isMobile.value = window.innerWidth < 993
  }
  checkViewport()
  window.addEventListener('resize', checkViewport)
})
</script>

<style scoped>
.group:hover .group-hover\:opacity-100 {
  pointer-events: auto;
}
</style>
