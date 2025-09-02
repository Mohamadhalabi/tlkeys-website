<template>
  <!-- Desktop (>= 993px) -->
  <template v-if="!isMobile">
    <header>
      <HeaderTopBar />
      <HeaderMiddle />
    </header>
    <!-- <HeaderMainNav /> -->
    <!-- <SecondaryStickyBar /> -->
  </template>

  <!-- Mobile (< 993px) -->
  <template v-else>
      <!-- <HeaderTopBar  /> -->
    <HeaderMiddleMobile />
  </template>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useRequestHeaders } from '#app' // SSR: read request headers

import HeaderTopBar from '~/components/header/HeaderTopBar.vue'
import HeaderMiddle from '~/components/header/HeaderMiddle.vue'
import HeaderMainNav from '~/components/header/HeaderMainNav.vue'
import SecondaryStickyBar from '~/components/header/SecondaryStickyBar.vue'
import HeaderMiddleMobile from '~/components/header/mobile/HeaderMiddleMobile.vue'

/** Use the same cutoff you use in CSS: < 993px is mobile */
const BREAKPOINT = 992

/** Basic UA test for SSR */
const MOBILE_UA = /(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini)/i

// 1) Decide on the server using the request's User-Agent (prevents flicker)
const ssrIsMobile = process.server
  ? MOBILE_UA.test((useRequestHeaders()['user-agent'] || ''))
  : window.matchMedia(`(max-width: ${BREAKPOINT}px)`).matches

// 2) Keep it reactive on the client using matchMedia
const isMobile = ref<boolean>(ssrIsMobile)

if (process.client) {
  const mq = window.matchMedia(`(max-width: ${BREAKPOINT}px)`)
  const apply = () => { isMobile.value = mq.matches }
  apply()
  // Safari < 14 fallback
  if ('addEventListener' in mq) mq.addEventListener('change', apply)
  else (mq as any).addListener(apply)

  onBeforeUnmount(() => {
    if ('removeEventListener' in mq) mq.removeEventListener('change', apply)
    else (mq as any).removeListener(apply)
  })
}
</script>
