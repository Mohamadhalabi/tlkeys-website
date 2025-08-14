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
          class="flex items-center gap-1 text-green-600"
        >
          +971504429045
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

        <!-- Language -->
        <select
          v-model="selectedLang"
          @change="switchLang(selectedLang)"
          class="border border-gray-300 rounded px-2 py-1 bg-white text-sm focus:outline-none"
        >
          <option value="en">EN</option>
          <option value="ar">AR</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSwitchLocalePath } from '#i18n'
import { useCurrency, type CurrencyCode } from '~/composables/useCurrency'

type LocaleCode = 'en' | 'ar'

const { t, locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

/** Currency (SSR-safe via cookie+state) */
const { currency, setCurrency, options: currencyOptions } = useCurrency()
const selectedCurrency = ref<CurrencyCode>(currency.value)
const onCurrencyChange = () => {
  setCurrency(selectedCurrency.value)
  // Re-run useAsyncData across the app (SSR-friendly)
  refreshNuxtData()
}

/** Language */
const selectedLang = ref<LocaleCode>((locale.value as LocaleCode) ?? 'en')
async function switchLang(l: LocaleCode) {
  if (l === (locale.value as LocaleCode)) return
  const path = switchLocalePath(l) as string | undefined
  if (!path) return
  await navigateTo(path) // SSR-friendly routing; no hard reload needed
  window.location.reload(); // only if you really need a hard reload

}

/** Swapping topbar messages */
const currentMessage = ref<string>('')              // always string
const currentMessageKey = computed<string>(() => currentMessage.value ?? '')
const isVisible = ref(true)
const keys: string[] = ['shippingMessages.0', 'shippingMessages.1']
let idx = 0
let timer: ReturnType<typeof setInterval> | undefined

function cycleOnce() {
  isVisible.value = false
  // Only runs on client (setTimeout is no-op SSR)
  setTimeout(() => {
    idx = (idx + 1) % keys.length
    currentMessage.value = String(t(keys[idx]))
    isVisible.value = true
  }, 300)
}

onMounted(() => {
  // hydrate from state/cookie on client
  selectedCurrency.value = currency.value
  currentMessage.value = String(t(keys[idx]))
  timer = setInterval(cycleOnce, 4000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

/** React to language changes (i18n) */
watch(() => locale.value, () => {
  selectedLang.value = (locale.value as LocaleCode) ?? 'en'
  currentMessage.value = String(t(keys[idx]))
})
</script>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>