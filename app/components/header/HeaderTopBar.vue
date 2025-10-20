<template>
  <div class="header-topbar bg-gray-100 text-sm py-2">
    <div class="container mx-auto flex justify-between items-center px-4">
      <!-- Left: Swapping Text -->
      <div class="flex items-center h-5 overflow-hidden">
        <transition name="fade" mode="out-in">
          <span
            v-if="isVisible"
            :key="currentMessageKey"
            class="text-gray-700 font-medium transition-opacity duration-500"
          >
            {{ currentMessage }}
          </span>
        </transition>
      </div>

      <!-- Right: WhatsApp, Currency, Language -->
      <div class="flex items-center text-sm text-gray-700 gap-3">
        <!-- WhatsApp -->
        <a
          href="https://wa.me/971504429045"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-1.5 text-green-600 hover:text-green-700"
          aria-label="WhatsApp us"
        >
          <!-- WhatsApp icon (as-is) -->
          <svg id='WhatsApp_32' width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'><rect width='32' height='32' stroke='none' fill='#000000' opacity='0'/>
          <g transform="matrix(0.58 0 0 0.58 16 16)" >
          <g style="" >
          <g transform="matrix(1 0 0 1 -0.07 0.15)" >
          <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" transform=" translate(-23.93, -24.15)" d="M 4.868 43.303 L 7.562 33.467999999999996 C 5.9 30.59 5.026 27.324 5.027 23.979 C 5.032 13.514 13.548 5 24.014 5 C 29.093 5.002 33.859 6.979 37.444 10.565999999999999 C 41.028000000000006 14.154 43.002 18.921999999999997 43 23.994 C 42.996 34.459 34.478 42.974000000000004 24.014 42.974000000000004 C 24.012999999999998 42.974000000000004 24.014 42.974000000000004 24.014 42.974000000000004 L 24.006 42.974000000000004 C 20.829 42.973000000000006 17.706 42.176 14.933 40.663000000000004 L 4.868 43.303 z" stroke-linecap="round" />
          </g>
          <g transform="matrix(1 0 0 1 -0.07 0.15)" >
          <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" transform=" translate(-23.93, -24.15)" d="M 4.868 43.803 C 4.736000000000001 43.803 4.6080000000000005 43.751 4.513 43.654999999999994 C 4.388 43.52799999999999 4.3389999999999995 43.342999999999996 4.386 43.172 L 7.025 33.536 C 5.389 30.630000000000003 4.526 27.330000000000002 4.5280000000000005 23.980000000000004 C 4.532 13.238 13.273 4.5 24.014 4.5 C 29.224 4.502 34.119 6.531000000000001 37.798 10.213000000000001 C 41.477000000000004 13.896 43.502 18.79 43.5 23.994 C 43.496 34.735 34.754 43.474000000000004 24.014 43.474000000000004 C 20.825 43.473000000000006 17.669999999999998 42.68600000000001 14.87 41.197 L 4.994999999999999 43.786 C 4.953 43.798 4.911 43.803 4.868 43.803 z" stroke-linecap="round" />
          </g>
          <g transform="matrix(1 0 0 1 -0.07 0.15)" >
          <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(207,216,220); fill-rule: nonzero; opacity: 1;" transform=" translate(-23.93, -24.15)" d="M 24.014 5 C 29.093 5.002 33.859 6.979 37.444 10.565999999999999 C 41.028000000000006 14.154 43.002 18.921999999999997 43 23.994 C 42.996 34.459 34.478 42.974000000000004 24.014 42.974000000000004 L 24.006 42.974000000000004 C 20.829 42.973000000000006 17.706 42.176 14.933 40.663000000000004 L 4.868 43.303 L 7.562 33.467999999999996 C 5.9 30.59 5.026 27.324 5.027 23.979 C 5.032 13.514 13.548 5 24.014 5 M 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 M 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 M 24.014 4 C 24.014 4 24.014 4 24.014 4 C 12.998 4 4.032 12.962 4.027 23.979 C 4.026 27.346 4.876 30.663999999999998 6.4879999999999995 33.601 L 3.9029999999999996 43.04 C 3.8089999999999997 43.385 3.9049999999999994 43.753 4.157 44.007 C 4.347 44.199 4.604 44.303999999999995 4.868 44.303999999999995 C 4.953 44.303999999999995 5.038 44.29299999999999 5.122 44.270999999999994 L 14.809 41.730999999999995 C 17.637 43.199 20.807 43.974 24.006 43.974999999999994 C 35.03 43.974999999999994 43.995999999999995 35.01199999999999 44.001000000000005 23.994999999999994 C 44.00300000000001 18.65599999999999 41.926 13.635999999999994 38.153000000000006 9.859999999999994 C 34.378 6.083 29.357 4.002 24.014 4 L 24.014 4 z" stroke-linecap="round" />
          </g>
          <g transform="matrix(1 0 0 1 0.01 -0.01)" >
          <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(64,195,81); fill-rule: nonzero; opacity: 1;" transform=" translate(-24.01, -23.99)" d="M 35.176 12.832 C 32.196000000000005 9.850000000000001 28.235000000000003 8.207 24.019000000000002 8.206 C 15.315000000000001 8.206 8.236000000000002 15.282 8.232000000000001 23.979999999999997 C 8.231000000000002 26.961 9.065000000000001 29.862999999999996 10.645000000000001 32.376 L 11.021 32.973 L 9.426 38.794 L 15.399000000000001 37.227999999999994 L 15.976 37.56999999999999 C 18.398 39.007999999999996 21.176000000000002 39.767999999999994 24.008000000000003 39.76899999999999 L 24.014000000000003 39.76899999999999 C 32.712 39.76899999999999 39.791000000000004 32.69199999999999 39.794000000000004 23.99299999999999 C 39.795 19.778 38.156 15.814 35.176 12.832 z" stroke-linecap="round" />
          </g>
          <g transform="matrix(1 0 0 1 0.01 0.16)" >
          <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: evenodd; opacity: 1;" transform=" translate(-24.01, -24.16)" d="M 19.268 16.045 C 18.913 15.255000000000003 18.539 15.239 18.2 15.225000000000001 C 17.923 15.213000000000001 17.607 15.214000000000002 17.291 15.214000000000002 C 16.975 15.214000000000002 16.461000000000002 15.333000000000002 16.026 15.808000000000002 C 15.591 16.283 14.365 17.430000000000003 14.365 19.764000000000003 C 14.365 22.098000000000003 16.065 24.354000000000003 16.302 24.67 C 16.538999999999998 24.986 19.584 29.929000000000002 24.406 31.831000000000003 C 28.412999999999997 33.411 29.229 33.097 30.098999999999997 33.018 C 30.968999999999998 32.939 32.906 31.871000000000002 33.300999999999995 30.763 C 33.696 29.655 33.696 28.706000000000003 33.577999999999996 28.508000000000003 C 33.458999999999996 28.310000000000002 33.142999999999994 28.192000000000004 32.669 27.954000000000004 C 32.195 27.716000000000005 29.862 26.569000000000003 29.426999999999996 26.411000000000005 C 28.991999999999997 26.253000000000004 28.675999999999995 26.174000000000007 28.358999999999995 26.649000000000004 C 28.042999999999996 27.123000000000005 27.133999999999993 28.192000000000004 26.856999999999996 28.508000000000003 C 26.579999999999995 28.825000000000003 26.302999999999997 28.865000000000002 25.828999999999997 28.627000000000002 C 25.354999999999997 28.389000000000003 23.826999999999998 27.889000000000003 22.013999999999996 26.273000000000003 C 20.603999999999996 25.016000000000002 19.651999999999994 23.463000000000005 19.374999999999996 22.988000000000003 C 19.097999999999995 22.514000000000003 19.344999999999995 22.257 19.582999999999995 22.020000000000003 C 19.795999999999996 21.807000000000002 20.056999999999995 21.466000000000005 20.294999999999995 21.189000000000004 C 20.531999999999993 20.912000000000003 20.610999999999994 20.714000000000002 20.768999999999995 20.398000000000003 C 20.926999999999996 20.081000000000003 20.847999999999995 19.804000000000002 20.728999999999996 19.567000000000004 C 20.612 19.329 19.69 16.983 19.268 16.045 z" stroke-linecap="round" />
          </g>
          </g>
          </g>
          </svg>
          <span class="font-medium">+971504429045</span>
        </a>

        <span class="text-gray-300">|</span>

        <!-- Currency -->
        <select
          v-model="selectedCurrency"
          @change="onCurrencyChange"
          class="border border-gray-300 rounded px-2 py-1 bg-white text-sm focus:outline-none"
        >
          <option v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</option>
        </select>

        <span class="text-gray-300">|</span>

        <!-- Language (custom dropdown with SVG flags) -->
        <div class="relative" ref="langMenuRef">
          <button
            @click="openLang = !openLang"
            class="flex items-center gap-2 border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-50"
            aria-haspopup="listbox"
            :aria-expanded="openLang ? 'true' : 'false'"
          >
            <span class="inline-flex items-center">
              <span class="mr-1" v-html="flagSvg(currentLang.country)"></span>
              <span class="font-medium uppercase">{{ currentLang.code }}</span>
            </span>
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path d="M5 7l5 5 5-5H5z" fill="currentColor"/>
            </svg>
          </button>

          <ul
            v-if="openLang"
            class="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-60 overflow-hidden"
            role="listbox"
            tabindex="-1"
          >
            <li
              v-for="l in languages"
              :key="l.code"
              role="option"
              @click="switchLang(l.code)"
              class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <span v-html="flagSvg(l.country)"></span>
              <span class="font-medium">{{ l.label }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSwitchLocalePath } from '#i18n'
import { useCurrency, type CurrencyCode } from '~/composables/useCurrency'

/** Locales we support */
type LocaleCode = 'en' | 'ar' | 'es' | 'fr' | 'ru' | 'de' | 'tr'
type CountryCode = 'US' | 'SA' | 'ES' | 'FR' | 'RU' | 'DE' | 'TR'

const languages: Array<{ code: LocaleCode; label: string; country: CountryCode; dir: 'ltr' | 'rtl' }> = [
  { code: 'en', label: 'English', country: 'US', dir: 'ltr' },
  { code: 'ar', label: 'العربية', country: 'SA', dir: 'rtl' },
  { code: 'es', label: 'Español', country: 'ES', dir: 'ltr' },
  { code: 'fr', label: 'Français', country: 'FR', dir: 'ltr' },
  { code: 'ru', label: 'Русский', country: 'RU', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', country: 'DE', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe', country: 'TR', dir: 'ltr' } // ✅ Added Turkish
]

/** i18n */
const { t, locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

/** Currency (SSR-safe via cookie+state) */
const { currency, setCurrency, options: currencyOptions } = useCurrency()
const selectedCurrency = ref<CurrencyCode>(currency.value)
const onCurrencyChange = () => {
  setCurrency(selectedCurrency.value)
  refreshNuxtData()
  window.location.reload()
}

/** Language dropdown state */
const openLang = ref(false)
const langMenuRef = ref<HTMLElement | null>(null)
const currentLang = computed(
  () => languages.find((l) => l.code === (locale.value as LocaleCode)) ?? languages[0]
)

// Close the dropdown when clicking outside
const onDocClick = (e: MouseEvent) => {
  if (!langMenuRef.value) return
  if (!langMenuRef.value.contains(e.target as Node)) openLang.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

async function switchLang(code: LocaleCode) {
  if (code === (locale.value as LocaleCode)) {
    openLang.value = false
    return
  }
  const path = switchLocalePath(code)
  if (!path) return
  openLang.value = false
  await navigateTo(path, { replace: true })
  await refreshNuxtData()
  if (process.client) {
    document.documentElement.setAttribute('dir', languages.find((l) => l.code === code)?.dir ?? 'ltr')
  }
}

/** Swapping topbar messages */
const currentMessage = ref<string>('')
const currentMessageKey = computed<string>(() => currentMessage.value ?? '')
const isVisible = ref(true)
const keys: string[] = ['shippingMessages.0', 'shippingMessages.1']
let idx = 0
let timer: ReturnType<typeof setInterval> | undefined

function cycleOnce() {
  isVisible.value = false
  setTimeout(() => {
    idx = (idx + 1) % keys.length
    currentMessage.value = String(t(keys[idx]))
    isVisible.value = true
  }, 300)
}

onMounted(() => {
  selectedCurrency.value = currency.value
  currentMessage.value = String(t(keys[idx]))
  timer = setInterval(cycleOnce, 4000)
  if (process.client) {
    document.documentElement.setAttribute('dir', currentLang.value.dir)
  }
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

watch(() => locale.value, () => {
  currentMessage.value = String(t(keys[idx]))
})

/** Tiny inline flag SVGs */
function flagSvg(country: CountryCode) {
  switch (country) {
    case 'US':
      return `<svg width="18" height="12" viewBox="0 0 36 24"><rect width="36" height="24" fill="#b22234"/><g fill="#fff"><rect y="3" width="36" height="3"/><rect y="9" width="36" height="3"/><rect y="15" width="36" height="3"/><rect y="21" width="36" height="3"/></g><rect width="16" height="12" fill="#3c3b6e"/></svg>`
    case 'SA':
      return `<svg width="18" height="12" viewBox="0 0 36 24"><rect width="36" height="24" fill="#007a3d"/></svg>`
    case 'ES':
      return `<svg width="18" height="12" viewBox="0 0 36 24"><rect width="36" height="24" fill="#aa151b"/><rect y="6" width="36" height="12" fill="#f1bf00"/></svg>`
    case 'FR':
      return `<svg width="18" height="12" viewBox="0 0 36 24"><rect width="12" height="24" fill="#0055a4"/><rect x="12" width="12" height="24" fill="#fff"/><rect x="24" width="12" height="24" fill="#ef4135"/></svg>`
    case 'RU':
      return `<svg width="18" height="12" viewBox="0 0 36 24"><rect width="36" height="8" fill="#fff"/><rect y="8" width="36" height="8" fill="#0039a6"/><rect y="16" width="36" height="8" fill="#d52b1e"/></svg>`
    case 'DE':
      return `<svg width="18" height="12" viewBox="0 0 36 24"><rect width="36" height="8" fill="#000"/><rect y="8" width="36" height="8" fill="#dd0000"/><rect y="16" width="36" height="8" fill="#ffce00"/></svg>`
    case 'TR':
      return `<svg width="18" height="12" viewBox="0 0 36 24"><rect width="36" height="24" fill="#e30a17"/><circle cx="13" cy="12" r="5" fill="#fff"/><circle cx="14.5" cy="12" r="3.2" fill="#e30a17"/><polygon fill="#fff" points="18,12 21.5,13.8 20.2,10.2 22.5,8 19,8 18,4.5 17,8 13.5,8 15.8,10.2 14.5,13.8"/></svg>`
  }
}
</script>


<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.z-60{
  z-index: 60;
}
</style>
