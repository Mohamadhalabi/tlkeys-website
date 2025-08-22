<template>
  <!-- Desktop (>= 993px) -->
  <template v-if="!isMobile">
    <header>
      <HeaderTopBar />
      <HeaderMiddle />
    </header>

    <!-- main sticky -->
    <HeaderMainNav />

    <!-- secondary bar directly -->
    <SecondaryStickyBar />
  </template>

  <!-- Mobile (< 993px) -->
  <template v-else>
    <HeaderTopBarMobile />
    <HeaderMiddleMobile />
    <HeaderMobileNav />
  </template>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import HeaderTopBar from '~/components/header/HeaderTopBar.vue'
import HeaderMiddle from '~/components/header/HeaderMiddle.vue'
import HeaderMainNav from '~/components/header/HeaderMainNav.vue'
import SecondaryStickyBar from '~/components/header/SecondaryStickyBar.vue'  // 👈 add this
import HeaderTopBarMobile from '~/components/header/mobile/HeaderTopBarMobile.vue'
import HeaderMiddleMobile from '~/components/header/mobile/HeaderMiddleMobile.vue'
import HeaderMobileNav from '~/components/header/mobile/HeaderMobileNav.vue'

const isMobile = ref(false)
const onResize = () => { isMobile.value = window.innerWidth < 993 }
onMounted(() => { onResize(); window.addEventListener('resize', onResize) })
onUnmounted(() => window.removeEventListener('resize', onResize))
</script>
