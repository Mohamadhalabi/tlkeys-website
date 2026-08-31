<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useNuxtApp, useRuntimeConfig, useHead, useCookie } from '#imports'
import { useI18n } from 'vue-i18n'

definePageMeta({
  layout: 'pincode_layout',
  analytics: false,
})

type ApiResponse = {
  error?: string
  message?: string
  status?: string
  errors?: { vin?: string[] }
  vin?: string
  key_code?: string | null
  pin_code?: string | null
  requests_today?: number
  requests_this_month?: number
  requests_left_today?: number
  requests_left_month?: number
  has_token?: number
  available_in_db?: boolean
  show_cached_indicator?: boolean
}

const vin = ref('')
const usernameInput = ref('')
const passwordInput = ref('')
const keyCode = ref('')
const pinCode = ref('')
const showVinError = ref(false)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const hasToken = ref(false)
const requestsThisMonth = ref<number>(0)
const tokensLeft = ref<number | null>(null)
const greenTextState = ref(false)
const showCachedIndicator = ref(false)
const forceOrder = ref(false)

const { $customApi } = useNuxtApp()
const { public: { API_BASE_URL, API_KEY, SECRET_KEY } } = useRuntimeConfig()
const { t, locale } = (useI18n?.() as any) || { t: (s: string) => s, locale: ref('en') }

const currencyCookie = useCookie<string>('currency', { default: () => 'USD', sameSite: 'lax', path: '/' })

/**
 * Short-lived bearer token from /vin-to-pin/login. The password is never
 * stored client-side, so a stolen cookie expires on its own in 12h.
 */
const tokenCookie = useCookie<string | null>('vp_token_vin', {
  default: () => null,
  maxAge: 12 * 3600,
  sameSite: 'strict',
  secure: true,
  path: '/',
  domain: '.tlkeys.com',
})

const isLoggedIn = computed(() => !!tokenCookie.value)
const lang = () => String(locale?.value || 'en')

function baseHeaders() {
  return {
    'Accept-Language': lang(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'currency': currencyCookie.value || 'USD',
    'secret-key': SECRET_KEY,
    'api-key': API_KEY,
  }
}

function authHeaders() {
  return { ...baseHeaders(), 'X-VinPin-Token': tokenCookie.value || '' }
}

onMounted(() => {
  if (tokenCookie.value) loadStats().catch(() => doLogout())
})

watch(vin, (v) => { if (v.length === 17) showVinError.value = false })

function formatVin() {
  vin.value = vin.value.replace(/o/gi, '0').toUpperCase().slice(0, 17)
}

const successState = computed(() => !!(keyCode.value && pinCode.value))
const disabled = computed(() => isLoading.value || vin.value.length !== 17)

async function loadStats() {
  const res: any = await $customApi(`/check-user`, {
    method: 'POST',
    headers: authHeaders(),
    body: { api_type: 'new' },
  })

  const data = (res?.data && typeof res.data === 'object') ? res.data : res

  hasToken.value = !!data.has_token
  requestsThisMonth.value = data.requests_this_month || 0
  tokensLeft.value = data.tokens_left ?? null

  // Server-side flag. Replaces the old hardcoded username comparison,
  // which put a customer's credential in the public JS bundle.
  showCachedIndicator.value = !!data.show_cached_indicator
}

async function handleLogin() {
  if (!usernameInput.value || !passwordInput.value) return

  isLoading.value = true
  errorMessage.value = null

  try {
    const res: any = await $customApi(`/vin-to-pin/login`, {
      method: 'POST',
      headers: baseHeaders(),
      body: { username: usernameInput.value, password: passwordInput.value, scope: 'vin' },
    })

    const data = (res?.data && typeof res.data === 'object') ? res.data : res

    if (!data?.token) throw new Error(data?.error || 'Login failed')

    tokenCookie.value = data.token
    passwordInput.value = ''       // not kept in memory after use

    await loadStats()
  } catch (e: any) {
    errorMessage.value = e?.data?.error || e?.response?.data?.error || e?.message || t('vin_to_pin.generic_error')
    doLogout()
  } finally {
    isLoading.value = false
  }
}

function doLogout() {
  if (tokenCookie.value) {
    // Fire-and-forget: the cookie clears either way, so a failed network
    // call cannot leave the user stuck logged in.
    $customApi(`/vin-to-pin/logout`, {
      method: 'POST',
      headers: authHeaders(),
    }).catch(() => {})
  }

  tokenCookie.value = null
  usernameInput.value = ''
  passwordInput.value = ''
  vin.value = ''
  keyCode.value = ''
  pinCode.value = ''
  errorMessage.value = null
  forceOrder.value = false
  greenTextState.value = false
}

async function handleSubmit(isRetry = false) {
  if (!isRetry) forceOrder.value = false

  if (vin.value.length !== 17) { showVinError.value = true; return }

  showVinError.value = false
  errorMessage.value = null

  if (!isRetry) {
    keyCode.value = ''
    pinCode.value = ''
    greenTextState.value = false
  }

  isLoading.value = true

  try {
    const res: any = await $customApi(`/vin-to-pin-new`, {
      method: 'POST',
      headers: authHeaders(),
      // No username in the body: the server reads it from the token, so
      // one account cannot spend another's quota.
      body: { vin: vin.value, force_order: forceOrder.value },
    })

    const data: ApiResponse = (res?.data && typeof res.data === 'object') ? res.data : res

    if (data?.status === 'requires_confirmation') {
      isLoading.value = false

      if (confirm('This VIN is not in the database. Would you like to order it from the external server?')) {
        forceOrder.value = true
        await handleSubmit(true)
      } else {
        errorMessage.value = 'Order cancelled.'
      }

      return
    }

    if (data?.error) {
      errorMessage.value = data.error
    } else if (data?.vin === 'Not Correct Vin') {
      errorMessage.value = t('vin_to_pin.invalid_vin')
    } else {
      keyCode.value = data?.key_code || ''
      pinCode.value = data?.pin_code || ''

      requestsThisMonth.value = data?.requests_this_month ?? requestsThisMonth.value

      if (data?.has_token) {
        tokensLeft.value = data?.requests_left_month ?? tokensLeft.value
      }

      if (data?.available_in_db && showCachedIndicator.value) greenTextState.value = true
    }
  } catch (e: any) {
    const status = e?.response?.status ?? e?.status ?? e?.statusCode

    if (status === 401) {
      errorMessage.value = 'Session expired. Please log in again.'
      doLogout()
    } else if (status === 429) {
      errorMessage.value = 'Too many requests. Please wait a moment.'
    } else if (e?.data?.errors?.vin?.[0]) {
      errorMessage.value = e.data.errors.vin[0]
    } else {
      errorMessage.value = e?.data?.error || e?.response?.data?.error || t('vin_to_pin.generic_error')
    }
  } finally {
    isLoading.value = false
  }
}

function copyToClipboard() {
  navigator.clipboard.writeText(`*${vin.value}*\n${keyCode.value}\n${pinCode.value}`).catch(() => {})
}

useHead(() => ({
  title: t('vin_to_pin.page_title'),
  meta: [
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
    { name: 'googlebot', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
  ],
}))
</script>

<template>
  <main
    class="relative min-h-screen bg-black flex items-start justify-center"
    :dir="(locale === 'ar' || locale?.value === 'ar') ? 'rtl' : 'ltr'"
  >
    <button
      v-if="isLoggedIn"
      type="button"
      class="logout-button absolute top-4 right-4 sm:top-6 sm:right-6 !h-[42px] !text-sm"
      @click="doLogout"
    >
      Logout
    </button>

    <div class="w-full max-w-[760px] px-4 m-auto">
      <h3 class="text-white text-center font-semibold tracking-wide text-[22px] mt-16 mb-6">
        {{ $t('vin_to_pin.title') }}
      </h3>

      <div
        v-if="errorMessage"
        class="mx-auto mb-5 max-w-[680px] text-center rounded-md border border-red-400 bg-red-400 text-white text-xl px-4 py-3 text-sm"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <transition name="fade">
        <div v-if="isLoading" class="fixed inset-0 z-10 bg-black/55 flex items-center justify-center">
          <div class="h-12 w-12 rounded-full border-4 border-white/25 border-t-white animate-spin"></div>
        </div>
      </transition>

      <form v-if="!isLoggedIn" @submit.prevent="handleLogin" class="flex flex-col items-center">
        <div class="row-gap">
          <input
            type="text"
            v-model="usernameInput"
            required
            autocomplete="username"
            :placeholder="$t('vin_to_pin.username_placeholder') || 'Username'"
            class="pill-input username-width"
          />
        </div>

        <div class="row-gap">
          <input
            type="password"
            v-model="passwordInput"
            required
            autocomplete="current-password"
            placeholder="Password"
            class="pill-input username-width"
          />
        </div>

        <button type="submit" class="get-button" :disabled="isLoading">
          <span>{{ isLoading ? 'Loading...' : 'LOGIN' }}</span>
        </button>
      </form>

      <div v-else>
        <div class="mx-auto mb-5 max-w-[680px] text-center text-zinc-400 text-md text-white font-medium">
          <template v-if="hasToken">
            Tokens Left: <span class="text-green-400">{{ tokensLeft }}</span> | Used this month: {{ requestsThisMonth }}
          </template>
          <template v-else>
            Used this month: {{ requestsThisMonth }}
          </template>
        </div>

        <form @submit.prevent="() => handleSubmit(false)" class="flex flex-col items-center">
          <div class="row-gap">
            <div
              v-if="showVinError"
              class="mx-auto mb-2 max-w-[680px] rounded-md border border-red-400 bg-red-500/10 text-red-200 px-3 py-2 text-sm"
              role="alert"
            >
              {{ $t('vin_to_pin.vin_size') }}
            </div>
            <input
              type="text"
              v-model="vin"
              @input="formatVin"
              maxlength="17"
              required
              autocomplete="off"
              :placeholder="$t('vin_to_pin.vin_placeholder')"
              class="pill-input vin-width"
              :class="[successState ? 'success-border' : '', greenTextState ? 'green-text' : '']"
            />
          </div>

          <div class="row-gap">
            <input
              type="text"
              v-model="keyCode"
              :placeholder="$t('vin_to_pin.key_code_placeholder')"
              readonly
              class="pill-input key-width"
              :class="[successState ? 'success-border' : '', greenTextState ? 'green-text' : '']"
            />
          </div>

          <div class="row-gap">
            <input
              type="text"
              v-model="pinCode"
              :placeholder="$t('vin_to_pin.pin_code_placeholder')"
              readonly
              class="pill-input pin-width pin-accent"
              :class="[successState ? 'success-border' : '', greenTextState ? 'green-text' : '']"
            />
          </div>

          <div class="actions-row">
            <button type="submit" class="get-button" :disabled="disabled">
              <span>{{ isLoading ? $t('vin_to_pin.loading') : $t('vin_to_pin.get_button') }}</span>
            </button>

            <button
              v-if="keyCode && pinCode && !isLoading"
              type="button"
              class="copy-button"
              @click="copyToClipboard"
            >
              {{ $t('vin_to_pin.copy_button') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<style scoped>
.row-gap { margin: 20px 0; }
.actions-row {
  display: flex; align-items: center; justify-content: center;
  gap: 14px; margin-top: 26px; flex-wrap: wrap;
}

.pill-input {
  height: 56px;
  background: #E40000;
  border: 2px solid #6b6b6b;
  color: #f2f2f2;
  border-radius: 14px;
  outline: none;
  text-align: center;
  font-size: 20px;
  line-height: 1;
  padding: 0 18px;
  display: block;
  margin-left: auto; margin-right: auto;
}
.pill-input::placeholder { color: #f2f2f2; opacity: 0.9; }
.pill-input:focus { border-color: #9a9a9a; }

.vin-width      { width: 680px; max-width: 92vw; }
.username-width { width: 420px; max-width: 86vw; }
.key-width      { width: 320px; max-width: 82vw; }
.pin-width      { width: 360px; max-width: 84vw; }

.success-border {
  border-color: #ffffff !important;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.15);
}

.pin-accent { box-shadow: 0 0 0 2px rgba(97,195,166,0.35); }

.green-text { color: #00ff00 !important; }

.get-button {
  width: 220px; height: 56px;
  background: #5fb99c;
  color: #ffffff; border: none; border-radius: 16px;
  font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  font-size: 20px;
  display: inline-flex; align-items: center; justify-content: center;
}
.get-button:disabled { opacity: 0.7; cursor: not-allowed; }

.copy-button {
  height: 56px; padding: 0 20px; border-radius: 16px;
  border: 2px solid #5fb99c; background: #222; color: #e7fff6;
  font-weight: 700; letter-spacing: 0.3px;
}

.logout-button {
  height: 56px; padding: 0 20px; border-radius: 16px;
  border: 2px solid #6b6b6b; background: transparent; color: #9a9a9a;
  font-weight: 700; font-size: 16px; transition: 0.2s;
}
.logout-button:hover { color: #fff; border-color: #fff; }

.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .pill-input { height: 54px; font-size: 18px; }
  .get-button, .copy-button, .logout-button { height: 54px; font-size: 18px; }
}
</style>