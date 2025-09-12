<script setup lang="ts">
// FloatingCoupon.vue
import { onMounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCookie } from '#app'

// Optional (nice DX): use @vueuse/core if you have it installed.
// Fallback to a simple matchMedia if not.
let isDesktop = ref(true)
if (typeof window !== 'undefined') {
  try {
    // If @vueuse/core is available:
    // const { useMediaQuery } = await import('@vueuse/core')
    // isDesktop = useMediaQuery('(min-width: 993px)')
    isDesktop.value = window.matchMedia('(min-width: 993px)').matches
    window.matchMedia('(min-width: 993px)').addEventListener('change', e => {
      isDesktop.value = e.matches
    })
  } catch (_) {
    // no-op
  }
}

const { t, locale } = useI18n({ useScope: 'global' })
const seenCookie = useCookie<string | null>('hasSeenPromo', {
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 1 week
})
const showPromo = ref(false)

// Expose coupon code via prop if you want; hardcode for now:
const COUPON_CODE = 'WELCOME10'

onMounted(() => {
  if (!seenCookie.value) {
    showPromo.value = true
  }
})

function dismissPromo() {
  showPromo.value = false
  seenCookie.value = '1'
}

async function copyCoupon() {
  try {
    await navigator.clipboard.writeText(COUPON_CODE)
    // optional: toast/alert can be triggered here
  } catch {
    // Fallback: select & copy via execCommand (older Safari)
    const el = document.createElement('textarea')
    el.value = COUPON_CODE
    el.setAttribute('readonly', '')
    el.style.position = 'absolute'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

const dirClass = computed(() => (locale.value === 'ar' ? 'ltrClass' : ''))

</script>

<template>
  <ClientOnly>
    <transition name="fade">
      <div
        v-if="showPromo && isDesktop"
        class="coupon-ticket"
        :class="dirClass"
        aria-live="polite"
      >
        <div class="coupon-left">
          <span>{{ t('coupon.label', 'Discount') }}</span>
        </div>

        <div class="coupon-right">
          <div class="coupon-header">{{ t('coupon.title', 'Welcome discount just for you!') }}</div>

          <div class="coupon-center">
            <div class="coupon-code-label">
              {{ t('coupon.useCode', 'Use code') }}
            </div>

            <div class="coupon-code">
              <span class="code-pill animated-pill" @click="copyCoupon">
                {{ COUPON_CODE }}
              </span>
            </div>

            <div class="coupon-note">
              {{ t('coupon.note', 'Click the code to copy. Valid for a limited time.') }}
            </div>
          </div>
        </div>

        <button class="coupon-close" @click="dismissPromo" aria-label="Close">×</button>
      </div>
    </transition>
  </ClientOnly>
</template>

<style scoped>
.coupon-ticket {
  position: fixed;
  bottom: 90px;
  right: 20px;
  display: flex;
  background: #d32f2f;
  color: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(0,0,0,.25);
  width: 260px;
  z-index: 9999;
  font-family: Arial, sans-serif;
  animation: slide-in .4s ease;
}

.coupon-left {
  background: #b71c1c;
  padding: 12px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 11px;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  border-right: 2px dashed #fff;
  letter-spacing: 1px;
}

.coupon-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.coupon-header {
  font-size: 12px;
  font-weight: 600;
  margin: 10px;
  text-align: center;
  line-height: 1.4;
}

.coupon-center {
  display: flex; flex-direction: column; align-items: center;
}

.coupon-code-label { font-size: 12px; margin-bottom: 4px; text-align: center; }

.coupon-code { margin-bottom: 6px; display: flex; flex-direction: column; align-items: center; }

.code-pill {
  background: #4caf50;
  color: #fff;
  font-weight: bold;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 13px;
  box-shadow: 0 1px 4px rgba(0,0,0,.15);
  cursor: pointer;
}

.animated-pill { animation: pulse 1.5s infinite; transition: transform .2s; }
.animated-pill:hover { transform: scale(1.05); }

@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(76,175,80,.5); }
  70%  { box-shadow: 0 0 0 8px rgba(76,175,80,0); }
  100% { box-shadow: 0 0 0 0 rgba(76,175,80,0); }
}

.coupon-note {
  font-size: 11px; color: #f5f5f5; text-align: center; margin-top: 4px;
}

.coupon-close {
  position: absolute; top: 6px; right: 8px;
  background: none; border: none; font-size: 16px; color: #fff;
  cursor: pointer; line-height: 1;
}

@keyframes slide-in {
  from { transform: translateY(30px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* Hide on mobile */
@media (max-width: 992px) {
  .coupon-ticket { display: none !important; }
}

/* simple fade transition */
.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter, .fade-leave-to { opacity: 0; }
</style>
