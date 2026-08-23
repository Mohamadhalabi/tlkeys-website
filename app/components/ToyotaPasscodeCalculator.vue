<template>
  <section class="mx-auto w-full max-w-3xl rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
    <header class="border-b border-gray-200 px-6 py-5 sm:px-8 sm:py-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">
            {{ tt('toyotaGuest.title', 'Toyota passcode calculator') }}
          </h2>
          <p class="mt-1.5 text-sm sm:text-base text-gray-500">
            {{ tt('toyotaGuest.subtitle', 'Enter the four values from your tool, pay, and the passcode appears here. No account needed.') }}
          </p>
        </div>

        <div class="rounded-lg bg-blue-50 px-3 py-2 text-center ring-1 ring-blue-200">
          <p class="text-lg font-extrabold leading-none text-blue-900">{{ money(price) }}</p>
          <p class="mt-1 text-[11px] font-medium uppercase tracking-wide text-blue-700">
            {{ tt('toyotaGuest.perCalc', 'Per passcode') }}
          </p>
        </div>
      </div>
    </header>

    <!-- Warning: this is the one thing a customer must read before paying. -->
    <div class="border-b border-gray-200 bg-orange-50 px-6 py-5 sm:px-8">
      <div class="flex gap-3">
        <svg viewBox="0 0 20 20" fill="currentColor" class="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92ZM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-8a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0V6a1 1 0 0 0-1-1Z" clip-rule="evenodd" />
        </svg>
        <div class="text-sm text-orange-800">
          <p class="font-semibold text-orange-900">
            {{ tt('toyotaGuest.warnTitle', 'Read the values carefully before you pay') }}
          </p>
          <p class="mt-1">
            {{ tt('toyotaGuest.warnBody', 'A wrong passcode entered repeatedly can lock the immobiliser. You get two free retries if the last three characters of Data 1 were misread — anything else is a new calculation.') }}
          </p>
        </div>
      </div>
    </div>

    <div class="px-6 py-6 sm:px-8 sm:py-8">
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="ty-vin" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
            {{ tt('toyotaGuest.vin', 'VIN') }} <span class="text-red-500">*</span>
          </label>
          <input
            id="ty-vin"
            v-model="form.vin"
            type="text"
            maxlength="17"
            autocomplete="off"
            spellcheck="false"
            :disabled="locked"
            placeholder="JTDBR32E630123456"
            class="mt-2 w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 font-mono text-lg uppercase tracking-[0.12em] text-gray-900 transition focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-500 placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-gray-300"
            @input="onInput('vin', $event)"
          >
          <p class="mt-1.5 text-xs text-gray-500">
            {{ vinOk ? tt('toyotaGuest.vinOk', 'Looks right.') : tt('toyotaGuest.vinHint', 'All 17 characters, exactly as printed on the vehicle.') }}
          </p>
        </div>

        <div v-for="f in dataFields" :key="f.key" :class="f.key === 'data3' ? 'sm:col-span-2' : ''">
          <label :for="`ty-${f.key}`" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
            {{ f.label }} <span class="text-red-500">*</span>
          </label>
          <input
            :id="`ty-${f.key}`"
            v-model="form[f.key]"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :disabled="locked"
            :placeholder="f.placeholder"
            class="mt-2 w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 font-mono text-base uppercase tracking-[0.12em] text-gray-900 transition focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-500 placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-300"
            @input="onInput(f.key, $event)"
          >
        </div>
      </div>

      <p class="mt-3 text-xs text-gray-500">
        {{ tt('toyotaGuest.oZero', 'The letter O is read as the digit 0 — that is deliberate, the tool never outputs a letter O here.') }}
      </p>

      <!-- Email -->
      <div class="mt-6">
        <label for="ty-email" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
          {{ tt('toyotaGuest.email', 'Email for the receipt') }}
        </label>
        <input
          id="ty-email"
          v-model.trim="email"
          type="email"
          autocomplete="email"
          inputmode="email"
          :disabled="locked"
          placeholder="you@workshop.com"
          class="mt-2 w-full max-w-md rounded-xl border-2 px-4 py-3 text-base text-gray-900 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
          :class="showEmailError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-200 focus:border-blue-600 focus:ring-blue-500/20'"
          @blur="emailTouched = true"
        >
        <p class="mt-2 text-sm" :class="showEmailError ? 'text-red-600 font-medium' : 'text-gray-500'">
          <template v-if="showEmailError">{{ tt('toyotaGuest.emailInvalid', 'Check this email address.') }}</template>
          <template v-else>{{ tt('toyotaGuest.emailHint', 'Leave empty to use your PayPal address.') }}</template>
        </p>
      </div>

      <!-- Pay -->
      <div v-show="!result && !failed" class="mt-8">
        <div class="flex flex-wrap items-end justify-between gap-4 rounded-xl border-2 border-gray-200 bg-gray-50 px-5 py-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ tt('toyotaGuest.amountDue', 'Amount') }}
            </p>
            <p class="mt-1 text-2xl font-extrabold text-gray-900">{{ money(price) }}</p>
          </div>
          <p class="text-sm text-gray-600">
            {{ tt('toyotaGuest.includesRetries', 'Includes two free retries') }}
          </p>
        </div>

        <div class="mt-5 max-w-md">
          <div v-show="!working" ref="paypalMount" class="min-h-[52px]" />

          <div v-if="sdkError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p class="text-sm font-medium text-red-800">
              {{ tt('toyotaGuest.sdkError', 'The payment window could not load. Refresh the page and try again.') }}
            </p>
            <p v-if="isDev" class="mt-1 font-mono text-xs text-red-700">{{ sdkErrorHint }}</p>
          </div>
          <p v-else-if="!sdkReady" class="text-sm text-gray-500">
            {{ tt('toyotaGuest.sdkLoading', 'Loading payment options…') }}
          </p>
          <p v-else-if="!formValid" class="text-sm text-gray-500">
            {{ tt('toyotaGuest.fillAll', 'Fill in all four values to pay.') }}
          </p>
        </div>

        <p class="mt-4 text-xs text-gray-400">
          {{ tt('toyotaGuest.refundNote', 'You are charged once. If the calculator returns nothing, the payment is refunded automatically.') }}
        </p>
      </div>

      <!-- Working: this one really can take two minutes -->
      <div v-if="working" class="mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-5 text-center">
        <div class="flex items-center justify-center gap-3">
          <svg class="h-6 w-6 animate-spin text-amber-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span class="text-3xl font-black tabular-nums text-amber-700">
            {{ countdown > 0 ? formattedCountdown : tt('toyotaGuest.almost', 'Almost done…') }}
          </span>
        </div>
        <p class="mt-3 text-sm font-bold text-amber-900">
          {{ tt('toyotaGuest.doNotLeave', 'Please do not close or refresh this page') }}
        </p>
        <p class="mt-1 text-xs text-amber-700">
          {{ tt('toyotaGuest.workingBody', 'Payment received. The calculation can take up to two minutes.') }}
        </p>
      </div>

      <div v-if="result || failed || errorMessage" class="mt-6">
        <button
          type="button"
          class="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
          @click="reset"
        >
          {{ tt('toyotaGuest.newCalc', 'New calculation') }}
        </button>
      </div>
    </div>

    <!-- Failed → refunded + WhatsApp -->
    <div v-if="failed" class="mx-6 mb-6 sm:mx-8 rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-5" role="alert">
      <p class="text-base font-semibold text-amber-900">
        {{ tt('toyotaGuest.failedTitle', 'We could not calculate this passcode') }}
      </p>
      <p class="mt-1 text-sm text-amber-800">
        {{ refunded
          ? tt('toyotaGuest.failedRefunded', 'Your payment has been refunded. Send us the values on WhatsApp and we will check them.')
          : tt('toyotaGuest.failedRefunding', 'Your payment is being refunded. Send us the values on WhatsApp and we will check them.') }}
      </p>
      <p class="mt-3 font-mono text-sm tracking-wider text-amber-900">{{ lastVin }}</p>

      <a
        :href="whatsappLink"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.83 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.24-.02-.38.1-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
        </svg>
        {{ tt('toyotaGuest.whatsapp', 'Contact us on WhatsApp') }}
      </a>
    </div>

    <div v-else-if="errorMessage" class="mx-6 mb-6 sm:mx-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4" role="alert">
      <p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
    </div>

    <!-- Result -->
    <div v-if="result" class="border-t border-gray-200 bg-gray-50 px-6 py-6 sm:px-8" aria-live="polite">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {{ tt('toyotaGuest.vin', 'VIN') }}
          </p>
          <p class="mt-1 font-mono text-base font-bold tracking-[0.15em] text-gray-700 break-all">{{ result.vin }}</p>

          <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {{ tt('toyotaGuest.passcode', 'Passcode') }}
          </p>
          <p class="mt-1 font-mono text-3xl font-black tracking-[0.18em] text-gray-900">{{ result.passcode }}</p>
        </div>

        <button
          type="button"
          class="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          @click="copyResult"
        >
          {{ copied ? tt('toyotaGuest.copied', 'Copied') : tt('toyotaGuest.copy', 'Copy passcode') }}
        </button>
      </div>

      <p v-if="result.emailed" class="mt-5 text-sm text-green-700">
        {{ tt('toyotaGuest.emailSent', 'A copy has been sent to') }}
        <b>{{ result.email }}</b>
      </p>
      <p v-else class="mt-5 text-sm text-gray-500">
        {{ tt('toyotaGuest.emailFailed', 'We could not email this result. Please copy it before leaving the page.') }}
      </p>

      <!-- Free retries -->
      <div v-if="retriesLeft > 0" class="mt-6 rounded-xl border border-gray-200 bg-white px-5 py-4">
        <p class="text-sm font-semibold text-gray-900">
          {{ tt('toyotaGuest.retryTitle', 'Passcode did not work?') }}
        </p>
        <p class="mt-1 text-sm text-gray-600">
          {{ tt('toyotaGuest.retryBody', 'If you misread the last three characters of Data 1, correct them and recalculate. No extra charge.') }}
          <b>{{ retriesLeft }}</b>
          {{ retriesLeft === 1 ? tt('toyotaGuest.retryLeft1', 'retry left') : tt('toyotaGuest.retryLeft', 'retries left') }}.
        </p>

        <div v-if="retryOpen" class="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            v-for="f in dataFields"
            :key="`r-${f.key}`"
            v-model="retryForm[f.key]"
            type="text"
            :placeholder="f.label"
            class="rounded-lg border-2 border-gray-200 px-3 py-2.5 font-mono text-sm uppercase tracking-wider focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            @input="onRetryInput(f.key, $event)"
          >
        </div>

        <div class="mt-4 flex flex-wrap gap-3">
          <button
            v-if="!retryOpen"
            type="button"
            class="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
            @click="openRetry"
          >
            {{ tt('toyotaGuest.retryOpen', 'Correct the data') }}
          </button>
          <button
            v-else
            type="button"
            :disabled="retrying"
            class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300"
            @click="submitRetry"
          >
            {{ retrying ? tt('toyotaGuest.retrying', 'Recalculating…') : tt('toyotaGuest.retrySubmit', 'Recalculate free') }}
          </button>
        </div>

        <p v-if="retryError" class="mt-3 text-sm font-medium text-red-600">{{ retryError }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  endpoint?: string
  price?: number
  currency?: string
  paypalClientId?: string
  whatsappPhone?: string
}>(), {
  endpoint: '/toyota/guest',
  price: 25,
  currency: 'USD',
  paypalClientId: '',
  whatsappPhone: '905376266092',
})

const emit = defineEmits<{
  (e: 'pay', payload: any): void
  (e: 'success', payload: any): void
  (e: 'error', payload: any): void
}>()

const { t, te } = useI18n()
const { public: pub } = useRuntimeConfig()
const API_BASE_URL = (pub as any).API_BASE_URL

function tt(key: string, fallback: string) {
  return te(key) ? t(key) : fallback
}

/* ─────────── state ─────────── */
const form = reactive({ vin: '', data1: '', data2: '', data3: '' })
const email = ref('')
const emailTouched = ref(false)
const working = ref(false)
const copied = ref(false)
const errorMessage = ref('')
const failed = ref(false)
const refunded = ref(false)
const lastVin = ref('')

const sdkReady = ref(false)
const sdkError = ref(false)
const sdkErrorReason = ref('')
const paypalMount = ref<HTMLElement | null>(null)

const order = ref<{ reference: string, accessToken: string } | null>(null)

const result = ref<{ vin: string, passcode: string, emailed: boolean, email: string } | null>(null)
const retriesUsed = ref(0)

const dataFields = computed(() => [
  { key: 'data1' as const, label: tt('toyotaGuest.data1', 'Data 1'), placeholder: '3A2B1C0D' },
  { key: 'data2' as const, label: tt('toyotaGuest.data2', 'Data 2'), placeholder: '5E4F' },
  { key: 'data3' as const, label: tt('toyotaGuest.data3', 'Data 3'), placeholder: '9G8H' },
])

const locked = computed(() => working.value || !!result.value || failed.value)
const price = computed(() => props.price)

/* ─────────── validation ─────────── */
const vinOk = computed(() => /^[A-Z0-9]{17}$/.test(form.vin))
const emailValid = computed(() => !email.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))
const showEmailError = computed(() => emailTouched.value && !emailValid.value)

const formValid = computed(() =>
  vinOk.value
  && form.data1.length > 0
  && form.data2.length > 0
  && form.data3.length > 0)

const canPay = computed(() => formValid.value && emailValid.value && !locked.value)

/* O is never a real character in these readouts — the tool only outputs 0. */
function onInput(key: 'vin' | 'data1' | 'data2' | 'data3', e: Event) {
  const el = e.target as HTMLInputElement
  let v = el.value.toUpperCase().replace(/\s/g, '')
  if (key === 'vin') {
    v = v.replace(/[^A-Z0-9]/g, '').slice(0, 17)
  } else {
    v = v.replace(/O/g, '0')
  }
  form[key] = v
  el.value = v
  clearFeedback()
}

function money(value: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency', currency: props.currency, maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${props.currency} ${value}`
  }
}

const whatsappLink = computed(() => {
  const message = `${tt('toyotaGuest.waMessage', 'Hello, I need help with a Toyota passcode for this VIN')}: ${lastVin.value}`
  return `https://api.whatsapp.com/send?phone=${props.whatsappPhone}&text=${encodeURIComponent(message)}`
})

/* ─────────── countdown ─────────── */
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const formattedCountdown = computed(() => {
  const s = Math.max(0, countdown.value)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
})

function startCountdown() {
  stopCountdown()
  countdown.value = 130
  countdownTimer = setInterval(() => { if (countdown.value > 0) countdown.value-- }, 1000)
}

function stopCountdown() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
}

/* Warn before leaving while a paid calculation is running. */
function beforeUnload(e: BeforeUnloadEvent) {
  if (working.value) { e.preventDefault(); e.returnValue = '' }
}

/* ─────────── PayPal SDK ─────────── */
const clientId = computed(() => props.paypalClientId || (pub as any).PAYPAL_CLIENT_ID || '')
const isDev = import.meta.dev === true

const sdkErrorHint = computed(() => {
  if (sdkErrorReason.value === 'no-client-id') {
    return 'No client id reached the browser. Set runtimeConfig.public.PAYPAL_CLIENT_ID (env: NUXT_PUBLIC_PAYPAL_CLIENT_ID).'
  }
  return `SDK blocked or rejected for client-id=${clientId.value.slice(0, 8)}… — check the Network tab, ad blockers and CSP.`
})

function loadPayPal(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  const w = window as any
  if (w.paypal) return Promise.resolve(w.paypal)
  if (w.__paypalSdkPromise) return w.__paypalSdkPromise

  w.__paypalSdkPromise = new Promise((resolve, reject) => {
    if (!clientId.value) return reject(new Error('no-client-id'))
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
    console.error('[TOYOTA GUEST] PayPal SDK failed:', e)
    emit('error', e)
    return
  }

  buttonsInstance = paypal.Buttons({
    style: { layout: 'vertical', shape: 'rect', color: 'gold', label: 'paypal', height: 48 },

    onInit: (_d: any, actions: any) => {
      const sync = () => (canPay.value ? actions.enable() : actions.disable())
      sync()
      watch(canPay, sync)
    },

    onClick: (_d: any, actions: any) => {
      emailTouched.value = true
      if (!canPay.value) {
        errorMessage.value = !formValid.value
          ? tt('toyotaGuest.fillAll', 'Fill in all four values to pay.')
          : tt('toyotaGuest.emailInvalid', 'Check this email address.')
        return actions.reject()
      }
      return actions.resolve()
    },

    // Our server sets the price — the browser never does.
    createOrder: async () => {
      if (!canPay.value) throw new Error('invalid input')
      clearFeedback()

      const res: any = await $fetch(`${API_BASE_URL}${props.endpoint}/orders`, {
        method: 'POST',
        body: { ...form, email: email.value || undefined },
      })

      order.value = { reference: res.reference, accessToken: res.access_token }
      lastVin.value = form.vin
      rememberOrder()
      emit('pay', res)

      return res.paypal_order_id
    },

    onApprove: async () => {
      working.value = true
      startCountdown()
      try {
        await captureOrder()
      } finally {
        working.value = false
        stopCountdown()
      }
    },

    onCancel: () => {
      errorMessage.value = tt('toyotaGuest.cancelled', 'Payment cancelled. Nothing was charged.')
    },

    onError: (err: any) => {
      if (!formValid.value) {
        errorMessage.value = tt('toyotaGuest.fillAll', 'Fill in all four values to pay.')
      } else {
        errorMessage.value = tt('toyotaGuest.payError', 'The payment could not be started. Try again in a moment.')
      }
      emit('error', err)
    },
  })

  if (buttonsInstance.isEligible?.() === false) {
    sdkError.value = true
    sdkErrorReason.value = 'ineligible'
    return
  }

  try {
    await buttonsInstance.render(paypalMount.value)
  } catch (e) {
    sdkError.value = true
    sdkErrorReason.value = 'render-failed'
    console.error('[TOYOTA GUEST] render failed:', e)
  }
}

/* ─────────── capture ───────────
 * The calculator can take 120s. If a proxy kills this request at 60s the
 * server carries on and writes the result, so a timeout falls through to
 * polling rather than telling a paying customer that something broke.
 */
async function captureOrder() {
  if (!order.value) return

  try {
    const res: any = await $fetch(
      `${API_BASE_URL}${props.endpoint}/orders/${order.value.reference}/capture`,
      { method: 'POST', headers: { 'X-Order-Token': order.value.accessToken } },
    )
    applyOrderState(res)
  } catch (err: any) {
    const status = err?.status ?? err?.statusCode ?? err?.response?.status
    const body = err?.data ?? err?.response?._data ?? {}

    if (status === 404 && body?.not_found) {
      applyOrderState(body)
      return
    }

    if (status === 402) {
      errorMessage.value = body?.error || tt('toyotaGuest.paymentFailed', 'The payment did not go through. Nothing was charged.')
      return
    }

    // Timeout, 502, 504 — the calculation may still be running. Poll for it.
    console.warn('[TOYOTA GUEST] capture did not return cleanly, polling instead:', status)
    await pollForResult()
  }
}

async function pollForResult() {
  if (!order.value) return

  const deadline = Date.now() + 180_000

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000))

    try {
      const res: any = await $fetch(
        `${API_BASE_URL}${props.endpoint}/orders/${order.value.reference}`,
        { headers: { 'X-Order-Token': order.value.accessToken } },
      )

      if (['fulfilled', 'unfulfilled', 'refunded', 'failed'].includes(res?.status)) {
        applyOrderState(res)
        return
      }
    } catch { /* keep polling — a single failed poll means nothing */ }
  }

  errorMessage.value = tt(
    'toyotaGuest.stillRunning',
    'This is taking longer than expected. Your passcode will be emailed to you as soon as it is ready — you have not been charged twice.',
  )
}

function applyOrderState(body: any) {
  if (body?.status === 'fulfilled' && body?.result?.passcode) {
    result.value = {
      vin: String(body.vin ?? lastVin.value),
      passcode: String(body.result.passcode),
      emailed: Boolean(body.emailed),
      email: String(body.email ?? email.value ?? ''),
    }
    retriesUsed.value = Number(body.result.retries_used ?? 0)
    failed.value = false
    forgetOrder()
    emit('success', body)
    return
  }

  if (body?.not_found || ['unfulfilled', 'refunded'].includes(body?.status)) {
    failed.value = true
    refunded.value = body?.status === 'refunded' || Boolean(body?.refunded)
    forgetOrder()
    emit('error', body)
    return
  }

  if (body?.status === 'failed') {
    errorMessage.value = tt('toyotaGuest.paymentFailed', 'The payment did not go through. Nothing was charged.')
    forgetOrder()
  }
}

/* ─────────── free retries ─────────── */
const MAX_RETRIES = 2
const retriesLeft = computed(() => Math.max(0, MAX_RETRIES - retriesUsed.value))
const retryOpen = ref(false)
const retrying = ref(false)
const retryError = ref('')
const retryForm = reactive({ data1: '', data2: '', data3: '' })

function openRetry() {
  retryForm.data1 = form.data1
  retryForm.data2 = form.data2
  retryForm.data3 = form.data3
  retryOpen.value = true
}

function onRetryInput(key: 'data1' | 'data2' | 'data3', e: Event) {
  const el = e.target as HTMLInputElement
  const v = el.value.toUpperCase().replace(/\s/g, '').replace(/O/g, '0')
  retryForm[key] = v
  el.value = v
  retryError.value = ''
}

async function submitRetry() {
  if (!order.value || retrying.value) return
  retrying.value = true
  retryError.value = ''

  try {
    const res: any = await $fetch(
      `${API_BASE_URL}${props.endpoint}/orders/${order.value.reference}/retry`,
      { method: 'POST', headers: { 'X-Order-Token': order.value.accessToken }, body: { ...retryForm } },
    )
    Object.assign(form, retryForm)
    applyOrderState(res)
    retryOpen.value = false
  } catch (err: any) {
    const body = err?.data ?? err?.response?._data ?? {}
    retryError.value = body?.error || tt('toyotaGuest.retryFailed', 'That retry did not produce a passcode.')
    if (body?.retries_used != null) retriesUsed.value = Number(body.retries_used)
  } finally {
    retrying.value = false
  }
}

/* ─────────── recovery ─────────── */
const STORAGE_KEY = 'tlk.toyotaOrder'

function rememberOrder() {
  try {
    if (order.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...order.value, vin: form.vin, at: Date.now() }))
    }
  } catch { /* private mode */ }
}

function forgetOrder() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

async function recoverOrder() {
  let saved: any = null
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return }

  if (!saved?.reference || !saved?.accessToken || Date.now() - (saved.at ?? 0) > 3600_000) {
    forgetOrder()
    return
  }

  order.value = { reference: saved.reference, accessToken: saved.accessToken }
  form.vin = saved.vin ?? ''
  lastVin.value = saved.vin ?? ''

  try {
    const res: any = await $fetch(`${API_BASE_URL}${props.endpoint}/orders/${saved.reference}`, {
      headers: { 'X-Order-Token': saved.accessToken },
    })

    if (res?.status === 'pending') { forgetOrder(); return }

    // Paid and still running — pick the countdown back up.
    if (['paid', 'processing'].includes(res?.status)) {
      working.value = true
      startCountdown()
      await pollForResult()
      working.value = false
      stopCountdown()
      return
    }

    applyOrderState(res)
  } catch {
    forgetOrder()
  }
}

/* ─────────── misc ─────────── */
function clearFeedback() {
  errorMessage.value = ''
  failed.value = false
  refunded.value = false
}

async function copyResult() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value.passcode)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { copied.value = false }
}

function reset() {
  form.vin = ''
  form.data1 = ''
  form.data2 = ''
  form.data3 = ''
  lastVin.value = ''
  emailTouched.value = false
  result.value = null
  order.value = null
  working.value = false
  retriesUsed.value = 0
  retryOpen.value = false
  retryError.value = ''
  clearFeedback()
  forgetOrder()
}

onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnload)
  await recoverOrder()
  if (!result.value && !failed.value) await mountButtons()
})

onBeforeUnmount(() => {
  stopCountdown()
  window.removeEventListener('beforeunload', beforeUnload)
})

defineExpose({ reset, recoverOrder })
</script>