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
          <svg id="WhatsApp_32" width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" fill="none" opacity="0"/>
            <g transform="matrix(0.58 0 0 0.58 16 16)">
              <g transform="matrix(1 0 0 1 0.01 -0.01)">
                <path fill="#40c351" d="M35.176 12.832C32.196 9.85 28.235 8.207 24.019 8.206 15.315 8.206 8.236 15.282 8.232 23.98c0 2.981.833 5.883 2.413 8.397l.376.597-1.596 5.821 5.973-1.566.577.343c2.422 1.438 5.2 2.198 8.032 2.199h.006c8.698 0 15.777-7.077 15.78-15.774 0-4.214-1.64-8.178-4.62-11.16z"/>
              </g>
              <g transform="matrix(1 0 0 1 0.01 0.16)">
                <path fill="#fff" fill-rule="evenodd" d="M19.268 16.045c-.355-.79-.729-.806-1.068-.82-.277-.012-.593-.011-.909-.011s-.83.119-1.265.594c-.435.475-1.661 1.622-1.661 3.956s1.7 3.59 1.937 3.906c.237.316 3.283 5.259 8.105 7.161 4.007 1.58 4.823 1.266 5.693 1.187.871-.079 2.808-1.147 3.203-2.255.396-1.108.396-2.057.278-2.255-.119-.198-.435-.316-.908-.554-.474-.238-2.807-1.385-3.242-1.543-.435-.158-.751-.237-1.068.238-.316.474-1.224 1.543-1.501 1.859-.277.317-.554.357-1.027.119-.474-.238-2.001-.739-3.814-2.355-1.41-1.257-2.362-2.81-2.639-3.285-.277-.474-.03-.731.208-.968.213-.213.474-.554.712-.831.237-.277.316-.475.474-.791.158-.317.079-.594-.04-.831-.116-.238-1.038-2.584-1.46-3.522z"/>
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
type LocaleCode = 'en' | 'ar' | 'es' | 'fr' | 'ru' | 'de'
type CountryCode = 'US' | 'SA' | 'ES' | 'FR' | 'RU' | 'DE'

const languages: Array<{ code: LocaleCode; label: string; country: CountryCode; dir: 'ltr'|'rtl' }> = [
  { code: 'en', label: 'English',  country: 'US', dir: 'ltr' },
  { code: 'ar', label: 'العربية',  country: 'SA', dir: 'rtl' },
  { code: 'es', label: 'Español',  country: 'ES', dir: 'ltr' },
  { code: 'fr', label: 'Français', country: 'FR', dir: 'ltr' },
  { code: 'ru', label: 'Русский',  country: 'RU', dir: 'ltr' },
  { code: 'de', label: 'Deutsch',  country: 'DE', dir: 'ltr' },
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
const currentLang = computed(() => languages.find(l => l.code === (locale.value as LocaleCode)) ?? languages[0])

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
  // Navigate to the same route but with the new locale prefix (e.g., /ar/...)
  await navigateTo(path, { replace: true })
  // Optional: refresh data after switching language without a hard reload
  await refreshNuxtData()
  // Update page direction for RTL languages
  if (process.client) {
    document.documentElement.setAttribute('dir', languages.find(l => l.code === code)?.dir ?? 'ltr')
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
  // Set initial dir
  if (process.client) {
    document.documentElement.setAttribute('dir', currentLang.value.dir)
  }
})

onBeforeUnmount(() => { if (timer) clearInterval(timer) })

/** React to locale changes and keep the UI in sync */
watch(() => locale.value, () => {
  currentMessage.value = String(t(keys[idx]))
})

/** Tiny inline flag SVGs (square flags, simple but crisp). Replace with your own if you prefer. */
function flagSvg(country: CountryCode) {
  switch (country) {
    /* US */
    case 'US':
      return `
        <svg width="18" height="12" viewBox="0 0 36 24" aria-hidden="true">
          <rect width="36" height="24" fill="#b22234"/>
          <g fill="#fff">
            <rect y="3" width="36" height="3"/>
            <rect y="9" width="36" height="3"/>
            <rect y="15" width="36" height="3"/>
            <rect y="21" width="36" height="3"/>
          </g>
          <rect width="16" height="12" fill="#3c3b6e"/>
        </svg>`
    /* Saudi Arabia (green) – simplified */
    case 'SA':
      return `
        <svg width="18" height="12" viewBox="0 0 36 24" aria-hidden="true">
          <rect width="36" height="24" fill="#007a3d"/>
        </svg>`
    /* Spain */
    case 'ES':
      return `
        <svg width="18" height="12" viewBox="0 0 36 24" aria-hidden="true">
          <rect width="36" height="24" fill="#aa151b"/>
          <rect y="6" width="36" height="12" fill="#f1bf00"/>
        </svg>`
    /* France */
    case 'FR':
      return `
        <svg width="18" height="12" viewBox="0 0 36 24" aria-hidden="true">
          <rect width="12" height="24" fill="#0055a4"/>
          <rect x="12" width="12" height="24" fill="#fff"/>
          <rect x="24" width="12" height="24" fill="#ef4135"/>
        </svg>`
    /* Russia */
    case 'RU':
      return `
        <svg width="18" height="12" viewBox="0 0 36 24" aria-hidden="true">
          <rect width="36" height="8" fill="#fff"/>
          <rect y="8" width="36" height="8" fill="#0039a6"/>
          <rect y="16" width="36" height="8" fill="#d52b1e"/>
        </svg>`
    /* Germany */
    case 'DE':
      return `
        <svg width="18" height="12" viewBox="0 0 36 24" aria-hidden="true">
          <rect width="36" height="8" fill="#000"/>
          <rect y="8" width="36" height="8" fill="#dd0000"/>
          <rect y="16" width="36" height="8" fill="#ffce00"/>
        </svg>`
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
