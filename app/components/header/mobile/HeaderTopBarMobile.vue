<template>
  <div
    class="header-topbar bg-gray-100 text-sm py-2 md:hidden"
    :dir="selectedLang === 'ar' ? 'rtl' : 'ltr'"
  >
    <div class="container mx-auto px-3 sm:px-4">
      <!-- Wrap + allow horizontal scroll if it still gets tight -->
      <div class="flex flex-wrap items-center gap-y-2 overflow-x-auto no-scrollbar justify-between max-[325px]:justify-center"
      >
        <!-- WhatsApp -->
        <a
          href="https://wa.me/971504429045"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-1 text-green-600 shrink-0"
          aria-label="WhatsApp"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.001 2.002a9.936 9.936 0 0 0-9.949 9.949c0 1.755.456 3.47 1.326 4.993L2 22l5.201-1.348a9.91 9.91 0 0 0 4.8 1.223h.002c5.49 0 9.948-4.459 9.948-9.949A9.936 9.936 0 0 0 12.001 2.002Zm0 18.155h-.001a8.21 8.21 0 0 1-4.186-1.148l-.3-.178-3.086.8.825-3.012-.195-.309a8.215 8.215 0 0 1-1.263-4.377c0-4.533 3.688-8.221 8.221-8.221a8.193 8.193 0 0 1 8.221 8.221c0 4.533-3.688 8.224-8.221 8.224Zm4.495-6.157c-.246-.123-1.459-.718-1.686-.8-.226-.082-.39-.123-.554.123-.164.246-.637.8-.782.964-.145.164-.291.184-.537.062-.246-.123-1.037-.382-1.975-1.217-.73-.65-1.223-1.453-1.367-1.699-.145-.246-.015-.379.108-.502.111-.111.246-.29.369-.435.123-.145.164-.246.246-.41.082-.164.041-.308-.02-.431-.062-.123-.554-1.337-.759-1.83-.2-.48-.402-.415-.554-.423-.145-.008-.308-.01-.472-.01-.164 0-.431.062-.657.308-.226.246-.861.843-.861 2.053 0 1.21.881 2.379 1.004 2.541.123.164 1.733 2.645 4.203 3.707.588.253 1.047.404 1.405.517.59.187 1.127.161 1.551.098.474-.07 1.459-.596 1.664-1.173.205-.577.205-1.07.143-1.173-.062-.103-.226-.164-.472-.287Z"/>
          </svg>
          <span class="text-sm whitespace-nowrap">+971504429045</span>
        </a>

        <!-- Currency + Language (always together) -->
        <div class="flex items-center gap-2 shrink-0">
          <select
            v-model="selectedCurrency"
            @change="onCurrencyChange"
            class="border border-gray-300 rounded px-2 h-9 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[84px]"
          >
            <option v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</option>
          </select>

          <select
            v-model="selectedLang"
            @change="switchLang(selectedLang)"
            class="border border-gray-300 rounded px-2 h-9 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[72px]"
          >
            <option value="en">EN</option>
            <option value="ar">AR</option>
          </select>
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

type LocaleCode = 'en' | 'ar'

const { t, locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const { currency, setCurrency, options: currencyOptions } = useCurrency()
const selectedCurrency = ref<CurrencyCode>(currency.value)
const onCurrencyChange = () => {
  setCurrency(selectedCurrency.value)
  refreshNuxtData()
}

const selectedLang = ref<LocaleCode>((locale.value as LocaleCode) ?? 'en')
async function switchLang(l: LocaleCode) {
  if (l === (locale.value as LocaleCode)) return
  const path = switchLocalePath(l) as string | undefined
  if (!path) return
  await navigateTo(path)
  window.location.reload()
}

/* (optional) message rotator left as-is */
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
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
watch(() => locale.value, () => {
  selectedLang.value = (locale.value as LocaleCode) ?? 'en'
  currentMessage.value = String(t(keys[idx]))
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
