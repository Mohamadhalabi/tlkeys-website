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

const { $customApi } = useNuxtApp()
const { public: { API_BASE_URL, API_KEY, SECRET_KEY } } = useRuntimeConfig()
const { t, locale } = (useI18n?.() as any) || { t: (s: string) => s, locale: ref('en') }

const currencyCookie = useCookie<string>('currency', { default: () => 'USD', sameSite: 'lax', path: '/' })

/**
 * Short-lived token from /vin-to-pin/login. Separate cookie from the new
 * page so the two lookups can be logged in independently.
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

/**
 * A dedicated header, not Authorization: plugins/auth.client.ts already
 * puts the site's own JWT there on every request, which would overwrite
 * this one and cause an immediate 401.
 */
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
    body: { api_type: 'old' },
  })

  const data = (res?.data && typeof res.data === 'object') ? res.data : res

  hasToken.value = !!data.has_token
  requestsThisMonth.value = data.requests_this_month || 0
  tokensLeft.value = data.tokens_left ?? null

  // Server-side flag, replacing the old hardcoded username comparison
  // that put a customer's credential in the public JS bundle.
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
  greenTextState.value = false
}

async function handleSubmit() {
  if (vin.value.length !== 17) { showVinError.value = true; return }

  showVinError.value = false
  errorMessage.value = null
  keyCode.value = ''
  pinCode.value = ''
  greenTextState.value = false

  isLoading.value = true

  try {
    const res: any = await $customApi(`/vin-to-pin-old`, {
      method: 'POST',
      headers: authHeaders(),
      // No username in the body: the server reads it from the token, so
      // one account cannot spend another's quota.
      body: { vin: vin.value },
    })

    const data: ApiResponse = (res?.data && typeof res.data === 'object') ? res.data : res

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
  navigator.clipboard.writeText(`${vin.value}\n${keyCode.value}\n${pinCode.value}`).catch(() => {})
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
      <h2 class="text-white text-center font-semibold tracking-wide text-[22px] mt-16 mb-6">
        {{ $t('vin_to_pin.title') }}
      </h2>

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
        <input
          type="text"
          v-model="usernameInput"
          required
          autocomplete="username"
          :placeholder="$t('vin_to_pin.username_placeholder') || 'Username'"
          class="pill-input username-width"
        />

        <input
          type="password"
          v-model="passwordInput"
          required
          autocomplete="current-password"
          placeholder="Password"
          class="pill-input username-width"
        />

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

        <form @submit.prevent="handleSubmit" class="flex flex-col items-center">
          <input
            type="text"
            v-model="vin"
            @input="formatVin"
            maxlength="17"
            required
            autocomplete="off"
            :placeholder="$t('vin_to_pin.vin_placeholder')"
            class="pill-input vin-width"
            :class="[
              showVinError ? 'ring-2 ring-red-500/70' : '',
              successState ? 'success-border' : '',
              greenTextState ? 'green-text' : ''
            ]"
          />

          <input
            type="text"
            v-model="keyCode"
            :placeholder="$t('vin_to_pin.key_code_placeholder')"
            readonly
            class="pill-input key-width"
            :class="[
              successState ? 'success-border' : '',
              greenTextState ? 'green-text' : ''
            ]"
          />

          <input
            type="text"
            v-model="pinCode"
            :placeholder="$t('vin_to_pin.pin_code_placeholder')"
            readonly
            class="pill-input pin-width pin-accent"
            :class="[
              successState ? 'success-border' : '',
              greenTextState ? 'green-text' : ''
            ]"
          />

          <div class="flex items-center justify-center gap-4 mt-6 flex-wrap">
            <button
              type="submit"
              :disabled="disabled"
              class="get-button"
            >
              <span>{{ isLoading ? $t('vin_to_pin.loading') : $t('vin_to_pin.get_button') }}</span>
            </button>

            <button
              v-if="keyCode && pinCode && !isLoading"
              type="button"
              @click="copyToClipboard"
              class="copy-button"
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
.pill-input {
  height: 52px;
  background: #2a2a2a;
  border: 1.5px solid #3a3a3a;
  color: #eaeaea;
  border-radius: 12px;
  outline: none;
  text-align: center;
  font-size: 18px;
  line-height: 1;
  padding: 0 16px;
  margin: 14px auto;
  display: block;
}
.pill-input::placeholder { color: #a6a6a6; }
.pill-input:focus { border-color: #8a8a8a; }

.success-border {
  border-color: #39a181 !important;
  box-shadow: 0 0 0 2px rgba(57,161,129,0.25);
}

.green-text {
  color: #00ff8a !important;
  border-color: #00ff8a !important;
}

.vin-width      { width: 680px; max-width: 92vw; }
.username-width { width: 420px; max-width: 86vw; }
.key-width      { width: 320px; max-width: 82vw; }
.pin-width      { width: 360px; max-width: 84vw; }

.pin-accent { border-color: #5fb99c !important; }

.get-button {
  width: 180px;
  height: 52px;
  background: #5fb99c;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-size: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.get-button:disabled { opacity: .7; cursor: not-allowed; }

.copy-button {
  height: 52px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1.5px solid #5fb99c;
  background: #1e1e1e;
  color: #dff7ef;
  font-weight: 600;
  letter-spacing: .3px;
}

.logout-button {
  height: 52px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1.5px solid #555;
  background: transparent;
  color: #aaa;
  font-weight: 600;
  transition: 0.2s;
}
.logout-button:hover { color: #fff; border-color: #fff; }

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .pill-input { height: 50px; font-size: 16px; margin: 12px auto; }
  .get-button { width: 160px; height: 50px; font-size: 16px; }
}

.custom-message{ background-color: red; color: white; }
</style>