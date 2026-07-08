<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useNuxtApp, useRuntimeConfig, useHead, useSeoMeta, useRoute } from '#imports'
import ProductGrid from '~/components/products/ProductGrid.vue'

const { t, locale } = useI18n()
const { isAuthenticated, user } = useAuth()
const route = useRoute()

const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp() as any

/* ── WhatsApp support ── */
const WHATSAPP_NUMBER = '905376266092'
const whatsappLink =
  `https://wa.me/${WHATSAPP_NUMBER}?text=` +
  encodeURIComponent('Hello, I need help with the Toyota passcode calculation.')

/* ── Form ── */
const form = ref({ vin: '', data1: '', data2: '', data3: '' })
const loading        = ref(false)
const passcodeResult = ref<string | null>(null)
const errorMsg       = ref<string | null>(null)
const attemptInfo    = ref<{
  isPaidAttempt: boolean
} | null>(null)
const copied         = ref(false)

/* ── Countdown while calculating (backend API timeout is 120s) ── */
const countdown = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

const formattedCountdown = computed(() => {
  const s = Math.max(0, countdown.value)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
})

const startCountdown = () => {
  stopCountdown()
  countdown.value = 120
  countdownInterval = setInterval(() => {
    if (countdown.value > 0) countdown.value--
  }, 1000)
}

const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

/* Warn before leaving/refreshing while a calculation is running */
const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  if (loading.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnloadHandler)
})

onBeforeUnmount(() => {
  stopCountdown()
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})

const isFormValid = computed(() =>
  form.value.vin.trim().length === 17 &&
  form.value.data1.trim().length > 0 &&
  form.value.data2.trim().length > 0 &&
  form.value.data3.trim().length > 0
)

const hasNoTokens = computed(() =>
  isAuthenticated.value && (user.value?.toyota_tokens || 0) <= 0
)

const formatInput = (key: keyof typeof form.value, e: Event) => {
  const target = e.target as HTMLInputElement
  let v = target.value.toUpperCase().replace(/\s/g, '')
  if (key !== 'vin') v = v.replace(/O/g, '0')
  form.value[key] = v
}

const handleCalculate = async () => {
  if (!isFormValid.value || !isAuthenticated.value) return

  errorMsg.value = null
  passcodeResult.value = null
  attemptInfo.value = null
  loading.value = true
  startCountdown()

  try {
    const res = await $customApi(`${API_BASE_URL}/toyota-passcode`, {
      method: 'POST',
      body: form.value
    })

    // Handle success response
    if (res?.status === 'success' && res?.passcode) {
      passcodeResult.value = res.passcode
      attemptInfo.value = {
        isPaidAttempt: res.is_paid_attempt === true
      }

      // Update user's token count from the server's authoritative value
      if (user.value && res?.tokens_remaining !== undefined) {
        user.value.toyota_tokens = res.tokens_remaining
      }

      console.log('✅ Success:', {
        passcode: res.passcode,
        tokensRemaining: res.tokens_remaining,
        attemptInfo: attemptInfo.value
      })
    } else {
      // API returned error or no passcode
      errorMsg.value = res?.message || t('toyota_passcode.error_general')
      console.error('❌ API Error:', res)
    }
  } catch (err: any) {
    const status = err?.status || err?.statusCode || err?.response?.status
    console.error('Error Status:', status, 'Error:', err)

    if (status === 402 || status === 403) {
      errorMsg.value = err?.data?.message || err?.message || t('toyota_passcode.no_tokens_msg')
      // Ensure token count is 0 on 402 response
      if (user.value) user.value.toyota_tokens = 0
    } else {
      errorMsg.value = err?.data?.message || err?.message || t('toyota_passcode.error_general')
    }
  } finally {
    loading.value = false
    stopCountdown()
  }
}

const copyPasscode = async () => {
  if (!passcodeResult.value) return
  try {
    await navigator.clipboard.writeText(passcodeResult.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

/* ── Token products ── */
const items        = ref<any[]>([])
const loadingItems = ref(false)

function unwrapApi(res: any) {
  const body      = (res && typeof res === 'object' && 'data' in res && !Array.isArray((res as any).data)) ? (res as any).data : res
  const itemsArray = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : []
  return { items: itemsArray }
}

function mapApiProduct(p: any) {
  const hasSale = p?.sale_price != null && p?.sale_price !== 0
  return {
    id: p.id, name: p.title ?? p.short_title ?? '', image: p.image,
    price: hasSale ? p.sale_price : p.price,
    oldPrice: hasSale ? p.price : null,
    stock: Number.isFinite(Number(p?.quantity ?? p?.stock ?? p?.available_quantity))
      ? Number(p?.quantity ?? p?.stock ?? p?.available_quantity) : null,
    sku: p.sku ?? '',
    category: Array.isArray(p?.categories) && p.categories[0]?.name ? String(p.categories[0].name) : '',
    categorySlug: Array.isArray(p?.categories) && p.categories[0]?.slug ? String(p.categories[0].slug).toLowerCase() : '',
    slug: p.slug,
    href: p.slug ? `/products/${p.slug}` : `/products/${p.id}`,
  }
}

const tokenGridEl = ref<HTMLElement | null>(null)
onMounted(() => {
  if (!tokenGridEl.value) return
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { fetchTokens(); io.disconnect() }
  }, { rootMargin: '200px' })
  io.observe(tokenGridEl.value)
})

async function fetchTokens() {
  loadingItems.value = true
  try {
    const res = await $customApi(`${API_BASE_URL}/homepage-products/featured`, {
      method: 'GET',
      params: { page: 1, rows: 1, per_row: 12, category_id: 6687, only_featured: 0, currency: 'USD' }
    })
    const { items: list } = unwrapApi(res)
    items.value = list.map(mapApiProduct)
  } catch (err) {
    console.error('[TOKENS] fetch error:', err)
    items.value = []
  } finally {
    loadingItems.value = false
  }
}

/* ── SEO ── */
const siteName = 'Techno Lock Keys'
const baseUrl  = 'https://www.tlkeys.com'
const canonical = `${baseUrl}${route.path}`
const ogImage   = `${baseUrl}/images/og-image.jpg`

useSeoMeta({
  title: t('toyota_passcode.seo_title'),
  description: t('toyota_passcode.seo_description'),
  ogType: 'website', ogSiteName: siteName,
  ogTitle: t('toyota_passcode.seo_title'),
  ogDescription: t('toyota_passcode.seo_description'),
  ogUrl: canonical, ogImage,
  twitterCard: 'summary_large_image'
})
useHead({
  htmlAttrs: { lang: locale.value },
  link: [{ rel: 'canonical', href: canonical }],
  meta: [{ 'http-equiv': 'content-language', content: locale.value }]
})
</script>

<template>
  <main class="toyota-passcode-page pb-16 sm:pb-24 bg-gray-50/50 min-h-screen">
    <div class="container mx-auto px-4 pt-10 sm:pt-16 max-w-4xl space-y-6">

      <div class="bg-blue-50 border border-blue-100 rounded-2xl p-5 sm:p-7">
        <h3 class="flex items-center gap-2 text-blue-800 font-bold text-base sm:text-lg mb-4">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ t('toyota_passcode.instructions_title') }}
        </h3>
        <ul class="space-y-2 text-sm text-blue-700">
          <li class="flex items-start gap-2">
            <span class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center">1</span>
            {{ t('toyota_passcode.instruction_1') }}
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center">2</span>
            {{ t('toyota_passcode.instruction_2') }}
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs font-bold flex items-center justify-center">3</span>
            {{ t('toyota_passcode.instruction_3') }}
          </li>
        </ul>
      </div>

      <div class="relative bg-white border border-gray-100 shadow-2xl shadow-blue-900/5 rounded-[2rem] p-6 sm:p-10 lg:p-14 text-center overflow-hidden">
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent opacity-60 pointer-events-none"/>

        <div class="relative z-10 mb-8 sm:mb-10">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {{ t('toyota_passcode.title') }}
          </h1>
          <p class="text-xs sm:text-sm font-bold text-blue-600 mt-3 uppercase tracking-[0.2em]">
            {{ t('toyota_passcode.subtitle') }}
          </p>

          <div v-if="isAuthenticated"
               class="inline-flex items-center justify-center mt-6 px-5 py-2 rounded-full border shadow-sm"
               :class="hasNoTokens
                 ? 'bg-orange-50 border-orange-100 text-orange-700'
                 : 'bg-green-50 border-green-100 text-green-700'">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="font-bold text-sm sm:text-base">
              {{ t('toyota_passcode.available_tokens') }}: {{ user?.toyota_tokens || 0 }}
            </span>
          </div>

          <p v-if="hasNoTokens" class="text-xs text-orange-600 mt-2 font-medium">
            {{ t('toyota_passcode.no_tokens_hint') }}
          </p>
        </div>

        <div class="relative z-10 max-w-xl mx-auto space-y-4 sm:space-y-5">

          <div class="text-left">
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
              {{ t('toyota_passcode.label_vin') }}
              <span class="text-red-500 ml-0.5">*</span>
            </label>
            <input
              v-model="form.vin"
              @input="e => formatInput('vin', e)"
              type="text"
              maxlength="17"
              :placeholder="t('toyota_passcode.placeholder_vin')"
              :disabled="loading"
              class="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all disabled:bg-gray-100 text-center text-base sm:text-lg font-bold uppercase tracking-widest shadow-inner"
            />
            <p class="text-xs text-gray-400 mt-1 ml-1">{{ t('toyota_passcode.vin_hint') }}</p>
          </div>

          <div class="text-left">
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
              {{ t('toyota_passcode.label_data1') }}
              <span class="text-red-500 ml-0.5">*</span>
            </label>
            <input
              v-model="form.data1"
              @input="e => formatInput('data1', e)"
              type="text"
              :placeholder="t('toyota_passcode.placeholder_data1')"
              :disabled="loading"
              class="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all disabled:bg-gray-100 text-center text-base sm:text-lg font-bold uppercase tracking-widest shadow-inner"
            />
          </div>

          <div class="text-left">
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
              {{ t('toyota_passcode.label_data2') }}
              <span class="text-red-500 ml-0.5">*</span>
            </label>
            <input
              v-model="form.data2"
              @input="e => formatInput('data2', e)"
              type="text"
              :placeholder="t('toyota_passcode.placeholder_data2')"
              :disabled="loading"
              class="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all disabled:bg-gray-100 text-center text-base sm:text-lg font-bold uppercase tracking-widest shadow-inner"
            />
          </div>

          <div class="text-left">
            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
              {{ t('toyota_passcode.label_data3') }}
              <span class="text-red-500 ml-0.5">*</span>
            </label>
            <input
              v-model="form.data3"
              @input="e => formatInput('data3', e)"
              type="text"
              :placeholder="t('toyota_passcode.placeholder_data3')"
              :disabled="loading"
              @keyup.enter="handleCalculate"
              class="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all disabled:bg-gray-100 text-center text-base sm:text-lg font-bold uppercase tracking-widest shadow-inner"
            />
          </div>

          <p class="text-xs text-gray-400 text-left ml-1">
            <span class="text-red-500">*</span> {{ t('toyota_passcode.required_fields_note') }}
          </p>

          <div class="w-full pt-1">
            <template v-if="!isAuthenticated">
              <NuxtLinkLocale
                to="/auth/login-register"
                class="w-full flex justify-center items-center bg-gray-900 text-white py-4 sm:py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-lg hover:-translate-y-0.5 text-base sm:text-lg"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                {{ t('toyota_passcode.login_btn') }}
              </NuxtLinkLocale>
            </template>

            <template v-else>
              <button
                @click="handleCalculate"
                :disabled="loading || !isFormValid"
                class="w-full flex justify-center items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 sm:py-5 rounded-2xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-blue-500/30 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed text-base sm:text-lg transform active:scale-[0.98]"
              >
                <span v-if="loading" class="flex items-center gap-2">
                  <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  {{ t('toyota_passcode.calculating') }}
                </span>
                <span v-else-if="!isFormValid">{{ t('toyota_passcode.fill_all_fields') }}</span>
                <span v-else>{{ t('toyota_passcode.calculate_btn') }}</span>
              </button>
            </template>
          </div>

          <!-- Calculating: countdown timer + do-not-leave warning -->
          <transition name="fade">
            <div v-if="loading"
                 class="max-w-xl mx-auto mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 text-center">
              <div class="flex items-center justify-center gap-3 mb-3">
                <svg class="h-6 w-6 animate-spin text-amber-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span class="text-3xl font-black text-amber-700 tabular-nums">
                  {{ countdown > 0 ? formattedCountdown : 'Almost done…' }}
                </span>
              </div>
              <p class="text-sm font-bold text-amber-800">
                ⚠️ Please do not leave or refresh this page
              </p>
              <p class="text-xs text-amber-700 mt-1">
                Your passcode will be displayed here within 2 minutes.
              </p>
            </div>
          </transition>

          <transition name="fade">
            <div v-if="passcodeResult || errorMsg" class="max-w-xl mx-auto mt-8 sm:mt-10">

              <div v-if="passcodeResult"
                   class="relative bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl p-6 sm:p-8 text-center shadow-md overflow-hidden">
                <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"/>
                <span class="inline-block px-4 py-1.5 bg-blue-100 text-blue-800 text-xs sm:text-sm font-bold rounded-full uppercase tracking-widest mb-4 shadow-sm">
                  {{ t('toyota_passcode.success_title') }}
                </span>
                <div class="text-xs sm:text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">
                  {{ t('toyota_passcode.passcode_label') }}
                </div>

                <div class="flex items-center justify-center gap-4 my-2">
                  <div class="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
                    {{ passcodeResult }}
                  </div>
                  <button
                    @click="copyPasscode"
                    class="p-2.5 rounded-xl border transition-all active:scale-95 flex-shrink-0"
                    :class="copied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm'"
                    title="Copy Passcode"
                  >
                    <svg v-if="copied" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                    <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                  </button>
                </div>

                <div class="mt-5 pt-5 border-t border-blue-200/60 space-y-1.5">
                  <p class="text-sm text-blue-800 font-medium">
                    {{ t('toyota_passcode.result_note') }}
                  </p>

                  <!-- Paid / Free indicator -->
                  <div v-if="attemptInfo" class="bg-blue-100/50 rounded-lg p-3 mt-3">
                    <p class="text-xs font-semibold" :class="attemptInfo.isPaidAttempt ? 'text-orange-600' : 'text-green-600'">
                      {{ attemptInfo.isPaidAttempt
                          ? '1 token used for this calculation'
                          : 'Free — same VIN and data as a previous calculation' }}
                    </p>
                  </div>

                  <p class="text-xs text-blue-600 font-bold uppercase tracking-wider">
                    Tokens: {{ user?.toyota_tokens || 0 }}
                  </p>
                </div>
              </div>

              <div v-if="errorMsg"
                   class="bg-red-50 border border-red-200 rounded-2xl p-5 sm:p-6 text-center shadow-sm">
                <div class="flex items-center justify-center gap-2 text-red-600 font-bold text-sm sm:text-base">
                  <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {{ errorMsg }}
                </div>
              </div>

            </div>
          </transition>

          <!-- WhatsApp help -->
          <div class="max-w-xl mx-auto mt-6 text-center">
            <p class="text-sm text-gray-600 mb-3">
              If you find any problem doing the calculation, please contact us:
            </p>
            <a
              :href="whatsappLink"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-white bg-[#25D366] hover:bg-[#20bd5a] transition-all shadow-lg hover:-translate-y-0.5"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contact us on WhatsApp
            </a>
          </div>

          <div class="bg-orange-50 border border-orange-200 rounded-2xl p-5 sm:p-7 mt-5 text-left">
            <h3 class="flex items-center gap-2 text-orange-800 font-bold text-base sm:text-lg mb-4">
              <svg class="w-5 h-5 shrink-0 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              {{ t('toyota_passcode.warning_title') }}
            </h3>
            <ul class="space-y-3 text-sm">
              <li class="flex items-start gap-2 text-orange-700">
                <svg class="w-4 h-4 mt-0.5 shrink-0 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                {{ t('toyota_passcode.warning_1') }}
              </li>
              <li class="flex items-start gap-2 text-orange-800 font-semibold">
                <svg class="w-4 h-4 mt-0.5 shrink-0 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                {{ t('toyota_passcode.warning_2') }}
              </li>
              <li class="flex items-start gap-2 text-orange-700">
                <svg class="w-4 h-4 mt-0.5 shrink-0 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                {{ t('toyota_passcode.warning_3') }}
              </li>
              <li class="flex items-start gap-2 text-red-700 font-semibold">
                <svg class="w-4 h-4 mt-0.5 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                {{ t('toyota_passcode.warning_4') }}
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>

    <section ref="tokenGridEl" class="container mx-auto max-w-7xl px-4 mt-16 sm:mt-24">
      <div class="text-center mb-8 sm:mb-12">
        <h3 class="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
          {{ t('toyota_passcode.purchase_title') }}
        </h3>
        <p class="text-base sm:text-lg text-gray-500 mt-3 max-w-2xl mx-auto">
          {{ t('toyota_passcode.purchase_desc') }}
        </p>
      </div>
      <div class="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-4 sm:p-8">
        <ProductGrid
          title=""
          :products="items"
          :rows="1"
          :products-per-row="12"
          :show-rewards="false"
          :show-add="true"
          :show-qty="true"
          container-class="max-w-full"
        />
        <div v-if="loadingItems"
             class="px-3 py-10 text-center text-gray-400 font-medium animate-pulse">
          {{ t('toyota_passcode.loading_packages') }}
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
input { text-transform: uppercase; }
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-10px) scale(0.98); }
</style>