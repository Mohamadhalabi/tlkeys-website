<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useNuxtApp, useHead, useSeoMeta, useRoute } from '#imports'
import ProductGrid from '~/components/products/ProductGrid.vue'

const { t, locale } = useI18n()
const { isAuthenticated, user } = useAuth()
const route = useRoute()

const { $customApi } = useNuxtApp() as any

/** Shorthand for this page's translation keys: tp('step_buy') → t('toyota_passcode.step_buy') */
const tp = (key: string, params: Record<string, unknown> = {}) =>
  t(`toyota_passcode.${key}`, params)

/* ── Customer journey: register → buy tokens → calculate ── */
const tokenCount = computed(() => Number(user.value?.toyota_tokens || 0))

/** Logged in AND has at least one token. */
const hasTokens = computed(() => isAuthenticated.value && tokenCount.value > 0)

/** Logged in but the balance is zero. */
const hasNoTokens = computed(() => isAuthenticated.value && tokenCount.value <= 0)

/** 1 = needs an account, 2 = needs tokens, 3 = ready to calculate */
const currentStep = computed(() => {
  if (!isAuthenticated.value) return 1
  if (!hasTokens.value) return 2
  return 3
})

const stepState = (step: number): 'done' | 'current' | 'locked' => {
  if (step < currentStep.value) return 'done'
  if (step === currentStep.value) return 'current'
  return 'locked'
}

const steps = computed(() => [
  { n: 1, label: tp('step_account'),   state: stepState(1) },
  { n: 2, label: tp('step_buy'),       state: stepState(2) },
  { n: 3, label: tp('step_calculate'), state: stepState(3) },
])

/* Section anchors */
const tokenGridEl  = ref<HTMLElement | null>(null)
const calculatorEl = ref<HTMLElement | null>(null)

const scrollToEl = (el: HTMLElement | null) => {
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const scrollToTokens     = () => scrollToEl(tokenGridEl.value)
const scrollToCalculator = () => scrollToEl(calculatorEl.value)

const onStepClick = (n: number) => {
  if (n === 2) scrollToTokens()
  else if (n === 3) scrollToCalculator()
}

/* ── WhatsApp support (only for logged-in customers with tokens) ── */
const WHATSAPP_NUMBER = '905376266092'
// Kept in English on purpose: this pre-filled text goes to the support team.
const whatsappLink =
  `https://wa.me/${WHATSAPP_NUMBER}?text=` +
  encodeURIComponent('Hello, I need help with the Toyota passcode calculation.')
const showWhatsapp = computed(() => hasTokens.value)

/* ── Form ── */
const form = ref({ vin: '', data1: '', data2: '', data3: '' })
const loading        = ref(false)
const passcodeResult = ref<string | null>(null)
const errorMsg       = ref<string | null>(null)
const attemptInfo    = ref<{
  attemptNumber: number
  isPaidAttempt: boolean
  attemptsUntilCharge: number
} | null>(null)
const copied         = ref(false)

/* ── VIN length rules (internal only, not shown to the customer) ── */
const VIN_MIN = 12
const VIN_MAX = 22
const vinLength = computed(() => form.value.vin.trim().length)
const isVinValid = computed(() =>
  vinLength.value >= VIN_MIN && vinLength.value <= VIN_MAX
)

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

let tokenObserver: IntersectionObserver | null = null

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnloadHandler)

  // Lazy-load token packages when their section comes near the viewport.
  if (!tokenGridEl.value) return
  tokenObserver = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      fetchTokens()
      tokenObserver?.disconnect()
      tokenObserver = null
    }
  }, { rootMargin: '200px' })
  tokenObserver.observe(tokenGridEl.value)
})

onBeforeUnmount(() => {
  stopCountdown()
  tokenObserver?.disconnect()
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})

const isFormValid = computed(() =>
  isVinValid.value &&
  form.value.data1.trim().length > 0 &&
  form.value.data2.trim().length > 0 &&
  form.value.data3.trim().length > 0
)

const formatInput = (key: keyof typeof form.value, e: Event) => {
  const target = e.target as HTMLInputElement
  let v = target.value.toUpperCase().replace(/\s/g, '')
  if (key !== 'vin') v = v.replace(/O/g, '0')
  form.value[key] = v
}

/**
 * Pull the HTTP status and JSON body out of whatever $customApi threw.
 *
 * ofetch wraps failures, and where the status and body end up differs
 * between versions and between a network error and an HTTP error. Reading
 * one location and hoping is how a real 402 ("no tokens left") ends up
 * displayed as a generic server error — which tells the customer nothing
 * and sends them to support.
 */
function readError(err: any): { status: number | null; body: any } {
  const status =
    err?.status ??
    err?.statusCode ??
    err?.response?.status ??
    err?.response?._data?.status ??
    null

  const body =
    err?.data ??
    err?.response?._data ??
    err?.response?.data ??
    {}

  return { status, body }
}

const handleCalculate = async () => {
  if (!isFormValid.value || !isAuthenticated.value || loading.value) return
  errorMsg.value = null
  passcodeResult.value = null
  attemptInfo.value = null
  loading.value = true
  startCountdown()

  try {
    const res = await $customApi(`/toyota-passcode`, {
      method: 'POST',
      body: form.value
    })

    if (res?.status === 'success' && res?.passcode) {
      passcodeResult.value = res.passcode
      attemptInfo.value = {
        attemptNumber: res.attempt_number || 0,
        isPaidAttempt: res.is_paid_attempt === true,
        // The API returns both names; either is fine.
        attemptsUntilCharge: res.attempts_until_next_charge ?? res.attempts_left ?? 0
      }

      // Trust the server's number over anything held locally.
      if (user.value && res?.tokens_remaining !== undefined) {
        user.value.toyota_tokens = res.tokens_remaining
      }
    } else {
      // A 200 that is not a success still carries a message worth showing.
      errorMsg.value = res?.message || tp('err_not_completed')
      console.error('Toyota calc returned a non-success body:', res)
    }
  } catch (err: any) {
    const { status, body } = readError(err)

    // Kept deliberately: if an unexpected shape ever comes back, it is
    // visible here rather than hidden behind a generic message.
    console.error('Toyota calc failed', { status, body, err })

    if (status === 402) {
      // Out of tokens for a NEW calculation. The server already knows the
      // balance is zero, so reflect that rather than leaving a stale count.
      errorMsg.value = body?.message || tp('err_no_tokens')
      if (user.value) user.value.toyota_tokens = 0

    } else if (status === 403) {
      errorMsg.value = body?.message || tp('err_forbidden')

    } else if (status === 429) {
      // Rate limited: five calculations per minute, per account.
      errorMsg.value = body?.message || tp('err_rate_limit')

    } else if (status === 401) {
      errorMsg.value = tp('err_session')

    } else if (status === 422) {
      errorMsg.value = body?.message || tp('err_validation')

    } else if (status === 400) {
      // Toyota looked at the data and refused it.
      errorMsg.value = body?.message || tp('err_rejected')

    } else {
      errorMsg.value = body?.message || tp('err_unavailable')
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

async function fetchTokens() {
  if (loadingItems.value || items.value.length) return
  loadingItems.value = true
  try {
    const res = await $customApi(`/homepage-products/featured`, {
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
  title: () => t('toyota_passcode.seo_title'),
  description: () => t('toyota_passcode.seo_description'),
  ogType: 'website', ogSiteName: siteName,
  ogTitle: () => t('toyota_passcode.seo_title'),
  ogDescription: () => t('toyota_passcode.seo_description'),
  ogUrl: canonical, ogImage,
  twitterCard: 'summary_large_image'
})
useHead({
  htmlAttrs: {
    lang: () => locale.value,
    dir: () => (locale.value === 'ar' ? 'rtl' : 'ltr'),
  },
  link: [{ rel: 'canonical', href: canonical }],
  meta: [{ 'http-equiv': 'content-language', content: () => locale.value }]
})
</script>

<template>
  <main class="toyota-passcode-page pb-16 sm:pb-24 bg-gray-50/50 min-h-screen">

    <!-- ═════════ Calculator (always at the top) ═════════ -->
    <section
      id="calculator"
      ref="calculatorEl"
      class="container mx-auto px-4 pt-8 sm:pt-12 max-w-4xl scroll-mt-24"
    >
      <div class="relative bg-white border border-gray-100 shadow-2xl shadow-blue-900/5 rounded-[2rem] p-6 sm:p-10 lg:p-12 overflow-hidden">
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent opacity-60 pointer-events-none"/>

        <!-- Header -->
        <div class="relative z-10 text-center">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {{ t('toyota_passcode.title') }}
          </h1>
          <p class="text-xs sm:text-sm font-bold text-blue-600 mt-3 uppercase tracking-[0.2em]">
            {{ t('toyota_passcode.subtitle') }}
          </p>

          <!-- Compact stepper: register → buy tokens → calculate -->
          <nav :aria-label="tp('steps_aria')" class="mt-6">
            <ol class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <template v-for="(s, i) in steps" :key="s.n">
                <li>
                  <!-- Step 1 not done → link to register -->
                  <NuxtLinkLocale
                    v-if="s.n === 1 && s.state !== 'done'"
                    to="/auth/login-register"
                    class="step-pill step-pill--current"
                  >
                    <span class="step-dot">1</span>
                    <span>{{ s.label }}</span>
                  </NuxtLinkLocale>

                  <button
                    v-else
                    type="button"
                    @click="onStepClick(s.n)"
                    class="step-pill"
                    :class="`step-pill--${s.state}`"
                  >
                    <span class="step-dot">
                      <svg v-if="s.state === 'done'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" d="M5 13l4 4L19 7"/>
                      </svg>
                      <template v-else>{{ s.n }}</template>
                    </span>
                    <span>{{ s.label }}</span>
                  </button>
                </li>
                <li v-if="i < steps.length - 1" aria-hidden="true" class="text-gray-300">
                  <svg class="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                  </svg>
                </li>
              </template>
            </ol>
          </nav>

          <!-- Token balance -->
          <div v-if="isAuthenticated"
               class="inline-flex items-center justify-center gap-1.5 mt-5 px-4 py-1.5 rounded-full border text-sm"
               :class="hasNoTokens
                 ? 'bg-orange-50 border-orange-100 text-orange-700'
                 : 'bg-green-50 border-green-100 text-green-700'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="font-bold">{{ tp('tokens_available', { count: tokenCount }) }}</span>
          </div>
        </div>

        <div class="relative z-10 max-w-xl mx-auto mt-8 space-y-4 sm:space-y-5">

          <!-- State banners -->
          <div v-if="!isAuthenticated"
               class="bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-5 text-sm text-blue-800 text-start">
            <p class="font-bold mb-1">{{ tp('guest_title') }}</p>
            <p>{{ tp('guest_text') }}</p>
            <div class="flex flex-col sm:flex-row gap-2 mt-3">
              <NuxtLinkLocale
                to="/auth/login-register"
                class="flex-1 inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all">
                {{ tp('btn_register') }}
              </NuxtLinkLocale>
              <button
                type="button"
                @click="scrollToTokens"
                class="flex-1 inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-white border border-blue-200 text-blue-700 font-bold hover:bg-blue-100 transition-all">
                {{ tp('btn_see_prices') }}
              </button>
            </div>
          </div>

          <div v-else-if="hasNoTokens"
               class="bg-orange-50 border border-orange-200 rounded-2xl p-4 sm:p-5 text-sm text-orange-800 text-start">
            <p class="font-bold mb-1">{{ tp('no_tokens_title') }}</p>
            <p>{{ tp('no_tokens_text') }}</p>
            <button
              type="button"
              @click="scrollToTokens"
              class="mt-3 w-full inline-flex justify-center items-center px-4 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 transition-all">
              {{ tp('btn_buy_tokens') }}
            </button>
          </div>

          <!-- How to get Data 1–3 (collapsed so the form stays high on the page) -->
          <details class="group bg-gray-50 border border-gray-200 rounded-2xl text-start">
            <summary class="flex items-center justify-between gap-2 cursor-pointer list-none px-4 py-3 text-sm font-bold text-gray-700">
              <span class="flex items-center gap-2">
                <svg class="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ t('toyota_passcode.instructions_title') }}
              </span>
              <svg class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
              </svg>
            </summary>
            <ul class="space-y-2 text-sm text-gray-600 px-4 pb-4">
              <li class="flex items-start gap-2">
                <span class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">1</span>
                {{ t('toyota_passcode.instruction_1') }}
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">2</span>
                {{ t('toyota_passcode.instruction_2') }}
              </li>
              <li class="flex items-start gap-2">
                <span class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">3</span>
                {{ t('toyota_passcode.instruction_3') }}
              </li>
            </ul>
          </details>

          <!-- Form -->
          <div class="text-start">
            <label class="calc-label">
              {{ tp('label_vin') }}
              <span class="text-red-500 ms-0.5">*</span>
            </label>
            <input
              v-model="form.vin"
              @input="e => formatInput('vin', e)"
              type="text"
              dir="ltr"
              :maxlength="VIN_MAX"
              :placeholder="tp('label_vin')"
              :disabled="loading"
              class="calc-input"
            />
          </div>

          <div class="space-y-4 sm:space-y-5">
            <div class="text-start">
              <label class="calc-label">
                {{ tp('label_data1') }}
                <span class="text-red-500 ms-0.5">*</span>
              </label>
              <input
                v-model="form.data1"
                @input="e => formatInput('data1', e)"
                type="text"
                dir="ltr"
                :placeholder="tp('label_data1')"
                :disabled="loading"
                class="calc-input"
              />
            </div>

            <div class="text-start">
              <label class="calc-label">
                {{ tp('label_data2') }}
                <span class="text-red-500 ms-0.5">*</span>
              </label>
              <input
                v-model="form.data2"
                @input="e => formatInput('data2', e)"
                type="text"
                dir="ltr"
                :placeholder="tp('label_data2')"
                :disabled="loading"
                class="calc-input"
              />
            </div>

            <div class="text-start">
              <label class="calc-label">
                {{ tp('label_data3') }}
                <span class="text-red-500 ms-0.5">*</span>
              </label>
              <input
                v-model="form.data3"
                @input="e => formatInput('data3', e)"
                type="text"
                dir="ltr"
                :placeholder="tp('label_data3')"
                :disabled="loading"
                @keyup.enter="handleCalculate"
                class="calc-input"
              />
            </div>
          </div>

          <p class="text-xs text-gray-400 text-start ms-1">
            <span class="text-red-500">*</span> {{ tp('required_note') }}
          </p>

          <!-- Action -->
          <div class="w-full pt-1">
            <template v-if="!isAuthenticated">
              <NuxtLinkLocale
                to="/auth/login-register"
                class="w-full flex justify-center items-center gap-2 bg-gray-900 text-white py-4 sm:py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-lg hover:-translate-y-0.5 text-base sm:text-lg"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                {{ tp('btn_sign_in_to_calculate') }}
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
                  {{ tp('btn_calculating') }}
                </span>
                <span v-else-if="!isFormValid">{{ tp('btn_fill_fields') }}</span>
                <span v-else>{{ tp('btn_calculate') }}</span>
              </button>
            </template>
          </div>

          <!-- Calculating: countdown timer + do-not-leave warning -->
          <transition name="fade">
            <div v-if="loading"
                 class="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 text-center">
              <div class="flex items-center justify-center gap-3 mb-3">
                <svg class="h-6 w-6 animate-spin text-amber-600" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span class="text-3xl font-black text-amber-700 tabular-nums" dir="ltr">
                  {{ countdown > 0 ? formattedCountdown : tp('almost_done') }}
                </span>
              </div>
              <p class="text-sm font-bold text-amber-800">
                {{ tp('do_not_leave') }}
              </p>
              <p class="text-xs text-amber-700 mt-1">
                {{ tp('within_2_min') }}
              </p>
            </div>
          </transition>

          <!-- Result / error -->
          <transition name="fade">
            <div v-if="passcodeResult || errorMsg" class="mt-4">

              <div v-if="passcodeResult"
                   class="relative bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl p-6 sm:p-8 text-center shadow-md overflow-hidden">
                <div class="absolute top-0 end-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -me-10 -mt-10"/>
                <span class="inline-block px-4 py-1.5 bg-blue-100 text-blue-800 text-xs sm:text-sm font-bold rounded-full uppercase tracking-widest mb-4 shadow-sm">
                  {{ tp('result_success') }}
                </span>
                <div class="text-xs sm:text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">
                  {{ tp('result_label') }}
                </div>

                <div class="flex items-center justify-center gap-4 my-2">
                  <div class="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight" dir="ltr">
                    {{ passcodeResult }}
                  </div>
                  <button
                    @click="copyPasscode"
                    class="p-2.5 rounded-xl border transition-all active:scale-95 flex-shrink-0"
                    :class="copied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm'"
                    :title="tp('copy_title')"
                    :aria-label="tp('copy_title')"
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
                    {{ tp('result_hint') }}
                  </p>

                  <!-- Paid / free indicator. The free retries key off the VIN
                       and the 48h window only — the data fields may differ. -->
                  <div v-if="attemptInfo" class="bg-blue-100/50 rounded-lg p-3 mt-3">
                    <p class="text-xs font-semibold" :class="attemptInfo.isPaidAttempt ? 'text-orange-600' : 'text-green-600'">
                      {{ attemptInfo.isPaidAttempt ? tp('token_used') : tp('free_retry') }}
                    </p>
                  </div>

                  <div v-if="attemptInfo" class="bg-blue-100/50 rounded-lg p-3 mt-3 space-y-1">
                    <p class="text-xs text-blue-700 font-semibold">
                      ✓ {{ tp('attempt', { n: attemptInfo.attemptNumber }) }}
                      <span v-if="attemptInfo.isPaidAttempt" class="ms-2 text-orange-600">({{ tp('paid') }})</span>
                      <span v-else class="ms-2 text-green-600">({{ tp('free') }})</span>
                    </p>
                    <p class="text-xs text-blue-600">
                      {{ tp('free_attempts_left', { count: attemptInfo.attemptsUntilCharge }) }}
                    </p>
                  </div>

                  <p class="text-xs text-blue-600 font-bold uppercase tracking-wider">
                    {{ tp('tokens_short', { count: tokenCount }) }}
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
                <button
                  v-if="hasNoTokens"
                  type="button"
                  @click="scrollToTokens"
                  class="mt-3 inline-flex items-center px-4 py-2 rounded-xl bg-white border border-red-200 text-red-700 text-sm font-bold hover:bg-red-100 transition-all"
                >
                  {{ tp('btn_buy_tokens') }}
                </button>
              </div>

            </div>
          </transition>

          <!-- WhatsApp help: only for logged-in customers who have tokens -->
          <div v-if="showWhatsapp" class="pt-2 text-center">
            <p class="text-sm text-gray-600 mb-3">
              {{ tp('whatsapp_text') }}
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
              {{ tp('whatsapp_btn') }}
            </a>
          </div>

          <!-- Important notes -->
          <div class="bg-orange-50 border border-orange-200 rounded-2xl p-5 sm:p-6 text-start">
            <h3 class="flex items-center gap-2 text-orange-800 font-bold text-base mb-3">
              <svg class="w-5 h-5 shrink-0 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              {{ tp('important_title') }}
            </h3>
            <ul class="space-y-2 text-sm list-disc ps-5 marker:text-orange-400">
              <li class="text-orange-700">{{ tp('important_1') }}</li>
              <li class="text-orange-800 font-semibold">{{ tp('important_2') }}</li>
              <li class="text-orange-700">{{ tp('important_3') }}</li>
              <li class="text-red-700 font-semibold">{{ tp('important_4') }}</li>
            </ul>
          </div>

        </div>
      </div>
    </section>

    <!-- ═════════ Token packages ═════════ -->
    <section
      id="buy-tokens"
      ref="tokenGridEl"
      class="container mx-auto max-w-7xl px-4 mt-14 sm:mt-20 scroll-mt-24"
    >
      <div class="text-center mb-8 sm:mb-10">
        <h2 class="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
          {{ tp('buy_title') }}
        </h2>
        <p class="text-base sm:text-lg text-gray-500 mt-3 max-w-2xl mx-auto">
          {{ tp('buy_subtitle') }}
        </p>

        <div v-if="!isAuthenticated"
             class="mt-5 max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
          <p>
            <strong>{{ tp('buy_register_first') }}</strong>
            {{ tp('buy_register_note') }}
          </p>
          <NuxtLinkLocale
            to="/auth/login-register"
            class="inline-flex mt-3 px-4 py-2 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all">
            {{ tp('btn_register') }}
          </NuxtLinkLocale>
        </div>
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
          {{ tp('loading_packages') }}
        </div>
        <div v-else-if="!items.length"
             class="px-3 py-10 text-center text-gray-400 font-medium">
          {{ tp('packages_empty') }}
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
input { text-transform: uppercase; }

.calc-label {
  @apply block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ms-1;
}

.calc-input {
  @apply w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-center text-base sm:text-lg font-bold uppercase tracking-widest shadow-inner transition-all;
  @apply focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none;
  @apply disabled:bg-gray-100;
}

/* Compact stepper */
.step-pill {
  @apply inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-bold whitespace-nowrap transition-all;
}
.step-dot {
  @apply w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0;
}
.step-pill--done    { @apply bg-green-50 border-green-200 text-green-700 hover:bg-green-100; }
.step-pill--done    .step-dot { @apply bg-green-500 text-white; }
.step-pill--current { @apply bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30 hover:bg-blue-700; }
.step-pill--current .step-dot { @apply bg-white text-blue-700; }
.step-pill--locked  { @apply bg-white border-gray-200 text-gray-400 hover:bg-gray-50; }
.step-pill--locked  .step-dot { @apply bg-gray-200 text-gray-500; }

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-10px) scale(0.98); }
</style>