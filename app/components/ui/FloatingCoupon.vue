<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{
  couponCode?: string
  delayMsMobile?: number
  showOnDesktop?: boolean
  bottomOffsetPx?: number
}>(), {
  couponCode: 'WELCOME10',
  delayMsMobile: 2000,
  showOnDesktop: true,
  bottomOffsetPx: 12,
})

const { t, locale } = useI18n({ useScope: 'global' })

const isMobile = ref(false)
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(max-width: 992px)')
  isMobile.value = mq.matches
  mq.addEventListener?.('change', (e) => (isMobile.value = e.matches))
}

const showFab = ref(false)
const showSheet = ref(false)
const showDesktopCard = ref(false)

const dirClass = computed(() => (locale.value === 'ar' ? 'rtl' : 'ltr'))

onMounted(() => {
  if (isMobile.value) {
    setTimeout(() => (showFab.value = true), props.delayMsMobile)
  } else if (props.showOnDesktop) {
    showDesktopCard.value = true
  }
})

function openSheet() {
  showSheet.value = true
}

function dismissSheet() {
  showSheet.value = false
  showFab.value = true
}

function closeDesktopCard() {
  showDesktopCard.value = false
}

async function copyCoupon() {
  try {
    await navigator.clipboard.writeText(props.couponCode)
  } catch {
    const el = document.createElement('textarea')
    el.value = String(props.couponCode)
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}
</script>

<template>
  <ClientOnly>
    <!-- Desktop card -->
    <transition name="fade">
      <div
        v-if="showDesktopCard && !isMobile"
        class="coupon-desktop-card"
        :class="dirClass"
        aria-live="polite"
      >
        <div class="left-rail">
          <span>{{ t('coupon.label', 'Discount') }}</span>
        </div>
        <div class="content">
          <div class="title">{{ t('coupon.title', 'Welcome discount just for you!') }}</div>
          <div class="center">
            <div class="code-label">{{ t('coupon.useCode', 'Use code') }}</div>
            <button class="code-pill" @click="copyCoupon">{{ props.couponCode }}</button>
            <div class="note">{{ t('coupon.note', 'Click the code to copy. Valid for first order only, on orders over $250.') }}</div>
          </div>
        </div>
        <button class="close" aria-label="Close" @click="closeDesktopCard">×</button>
      </div>
    </transition>

    <!-- Mobile FAB -->
    <transition name="fade">
      <button
        v-if="showFab && isMobile && !showSheet"
        class="coupon-fab"
        :style="{ bottom: `calc(${props.bottomOffsetPx}px + env(safe-area-inset-bottom))` }"
        :class="dirClass"
        aria-label="Open coupon"
        @click="openSheet"
      >
        <span class="fab-text">{{ t('coupon.get', 'Get') }}</span>
        <span class="fab-off">10%</span>
        <span class="fab-text">{{ t('coupon.off', 'OFF') }}</span>
      </button>
    </transition>

    <!-- Mobile bottom sheet -->
    <transition name="slide-up">
      <div v-if="showSheet && isMobile" class="sheet-backdrop" @click.self="dismissSheet">
        <section class="sheet" :class="dirClass" role="dialog" aria-modal="true">
          <header class="sheet-header">
            <h3 class="sheet-title">{{ t('coupon.title', 'Welcome discount just for you!') }}</h3>
            <button class="sheet-close" aria-label="Close" @click="dismissSheet">×</button>
          </header>

          <div class="sheet-body">
            <p class="sheet-line">{{ t('coupon.line1', 'Use this code at checkout:') }}</p>
            <button class="code-big" @click="copyCoupon">{{ props.couponCode }}</button>
            <p class="sheet-note">{{ t('coupon.note', 'Valid for first order only, on minimum orders of $250. Tap the code to copy.') }}</p>
          </div>

          <footer class="sheet-footer">
            <button class="sheet-cta" @click="dismissSheet">{{ t('coupon.ok', 'Got it') }}</button>
          </footer>
        </section>
      </div>
    </transition>
  </ClientOnly>
</template>

<style scoped>
/* --- Transitions --- */
.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active {
  transition: transform .28s ease, opacity .2s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active, .fade-leave-active,
  .slide-up-enter-active, .slide-up-leave-active { transition: none !important; }
}

/* --- Desktop card (optional) --- */
.coupon-desktop-card {
  position: fixed;
  right: 20px;
  bottom: 90px;
  display: flex;
  width: 260px;
  background: #d32f2f;
  color: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(0,0,0,.25);
  z-index: 9999;
}
.coupon-desktop-card .left-rail {
  background: #b71c1c;
  padding: 12px 10px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 11px; text-transform: uppercase;
  writing-mode: vertical-rl;
  border-right: 2px dashed #fff;
  letter-spacing: 1px;
}
.coupon-desktop-card .content { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.coupon-desktop-card .title { font-size: 12px; font-weight: 600; margin: 10px; text-align: center; line-height: 1.4; }
.coupon-desktop-card .center { display: flex; flex-direction: column; align-items: center; margin-bottom: 8px; }
.coupon-desktop-card .code-label { font-size: 12px; margin-bottom: 4px; }
.coupon-desktop-card .code-pill { background: #4caf50; color: #fff; font-weight: 700; padding: 5px 14px; border-radius: 20px; font-size: 13px; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
.coupon-desktop-card .note { font-size: 11px; color: #f5f5f5; text-align: center; margin-top: 6px; }
.coupon-desktop-card .close { position: absolute; top: 6px; right: 8px; background: none; border: none; font-size: 16px; color: #fff; cursor: pointer; line-height: 1; }

/* --- Mobile centered FAB pill --- */
.coupon-fab {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  /* bottom is set via inline style to allow prop control + safe areas */
  z-index: 10000;
  border: none;
  border-radius: 999px;
  padding: 8px 12px;
  background: #111;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  box-shadow: 0 6px 18px rgba(0,0,0,.3);
  display: inline-flex; align-items: baseline; gap: 6px;
  opacity: .95;
}
.coupon-fab .fab-off { background: #4caf50; color: #fff; border-radius: 999px; padding: 2px 8px; font-size: 12px; line-height: 1; }
.coupon-fab:active { transform: translateX(-50%) translateY(1px); }

/* --- Mobile bottom sheet --- */
.sheet-backdrop {
  position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,.35);
  display: flex; align-items: flex-end; /* bottom sheet */
}
.sheet {
  width: 100%;
  background: #fff;
  border-top-left-radius: 16px; border-top-right-radius: 16px;
  box-shadow: 0 -6px 24px rgba(0,0,0,.2);
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
}
.sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 8px; }
.sheet-title { font-size: 16px; font-weight: 700; color: #111; margin: 0; }
.sheet-close { background: none; border: none; font-size: 22px; line-height: 1; padding: 6px; color: #333; }
.sheet-body { padding: 0 14px 10px; text-align: center; }
.sheet-line { font-size: 14px; color: #333; margin: 0 0 8px; }
.code-big { display: inline-block; background: #111; color: #fff; border: 0; border-radius: 12px; padding: 10px 16px; font-weight: 800; font-size: 16px; letter-spacing: .5px; }
.sheet-note { font-size: 12px; color: #666; margin-top: 8px; }
.sheet-footer { padding: 8px 14px 12px; }
.sheet-cta { width: 100%; background: #4caf50; color: #fff; border: 0; border-radius: 12px; padding: 10px 14px; font-weight: 800; font-size: 15px; }

</style>