<template>
  <template v-if="!isMobile">
    
    <div v-if="!isAdvisoryClosed" class="shipping-advisory desktop-advisory">
      <div class="container-fluid">
        <div class="advisory-content">
          <p class="advisory-text">
            <strong>{{ $t('shipping_advisory.title') }}</strong>
            {{ $t('shipping_advisory.text') }}
          </p>
          <button @click="closeAdvisory" class="close-btn" aria-label="Close">
            ✕
          </button>
        </div>
      </div>
    </div>

    <header>
      <HeaderTopBar />
      <HeaderMiddle />
    </header>
    <HeaderMainNav />
  </template>

  <template v-else>
    <HeaderMiddleMobile />

    <div v-if="!isAdvisoryClosed" class="shipping-advisory mobile-advisory">
      <div class="container-fluid">
        <div class="advisory-content">
          <p class="advisory-text">
            <strong>{{ $t('shipping_advisory.title') }}</strong>
            {{ $t('shipping_advisory.text') }}
          </p>
          <button @click="closeAdvisory" class="close-btn" aria-label="Close">
            ✕
          </button>
        </div>
      </div>
    </div>

    <MobileBottomAppModal />
  </template>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRequestHeaders, useCookie } from '#app'

import HeaderTopBar from '~/components/header/HeaderTopBar.vue'
import HeaderMiddle from '~/components/header/HeaderMiddle.vue'
import HeaderMainNav from '~/components/header/HeaderMainNav.vue'
import HeaderMiddleMobile from '~/components/header/mobile/HeaderMiddleMobile.vue'
import MobileBottomAppModal from './header/mobile/MobileBottomAppModal.vue'

// --- ADVISORY LOGIC ---
const isAdvisoryClosed = useCookie('shipping_advisory_closed', {
  maxAge: 60 * 60 * 24 * 7,
  default: () => false
})

const closeAdvisory = () => {
  isAdvisoryClosed.value = true
}

// --- MOBILE DETECTION ---
const BREAKPOINT = 992
const MOBILE_UA = /(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini)/i

// Always use UA for the initial value — consistent between SSR and first client render
const headers = useRequestHeaders(['user-agent'])
const uaIsMobile = MOBILE_UA.test(headers['user-agent'] || '')

const isMobile = ref<boolean>(uaIsMobile)

// Only sync to matchMedia AFTER hydration to avoid SSR mismatch flash
let mq: MediaQueryList | null = null

onMounted(() => {
  mq = window.matchMedia(`(max-width: ${BREAKPOINT}px)`)

  const apply = () => { isMobile.value = mq!.matches }

  // Only update if matchMedia disagrees with UA (e.g. desktop browser resized narrow)
  if (mq.matches !== uaIsMobile) {
    apply()
  }

  if ('addEventListener' in mq) mq.addEventListener('change', apply)
  else (mq as any).addListener(apply)

  onBeforeUnmount(() => {
    if (!mq) return
    if ('removeEventListener' in mq) mq.removeEventListener('change', apply)
    else (mq as any).removeListener(apply)
  })
})
</script>

<style scoped>
/* --- BANNER STYLES --- */
.shipping-advisory {
  background-color: #f8f9fa;
  color: #333333;
  border-bottom: 1px solid #e9ecef;
  font-size: 16px;
  line-height: 1.4;
  position: relative;
  z-index: 10;
}

.container-fluid {
  padding: 0 15px;
}

.advisory-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 0;
  max-width: 1200px;
  margin: 0 auto;
}

.advisory-text {
  margin: 0;
  padding-right: 15px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #999;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
}
.close-btn:hover {
  color: #333;
}

.mobile-advisory {
  position: relative;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* RTL Support for Arabic */
[dir="rtl"] .advisory-text {
  padding-right: 0;
  padding-left: 15px;
}
</style>