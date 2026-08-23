<template>
  <!-- max-w keeps the card readable on wide monitors; the page can still
       override it by passing a different class from the parent. -->
  <section class="mx-auto w-full max-w-3xl rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
    <header class="border-b border-gray-200 px-6 py-5 sm:px-8 sm:py-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">
            {{ tt('pincode.calcTitle', 'Kia / Hyundai PIN calculator') }}
          </h3>
          <p class="mt-1.5 text-sm sm:text-base text-gray-500">
            {{ tt('pincode.calcSubtitleGuest', 'Enter the VIN, pay, and the PIN code appears straight away. No account needed.') }}
          </p>
        </div>

        <div class="flex gap-2">
          <div
            v-for="p in priceChips"
            :key="p.type"
            class="rounded-lg px-3 py-2 text-center ring-1"
            :class="p.type === tokenType ? 'bg-orange-50 ring-orange-300' : 'bg-gray-50 ring-gray-200'"
          >
            <p class="text-lg font-extrabold leading-none text-gray-900">{{ money(p.price) }}</p>
            <p class="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">{{ p.label }}</p>
          </div>
        </div>
      </div>
    </header>

    <!-- ── How it works ──────────────────────────────────── -->
    <div class="border-b border-gray-200 bg-gray-50 px-6 py-5 sm:px-8 sm:py-6">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 text-left"
        :aria-expanded="instructionsOpen"
        aria-controls="pin-instructions"
        @click="instructionsOpen = !instructionsOpen"
      >
        <span class="text-sm font-semibold uppercase tracking-wide text-gray-700">
          {{ tt('pincode.howItWorks', 'How it works') }}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          class="h-5 w-5 shrink-0 text-gray-400 transition-transform"
          :class="instructionsOpen ? 'rotate-180' : ''"
          aria-hidden="true"
        >
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" />
        </svg>
      </button>

      <div v-show="instructionsOpen" id="pin-instructions" class="mt-4">
        <ol class="grid gap-4 sm:grid-cols-3">
          <li v-for="(step, i) in steps" :key="i" class="flex gap-3">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-700 text-sm font-bold text-white">
              {{ i + 1 }}
            </span>
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ step.title }}</p>
              <p class="mt-1 text-sm text-gray-600">{{ step.body }}</p>
            </div>
          </li>
        </ol>

        <ul class="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm text-gray-600">
          <li class="flex gap-2">
            <span aria-hidden="true" class="text-gray-400">•</span>
            <span>{{ tt('pincode.guestNote1', 'The price depends on the model year, which we read from the VIN. You see the exact amount before you pay.') }}</span>
          </li>
          <li class="flex gap-2">
            <span aria-hidden="true" class="text-gray-400">•</span>
            <span>{{ tt('pincode.guestNote2', 'If no PIN is found for your VIN, the payment is refunded automatically and we help you on WhatsApp.') }}</span>
          </li>
          <li class="flex gap-2">
            <span aria-hidden="true" class="text-gray-400">•</span>
            <span>{{ tt('pincode.guestNote3', 'A copy of the result is emailed to you. Save or copy it before leaving the page.') }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="px-6 py-6 sm:px-8 sm:py-8">
      <!-- VIN -->
      <div>
        <label for="pin-vin" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
          {{ tt('pincode.vin', 'VIN') }}
        </label>
        <input
          id="pin-vin"
          v-model="vin"
          type="text"
          autocomplete="off"
          spellcheck="false"
          maxlength="17"
          :disabled="locked"
          :placeholder="tt('pincode.vinPlaceholder', 'KNADN512AF6123456')"
          class="mt-2 w-full max-w-xl rounded-xl border-2 px-4 py-4 font-mono text-lg sm:text-2xl uppercase tracking-[0.15em] text-gray-900 transition placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-gray-300 focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
          :class="showVinError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-200 focus:border-orange-600 focus:ring-orange-500/20'"
          :aria-invalid="showVinError"
          aria-describedby="pin-vin-help"
          @input="onVinInput"
          @blur="vinTouched = true"
        >
        <div id="pin-vin-help" class="mt-2 flex max-w-xl flex-wrap items-center justify-between gap-2 text-sm">
          <p :class="showVinError ? 'text-red-600 font-medium' : 'text-gray-500'">
            <template v-if="showVinError">{{ vinError }}</template>
            <template v-else-if="detected">
              {{ tt('pincode.detectedYear', 'Model year') }}
              <b class="text-gray-900">{{ detected.year }}</b>
            </template>
            <template v-else>
              {{ tt('pincode.vinHint', 'All 17 characters, exactly as printed on the vehicle.') }}
            </template>
          </p>
          <span class="font-mono text-xs tabular-nums" :class="vin.length === 17 ? 'text-green-600' : 'text-gray-400'">
            {{ vin.length }}/17
          </span>
        </div>
      </div>

      <!-- Email -->
      <div class="mt-6">
        <label for="pin-email" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
          {{ tt('pincode.email', 'Email for the receipt') }}
        </label>
        <input
          id="pin-email"
          v-model.trim="email"
          type="email"
          autocomplete="email"
          inputmode="email"
          :disabled="locked"
          :placeholder="tt('pincode.emailPlaceholder', 'you@workshop.com')"
          class="mt-2 w-full max-w-md rounded-xl border-2 px-4 py-3 text-base text-gray-900 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
          :class="showEmailError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-200 focus:border-orange-600 focus:ring-orange-500/20'"
          :aria-invalid="showEmailError"
          @blur="emailTouched = true"
        >
        <p class="mt-2 text-sm" :class="showEmailError ? 'text-red-600 font-medium' : 'text-gray-500'">
          <template v-if="showEmailError">{{ tt('pincode.emailInvalid', 'Check this email address.') }}</template>
          <template v-else>{{ tt('pincode.emailHint', 'Leave empty to use your PayPal address.') }}</template>
        </p>
      </div>

      <!-- Price + PayPal -->
      <div v-show="!result && !notFound" class="mt-8">
        <div v-if="detected" class="flex flex-wrap items-end justify-between gap-4 rounded-xl border-2 border-gray-200 bg-gray-50 px-5 py-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ tt('pincode.amountDue', 'Amount') }}
            </p>
            <p class="mt-1 text-2xl font-extrabold text-gray-900">{{ money(currentPrice) }}</p>
          </div>
          <p class="text-sm text-gray-600">
            {{ tt('pincode.priceBecause', 'Model year') }}
            <b class="text-gray-900">{{ detected.year }}</b>
            <span class="text-gray-400"> · </span>
            {{ detected.era === 'post2017' ? tt('pincode.chipPost', '2017+') : tt('pincode.chipPre', 'Pre-2017') }}
          </p>
        </div>

        <div class="mt-5 max-w-md">
          <!-- The mount node stays in the DOM at all times. PayPal renders into
               it once, on page load, and the buttons sit disabled until the VIN
               is valid — rendering them only after a valid VIN meant an empty
               box for anyone who had not typed yet. -->
          <div v-show="!working" ref="paypalMount" class="min-h-[52px]" />

          <div v-if="sdkError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p class="text-sm font-medium text-red-800">
              {{ tt('pincode.sdkError', 'The payment window could not load. Refresh the page and try again.') }}
            </p>
            <!-- Only in dev: tells you which of the four causes it was, so you
                 are not left guessing at a generic message. -->
            <p v-if="isDev" class="mt-1 font-mono text-xs text-red-700">{{ sdkErrorHint }}</p>
          </div>
          <p v-else-if="!sdkReady" class="text-sm text-gray-500">
            {{ tt('pincode.sdkLoading', 'Loading payment options…') }}
          </p>
          <p v-else-if="!detected" class="text-sm text-gray-500">
            {{ tt('pincode.enterVinFirst', 'Enter a valid VIN to see the price and pay.') }}
          </p>
        </div>

        <p v-if="detected" class="mt-4 text-xs text-gray-400">
          {{ tt('pincode.guestSubmitNote', 'You are charged once. If no PIN is found for this VIN, the payment is refunded automatically.') }}
        </p>
      </div>

      <!-- Working -->
      <div v-if="working" class="mt-6 flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 px-5 py-4">
        <svg class="h-5 w-5 shrink-0 animate-spin text-orange-700" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p class="text-sm font-medium text-orange-900">
          {{ tt('pincode.workingBody', 'Payment received. Fetching your PIN code — do not close this page.') }}
        </p>
      </div>

      <div v-if="result || notFound || errorMessage" class="mt-6">
        <button
          type="button"
          class="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
          @click="reset"
        >
          {{ tt('pincode.newSearch', 'New search') }}
        </button>
      </div>
    </div>

    <!-- Lookup failed → refunded + WhatsApp -->
    <div v-if="notFound" class="mx-6 mb-6 sm:mx-8 rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-5" role="alert">
      <p class="text-base font-semibold text-amber-900">
        {{ tt('pincode.notFoundTitle', 'We could not get this PIN code automatically') }}
      </p>
      <p class="mt-1 text-sm text-amber-800">
        {{ refunded
          ? tt('pincode.notFoundRefunded', 'Your payment has been refunded. Contact us and we will send the code on WhatsApp.')
          : tt('pincode.notFoundRefunding', 'Your payment is being refunded. Contact us and we will send the code on WhatsApp.') }}
      </p>

      <p class="mt-3 font-mono text-sm tracking-wider text-amber-900">{{ lastVin }}</p>

      <a
        :href="whatsappLink"
        target="_blank"
        rel="noopener noreferrer nofollow"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.83 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.24-.02-.38.1-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
        </svg>
        {{ tt('pincode.contactWhatsapp', 'Contact us on WhatsApp') }}
      </a>
    </div>

    <!-- Payment / validation errors -->
    <div v-else-if="errorMessage" class="mx-6 mb-6 sm:mx-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4" role="alert">
      <p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
    </div>

    <!-- Result -->
    <div v-if="result" class="border-t border-gray-200 bg-gray-50 px-6 py-6 sm:px-8" aria-live="polite">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <dl class="grid gap-3 text-sm">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ tt('pincode.vin', 'VIN') }}
            </dt>
            <dd class="mt-1 font-mono text-xl font-bold tracking-[0.2em] text-gray-900 break-all">{{ result.vin }}</dd>
          </div>

          <div v-if="result.keyCode">
            <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ tt('pincode.keyCode', 'Key code') }}
            </dt>
            <dd class="mt-1 font-mono text-xl font-bold tracking-[0.2em] text-gray-900">{{ result.keyCode }}</dd>
          </div>

          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ tt('pincode.yourPin', 'PIN code') }}
            </dt>
            <dd class="mt-1 font-mono text-xl font-bold tracking-[0.2em] text-gray-900">{{ result.pin }}</dd>
          </div>
        </dl>

        <button
          type="button"
          class="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-orange-500/20"
          @click="copyResult"
        >
          {{ copied ? tt('pincode.copied', 'Copied') : tt('pincode.copyAll', 'Copy all') }}
        </button>
      </div>

      <p v-if="result.emailed" class="mt-5 flex items-center gap-2 text-sm text-green-700">
        <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 shrink-0" aria-hidden="true">
          <path d="M2.94 6.34 10 10.75l7.06-4.41A2 2 0 0 0 15.2 5H4.8a2 2 0 0 0-1.86 1.34Z" />
          <path d="M18 8.12l-7.47 4.67a1 1 0 0 1-1.06 0L2 8.12V13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.12Z" />
        </svg>
        <span>
          {{ tt('pincode.emailSent', 'A copy has been sent to') }}
          <b class="font-semibold">{{ result.email }}</b>
        </span>
      </p>
      <p v-else class="mt-5 text-sm text-gray-500">
        {{ tt('pincode.emailFailed', 'We could not email this result. Please copy it before leaving the page.') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  /** Base path of the guest endpoints, appended to API_BASE_URL. */
  endpoint?: string
  /** Display price for pre-2017 VINs. The charged amount always comes from the server. */
  pricePre?: number
  /** Display price for 2017+ VINs. */
  pricePost?: number
  currency?: string
  /** PayPal client id. Falls back to runtimeConfig.public.PAYPAL_CLIENT_ID. */
  paypalClientId?: string
  whatsappPhone?: string
  instructionsExpanded?: boolean
  /** Keep the host page out of search results. Set to false if you ever want
   *  a page with this calculator on it to be indexable. */
  noIndex?: boolean
}>(), {
  endpoint: '/pin-code/guest',
  pricePre: 15,
  pricePost: 55,
  currency: 'USD',
  paypalClientId: '',
  whatsappPhone: '971502519501',
  instructionsExpanded: false,
  noIndex: true,
})

const emit = defineEmits<{
  (e: 'pay', payload: any): void
  (e: 'success', payload: any): void
  (e: 'error', payload: any): void
}>()

const { t, te } = useI18n()
const { public: pub } = useRuntimeConfig()
const API_BASE_URL = (pub as any).API_BASE_URL

/* ─────────── SEO: keep this page out of the index ───────────
 * Emitted on the server too, so crawlers see it in the raw HTML rather than
 * only after hydration. `googlebot` repeats the directive because a few
 * crawlers read the bot-specific tag in preference to the generic one.
 */
useHead({
  title: "Kia Hyundai Pin code",
  meta: [
    { name: 'robots', content: props.noIndex ? 'noindex, nofollow, noarchive, nosnippet' : 'index, follow' },
    { name: 'googlebot', content: props.noIndex ? 'noindex, nofollow' : 'index, follow' },
  ],
})

function tt(key: string, fallback: string) {
  return te(key) ? t(key) : fallback
}

/* ─────────── state ─────────── */
const vin = ref('')
const email = ref('')
const vinTouched = ref(false)
const emailTouched = ref(false)
const working = ref(false)
const copied = ref(false)
const errorMessage = ref('')
const notFound = ref(false)
const refunded = ref(false)
const lastVin = ref('')
const instructionsOpen = ref(props.instructionsExpanded)

const sdkReady = ref(false)
const sdkError = ref(false)
/** 'no-client-id' | 'script-blocked' | 'ineligible' | 'render-failed' */
const sdkErrorReason = ref('')
const paypalMount = ref<HTMLElement | null>(null)

/** Reference + secret for the order currently in flight. */
const order = ref<{ reference: string, accessToken: string } | null>(null)

const result = ref<{
  vin: string
  pin: string
  keyCode: string
  emailed: boolean
  email: string
} | null>(null)

const locked = computed(() => working.value || !!result.value || notFound.value)

const steps = computed(() => [
  {
    title: tt('pincode.gStep1Title', 'Enter the VIN'),
    body: tt('pincode.gStep1Body', 'Type all 17 characters exactly as printed on the vehicle. We read the model year from it and show you the price.'),
  },
  {
    title: tt('pincode.gStep2Title', 'Pay with PayPal'),
    body: tt('pincode.gStep2Body', 'No account with us is required. Pay with your PayPal balance or any card PayPal accepts.'),
  },
  {
    title: tt('pincode.gStep3Title', 'Get the PIN code'),
    body: tt('pincode.gStep3Body', 'The PIN and key code appear within seconds and a copy is emailed to you.'),
  },
])

/* ─────────── VIN → year ───────────
 * Position 10 is the model-year code. 1-9 = 2001-2009, A-G = 2010-2016,
 * H-Y = 2017-2030. 0, I, O, Q, U and Z are never valid year codes.
 */
const YEAR_CODES: Record<string, number> = {
  '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
  '6': 2006, '7': 2007, '8': 2008, '9': 2009,
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016,
  H: 2017, J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023,
  R: 2024, S: 2025, T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
}

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/
const lengthOk = computed(() => VIN_RE.test(vin.value))
const yearChar = computed(() => (lengthOk.value ? vin.value.charAt(9) : ''))

const detected = computed(() => {
  const year = YEAR_CODES[yearChar.value]
  if (!year) return null
  return { year, era: (year >= 2017 ? 'post2017' : 'pre2017') as 'pre2017' | 'post2017' }
})

const vinError = computed(() => {
  if (!vin.value.length) return tt('pincode.vinRequired', 'Enter the VIN.')
  if (!lengthOk.value) return tt('pincode.vinInvalid', 'A VIN is exactly 17 characters and never contains I, O or Q.')
  if (!detected.value) return tt('pincode.vinYearInvalid', 'Character 10 is not a valid model-year code.')
  return ''
})
const vinValid = computed(() => !vinError.value)
const showVinError = computed(() => vinTouched.value && !vinValid.value)

const emailValid = computed(() => !email.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))
const showEmailError = computed(() => emailTouched.value && !emailValid.value)

/** Everything the server needs before it will create an order. Drives the
 *  enabled/disabled state of the PayPal buttons. */
const canPay = computed(() => vinValid.value && emailValid.value && !locked.value)

/* ─────────── pricing (display only) ─────────── */
const tokenType = computed(() =>
  detected.value?.era === 'post2017' ? 'kia_post2017'
  : detected.value?.era === 'pre2017' ? 'kia_pre2017'
  : '')

const currentPrice = computed(() =>
  detected.value?.era === 'post2017' ? props.pricePost : props.pricePre)

const priceChips = computed(() => [
  { type: 'kia_pre2017', price: props.pricePre, label: tt('pincode.chipPre', 'Pre-2017') },
  { type: 'kia_post2017', price: props.pricePost, label: tt('pincode.chipPost', '2017+') },
])

function money(value: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: props.currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${props.currency} ${value}`
  }
}

/* ─────────── WhatsApp fallback ─────────── */
const whatsappLink = computed(() => {
  const message = `${tt('pincode.waMessage', 'Hello, I could not get a PIN code & Keycode for this VIN')}: ${lastVin.value}`
  return `https://api.whatsapp.com/send?phone=${props.whatsappPhone}&text=${encodeURIComponent(message)}`
})

/* ─────────── PayPal SDK ─────────── */
const clientId = computed(() => props.paypalClientId || (pub as any).PAYPAL_CLIENT_ID || '')

const isDev = import.meta.dev === true

const sdkErrorHint = computed(() => {
  switch (sdkErrorReason.value) {
    case 'no-client-id':
      return 'No client id reached the browser. Set runtimeConfig.public.PAYPAL_CLIENT_ID (env: NUXT_PUBLIC_PAYPAL_CLIENT_ID) or pass :paypal-client-id.'
    case 'script-blocked':
      return `Script blocked or rejected: https://www.paypal.com/sdk/js?client-id=${clientId.value.slice(0, 8)}… — check the Network tab, ad blockers, and your CSP.`
    case 'ineligible':
      return `No eligible funding source for currency ${props.currency}. Check the currency and that the account is a live/sandbox business account.`
    case 'render-failed':
      return 'Buttons.render() threw. See the console.'
    default:
      return ''
  }
})

function loadPayPal(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  const w = window as any
  if (w.paypal) return Promise.resolve(w.paypal)
  if (w.__paypalSdkPromise) return w.__paypalSdkPromise

  w.__paypalSdkPromise = new Promise((resolve, reject) => {
    if (!clientId.value) {
      reject(new Error('no-client-id'))
      return
    }
    const params = new URLSearchParams({
      'client-id': clientId.value,
      currency: props.currency,
      intent: 'capture',
      components: 'buttons',
      'disable-funding': 'credit,paylater',
    })
    const s = document.createElement('script')
    s.src = `https://www.paypal.com/sdk/js?${params.toString()}`
    s.async = true
    s.onload = () => (w.paypal ? resolve(w.paypal) : reject(new Error('script-blocked')))
    s.onerror = () => reject(new Error('script-blocked'))
    document.head.appendChild(s)
  })

  // A rejected promise must not stay cached, or every later attempt in this
  // page session replays the same failure without retrying the script.
  w.__paypalSdkPromise.catch(() => { delete w.__paypalSdkPromise })

  return w.__paypalSdkPromise
}

let buttonsInstance: any = null

async function mountButtons() {
  if (!paypalMount.value || buttonsInstance) return

  let paypal: any
  try {
    paypal = await loadPayPal()
    sdkReady.value = true
  } catch (e: any) {
    sdkError.value = true
    sdkErrorReason.value = e?.message === 'no-client-id' ? 'no-client-id' : 'script-blocked'

    console.error(
      sdkErrorReason.value === 'no-client-id'
        ? '[PIN CODE] PayPal client id is missing. Set runtimeConfig.public.PAYPAL_CLIENT_ID in nuxt.config, or pass :paypal-client-id on the component.'
        : '[PIN CODE] The PayPal SDK script did not load. Check the Network tab for www.paypal.com/sdk/js — an ad blocker, a CSP header, or a bad client id will all block it.',
      e,
    )
    emit('error', e)
    return
  }

  buttonsInstance = paypal.Buttons({
    style: { layout: 'vertical', shape: 'rect', color: 'gold', label: 'paypal', height: 48 },

    // The buttons are rendered once on page load and start disabled. This is
    // PayPal's supported way to gate them — re-rendering the SDK on every
    // keystroke is slow and flickers.
    onInit: (_data: any, actions: any) => {
      const sync = () => (canPay.value ? actions.enable() : actions.disable())
      sync()
      watch(canPay, sync)
    },

    // Second line of defence: if the customer clicks a stale-enabled button,
    // reject before PayPal opens its window.
    onClick: (_data: any, actions: any) => {
      vinTouched.value = true
      emailTouched.value = true

      if (!canPay.value) {
        errorMessage.value = !vinValid.value
          ? vinError.value
          : tt('pincode.emailInvalid', 'Check this email address.')
        return actions.reject()
      }

      return actions.resolve()
    },

    // Ask OUR server for the order. It sets the price — the browser never does.
    createOrder: async () => {
      vinTouched.value = true
      emailTouched.value = true

      if (!canPay.value) {
        throw new Error('invalid input')
      }

      clearFeedback()

      const res: any = await $fetch(`${API_BASE_URL}${props.endpoint}/orders`, {
        method: 'POST',
        body: { vin: vin.value, email: email.value || undefined },
      })

      order.value = { reference: res.reference, accessToken: res.access_token }
      lastVin.value = vin.value
      rememberOrder()
      instructionsOpen.value = false

      emit('pay', res)

      return res.paypal_order_id
    },

    onApprove: async () => {
      working.value = true
      try {
        await captureOrder()
      } finally {
        working.value = false
      }
    },

    onCancel: () => {
      errorMessage.value = tt('pincode.paymentCancelled', 'Payment cancelled. Nothing was charged.')
    },

    onError: (err: any) => {
      // createOrder throws land here too; only show a message if we really failed.
      if (!vinValid.value) {
        errorMessage.value = vinError.value
      } else if (!emailValid.value) {
        errorMessage.value = tt('pincode.emailInvalid', 'Check this email address.')
      } else {
        errorMessage.value = tt('pincode.payError', 'The payment could not be started. Try again in a moment.')
      }
      emit('error', err)
    },
  })

  if (buttonsInstance.isEligible?.() === false) {
    sdkError.value = true
    sdkErrorReason.value = 'ineligible'
    console.error('[PIN CODE] No PayPal funding source is eligible. Usually a currency the account cannot accept, or a sandbox client id with no linked account.')
    return
  }

  try {
    await buttonsInstance.render(paypalMount.value)
  } catch (e) {
    sdkError.value = true
    sdkErrorReason.value = 'render-failed'
    console.error('[PIN CODE] PayPal buttons failed to render.', e)
  }
}

/* ─────────── capture + result ─────────── */
async function captureOrder() {
  if (!order.value) return

  try {
    const res: any = await $fetch(
      `${API_BASE_URL}${props.endpoint}/orders/${order.value.reference}/capture`,
      {
        method: 'POST',
        headers: { 'X-Order-Token': order.value.accessToken },
      },
    )
    applyOrderState(res)
  } catch (err: any) {
    const status = err?.status ?? err?.statusCode ?? err?.response?.status
    const body = err?.data ?? err?.response?._data ?? {}

    // 404 from capture means "paid, but no PIN for this VIN" — the server has
    // already started the refund, so show the WhatsApp panel, not a hard error.
    if (status === 404 && body?.not_found) {
      applyOrderState(body)
      return
    }

    if (status === 202) {
      errorMessage.value = body?.error
        || tt('pincode.pendingReview', 'PayPal is still reviewing this payment. We will email your PIN as soon as it clears.')
      return
    }

    errorMessage.value = body?.error || tt('pincode.captureError', 'We could not confirm the payment. Contact us with your PayPal receipt and we will sort it out.')
    emit('error', err)
    console.error('[PIN CODE] capture error:', err)
  }
}

function applyOrderState(body: any) {
  if (body?.status === 'fulfilled' && body?.pin_code) {
    result.value = {
      vin: String(body.vin ?? lastVin.value),
      pin: String(body.pin_code),
      keyCode: body.key_code ? String(body.key_code) : '',
      emailed: Boolean(body.emailed),
      email: String(body.email ?? email.value ?? ''),
    }
    notFound.value = false
    forgetOrder()
    emit('success', body)
    return
  }

  if (body?.not_found || ['unfulfilled', 'refunded'].includes(body?.status)) {
    notFound.value = true
    refunded.value = body?.status === 'refunded' || Boolean(body?.refunded)
    forgetOrder()
    emit('error', body)
    return
  }

  if (body?.status === 'failed') {
    errorMessage.value = tt('pincode.paymentFailed', 'The payment did not go through. Nothing was charged.')
    forgetOrder()
  }
}

/* ─────────── recovery after a refresh ─────────── */
const STORAGE_KEY = 'tlk.pinOrder'

function rememberOrder() {
  try {
    if (order.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...order.value, vin: vin.value, at: Date.now() }))
    }
  } catch { /* private mode, ignore */ }
}

function forgetOrder() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

async function recoverOrder() {
  let saved: any = null
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch { return }

  // Anything older than an hour is not worth chasing.
  if (!saved?.reference || !saved?.accessToken || Date.now() - (saved.at ?? 0) > 3600_000) {
    forgetOrder()
    return
  }

  order.value = { reference: saved.reference, accessToken: saved.accessToken }
  vin.value = saved.vin ?? ''
  lastVin.value = saved.vin ?? ''

  try {
    const res: any = await $fetch(`${API_BASE_URL}${props.endpoint}/orders/${saved.reference}`, {
      headers: { 'X-Order-Token': saved.accessToken },
    })
    if (res?.status === 'pending') {
      forgetOrder()
      return
    }
    applyOrderState(res)
  } catch {
    forgetOrder()
  }
}

/* ─────────── input handling ─────────── */
function onVinInput(e: Event) {
  const el = e.target as HTMLInputElement
  const clean = el.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17)
  vin.value = clean
  el.value = clean
  clearFeedback()
}

function clearFeedback() {
  errorMessage.value = ''
  notFound.value = false
  refunded.value = false
}

watch(detected, () => { clearFeedback() })

/* ─────────── copy ─────────── */
async function copyResult() {
  if (!result.value) return

  const lines = [
    `VIN: ${result.value.vin}`,
    `KEYCODE: ${result.value.keyCode || '-'}`,
    `PINCODE: ${result.value.pin}`,
  ]

  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { copied.value = false }
}

function reset() {
  vin.value = ''
  lastVin.value = ''
  vinTouched.value = false
  emailTouched.value = false
  result.value = null
  order.value = null
  working.value = false
  clearFeedback()
  forgetOrder()
  nextTick(mountButtons)
}

onMounted(async () => {
  await recoverOrder()
  if (!result.value && !notFound.value) await mountButtons()
})

defineExpose({ reset, recoverOrder })
</script>