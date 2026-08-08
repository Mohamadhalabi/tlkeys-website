<template>
  <section class="rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
    <header class="border-b border-gray-200 px-6 py-5 sm:px-8 sm:py-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">
            {{ tt('pincode.calcTitle', 'Kia / Hyundai PIN calculator') }}
          </h3>
          <p class="mt-1.5 text-sm sm:text-base text-gray-500">
            {{ tt('pincode.calcSubtitle', 'Enter the VIN and we read the model year from it automatically.') }}
          </p>
        </div>

        <div v-if="authenticated && balancesLoaded" class="flex gap-2">
          <div
            v-for="b in balanceChips"
            :key="b.type"
            class="rounded-lg px-3 py-2 text-center ring-1"
            :class="b.type === tokenType ? 'bg-orange-50 ring-orange-300' : 'bg-gray-50 ring-gray-200'"
          >
            <p class="text-lg font-extrabold leading-none" :class="b.count > 0 ? 'text-gray-900' : 'text-gray-400'">
              {{ b.count }}
            </p>
            <p class="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
              {{ b.label }}
            </p>
          </div>
        </div>
      </div>
    </header>

    <form class="px-6 py-6 sm:px-8 sm:py-8" novalidate @submit.prevent="submit">
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
          :placeholder="tt('pincode.vinPlaceholder', 'KNADN512AF6123456')"
          class="mt-2 w-full rounded-xl border-2 px-4 py-4 font-mono text-lg sm:text-2xl uppercase tracking-[0.15em] text-gray-900 transition placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-gray-300 focus:outline-none focus:ring-4"
          :class="showVinError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
            : 'border-gray-200 focus:border-orange-600 focus:ring-orange-500/20'"
          :aria-invalid="showVinError"
          aria-describedby="pin-vin-help"
          @input="onVinInput"
          @blur="vinTouched = true"
        >
        <div id="pin-vin-help" class="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
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

      <div v-if="era && mode === 'empty'" class="mt-6 max-w-md rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-4">
        <p class="text-sm text-gray-700">
          {{ tt('pincode.noTokens', 'You have no tokens for this model year.') }}
        </p>
        <NuxtLinkLocale
          v-if="buyUrl"
          :to="localePath(buyUrl)"
          class="mt-2 inline-block text-sm font-semibold text-orange-700 underline underline-offset-2"
        >
          {{ tt('pincode.getTokens', 'Get tokens') }}
        </NuxtLinkLocale>
      </div>

      <div v-else-if="mode === 'login'" class="mt-6 max-w-md rounded-xl border-2 border-gray-200 px-4 py-4">
        <p class="text-sm text-gray-700">
          {{ tt('pincode.signInFirst', 'Log in to access the calculator.') }}
        </p>
        <NuxtLinkLocale
          :to="localePath('/login')"
          class="mt-2 inline-block text-sm font-semibold text-orange-700 underline underline-offset-2"
        >
          {{ tt('pincode.goToLogin', 'Sign in') }}
        </NuxtLinkLocale>
      </div>

      <div class="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          :disabled="!canSubmit"
          class="inline-flex items-center gap-2 rounded-xl bg-orange-700 px-7 py-4 text-base font-semibold text-white transition hover:bg-orange-800 focus:outline-none focus:ring-4 focus:ring-orange-500/30 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <svg v-if="loading" class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {{ loading ? tt('pincode.processing', 'Calculating…') : tt('pincode.getPin', 'Get PIN code') }}
        </button>

        <button
          v-if="result || errorMessage || notFound"
          type="button"
          class="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
          @click="reset"
        >
          {{ tt('pincode.newSearch', 'New search') }}
        </button>

        <p v-if="blockedReason" class="w-full text-sm text-gray-500">{{ blockedReason }}</p>
      </div>
    </form>

    <!-- Lookup failed → contact us on WhatsApp -->
    <div v-if="notFound" class="mx-6 mb-6 sm:mx-8 rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-5" role="alert">
      <p class="text-base font-semibold text-amber-900">
        {{ tt('pincode.notFoundTitle', 'We could not get this PIN code automatically') }}
      </p>
      <p class="mt-1 text-sm text-amber-800">
        {{ tt('pincode.notFoundBody', 'Please contact us and we will provide you this code on WhatsApp. Your token was not used.') }}
      </p>

      <p class="mt-3 font-mono text-sm tracking-wider text-amber-900">{{ lastVin }}</p>

      
       <a :href="whatsappLink"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.83 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.24-.02-.38.1-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
        </svg>
        {{ tt('pincode.contactWhatsapp', 'Contact us on WhatsApp') }}
      </a>
    </div>

    <!-- Auth / token / validation errors -->
    <div v-else-if="errorMessage" class="mx-6 mb-6 sm:mx-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4" role="alert">
      <p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
      <NuxtLinkLocale
        v-if="needsLogin"
        :to="localePath('/login')"
        class="mt-1 inline-block text-sm font-semibold text-red-900 underline underline-offset-2"
      >
        {{ tt('pincode.goToLogin', 'Sign in') }}
      </NuxtLinkLocale>
    </div>

    <!-- Result -->
    <div v-if="result" class="border-t border-gray-200 bg-gray-50 px-6 py-6 sm:px-8" aria-live="polite">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <dl class="grid gap-3 text-sm">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ tt('pincode.vin', 'VIN') }}
            </dt>
            <dd class="mt-1 font-mono text-xl font-bold tracking-[0.2em] text-gray-900 break-all">
              {{ result.vin }}
            </dd>
          </div>

          <div v-if="result.keyCode">
            <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ tt('pincode.keyCode', 'Key code') }}
            </dt>
            <dd class="mt-1 font-mono text-xl font-bold tracking-[0.2em] text-gray-900">
              {{ result.keyCode }}
            </dd>
          </div>

          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ tt('pincode.yourPin', 'PIN code') }}
            </dt>
            <dd class="mt-1 font-mono text-xl font-bold tracking-[0.2em] text-gray-900">
              {{ result.pin }}
            </dd>
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
import { ref, computed, watch, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  balancesEndpoint?: string
  calculateEndpoint?: string
  buyUrl?: string
  whatsappPhone?: string
}>(), {
  balancesEndpoint: '/pin-code/balances',
  calculateEndpoint: '/pin-code/calculate',
  buyUrl: '',
  whatsappPhone: '971504429045',
})

const emit = defineEmits<{
  (e: 'success', payload: any): void
  (e: 'error', payload: any): void
  (e: 'auth-required'): void
}>()

const { t, te } = useI18n()
const localePath = useLocalePath()
const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp() as any

function tt(key: string, fallback: string) {
  return te(key) ? t(key) : fallback
}

/* ─────────── state ─────────── */
const vin = ref('')
const era = ref<'' | 'pre2017' | 'post2017'>('')
const vinTouched = ref(false)
const loading = ref(false)
const copied = ref(false)
const errorMessage = ref('')
const needsLogin = ref(false)
const notFound = ref(false)
const lastVin = ref('')

const result = ref<{
  vin: string
  pin: string
  keyCode: string
  emailed: boolean
  email: string
} | null>(null)

const authenticated = ref(false)
const balancesLoaded = ref(false)
const balances = ref<Record<string, number>>({ kia_pre2017: 0, kia_post2017: 0 })

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

// The year picker is gone — the era always follows the VIN.
watch(detected, (d) => {
  era.value = d ? d.era : ''
})

/* ─────────── token type / balance ─────────── */
const tokenType = computed(() =>
  era.value === 'post2017' ? 'kia_post2017'
  : era.value === 'pre2017' ? 'kia_pre2017'
  : '')

const tokenBalance = computed(() => balances.value[tokenType.value] ?? 0)

/** 'login' | 'calculate' | 'empty' */
const mode = computed(() => {
  if (!authenticated.value) return 'login'
  if (tokenBalance.value > 0) return 'calculate'
  return 'empty'
})

const balanceChips = computed(() => [
  { type: 'kia_pre2017', count: balances.value.kia_pre2017 ?? 0, label: tt('pincode.chipPre', 'Pre-2017') },
  { type: 'kia_post2017', count: balances.value.kia_post2017 ?? 0, label: tt('pincode.chipPost', '2017+') },
])

/* ─────────── WhatsApp fallback ─────────── */
const whatsappLink = computed(() => {
  const message = `${tt('pincode.waMessage', 'Hello, I could not get a PIN code & Keycode for this VIN')}: ${lastVin.value}`
  return `https://api.whatsapp.com/send?phone=${props.whatsappPhone}&text=${encodeURIComponent(message)}`
})

/* ─────────── load balances ─────────── */
async function loadBalances() {
  try {
    const res = await $customApi(`${API_BASE_URL}${props.balancesEndpoint}`, { method: 'GET' })
    const body = res?.data ?? res
    if (body?.balances) balances.value = { ...balances.value, ...body.balances }
    authenticated.value = true
  } catch (err: any) {
    const status = err?.status ?? err?.statusCode ?? err?.response?.status
    authenticated.value = !(status === 401 || status === 403)
  } finally {
    balancesLoaded.value = true
  }
}

onMounted(loadBalances)

/* ─────────── submit gating ─────────── */
const canSubmit = computed(() =>
  !loading.value
  && vinValid.value
  && !!era.value
  && mode.value === 'calculate')

const blockedReason = computed(() => {
  if (loading.value || canSubmit.value) return ''
  if (!vinValid.value) return tt('pincode.needVin', 'Enter a valid 17-character VIN to continue.')
  if (mode.value === 'login') return tt('pincode.needLogin', 'Sign in to continue.')
  if (mode.value === 'empty') return tt('pincode.needTokens', 'You need a token for this model year.')
  return ''
})

/* ─────────── input handling ─────────── */
function onVinInput(e: Event) {
  const el = e.target as HTMLInputElement
  const clean = el.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17)
  vin.value = clean
  el.value = clean
  clearFeedback()
}

function clearFeedback() {
  result.value = null
  errorMessage.value = ''
  notFound.value = false
}

/* ─────────── submit ─────────── */
async function submit() {
  vinTouched.value = true
  if (!canSubmit.value) return
  await calculate()
}

async function calculate() {
  loading.value = true
  clearFeedback()
  needsLogin.value = false
  copied.value = false
  lastVin.value = vin.value

  try {
    const res = await $customApi(`${API_BASE_URL}${props.calculateEndpoint}`, {
      method: 'POST',
      body: { vin: vin.value },
    })

    const body = res?.data ?? res
    const pin = body?.pin_code ?? body?.pin ?? null

    // The server returns fresh balances on every reply — trust those.
    if (body?.balances) balances.value = { ...balances.value, ...body.balances }

    if (!pin || pin === 'xxx') {
      notFound.value = true
      emit('error', body)
      return
    }

    result.value = {
      vin: String(body?.vin ?? vin.value),
      pin: String(pin),
      keyCode: body?.key_code && body.key_code !== 'xxx' ? String(body.key_code) : '',
      emailed: Boolean(body?.emailed),
      email: String(body?.email ?? ''),
    }
    emit('success', body)
  } catch (err: any) {
    handleError(err)
    emit('error', err)
  } finally {
    loading.value = false
  }
}

function handleError(err: any) {
  const status = err?.status ?? err?.statusCode ?? err?.response?.status
  const body = err?.data ?? err?.response?._data ?? {}
  const apiMessage = body?.error ?? body?.message

  if (body?.balances) balances.value = { ...balances.value, ...body.balances }

  // Auth, tokens and validation keep their own specific messages —
  // telling these users to "contact us on WhatsApp" would be wrong.
  if (status === 401 || status === 403) {
    authenticated.value = false
    needsLogin.value = true
    errorMessage.value = apiMessage || tt('pincode.errAuth', 'Your session has expired. Sign in to continue.')
    emit('auth-required')
    return
  }
  if (status === 402) {
    balances.value = { ...balances.value, [tokenType.value]: 0 }
    errorMessage.value = apiMessage || tt('pincode.errCredits', 'You have no tokens left for this model year.')
    return
  }
  if (status === 422) {
    errorMessage.value = apiMessage || tt('pincode.errInvalid', 'This VIN was rejected. Check each character.')
    return
  }
  if (status === 429) {
    errorMessage.value = apiMessage || tt('pincode.errRate', 'Too many requests. Wait a moment.')
    return
  }

  // Everything else is a lookup failure (404 / 500 / 502 / network drop):
  // the token was refunded server-side, so offer the WhatsApp route.
  notFound.value = true
  console.error('[PIN CODE] error:', err)
}

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
  era.value = ''
  lastVin.value = ''
  needsLogin.value = false
  vinTouched.value = false
  clearFeedback()
}

defineExpose({
  calculate,
  reset,
  loadBalances,
  setVin: (v: string) => { vin.value = v.toUpperCase() },
})
</script>