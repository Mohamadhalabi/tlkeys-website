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
  status?: string // Added for the confirmation check
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
}

type UserCheckResponse = {
  username?: string
  has_token?: number
  requests_this_month?: number
  tokens_left?: number | null
  error?: string
}

const vin = ref('')
const usernameInput = ref('')
const keyCode = ref('')
const pinCode = ref('')
const showVinError = ref(false)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

// Session & Stats State
const isLoggedIn = ref(false)
const hasToken = ref(false)
const requestsThisMonth = ref<number>(0)
const tokensLeft = ref<number | null>(null)
const greenTextState = ref(false)

// Confirmation State
const forceOrder = ref(false)

const { $customApi } = useNuxtApp()
const { public: { API_BASE_URL, API_KEY, SECRET_KEY } } = useRuntimeConfig()
const { t, locale } = (useI18n?.() as any) || { t: (s: string) => s, locale: ref('en') }

const currencyCookie = useCookie<string>('currency', { default: () => 'USD', sameSite: 'lax', path: '/' })
// 604800 seconds = 1 week
const usernameCookie = useCookie<string | null>('username', { default: () => null, maxAge: 604800, sameSite: 'lax', path: '/' })

onMounted(() => {
  if (usernameCookie.value) {
    usernameInput.value = usernameCookie.value
    verifyLogin()
  }
})

watch(vin, (v) => { if (v.length === 17) showVinError.value = false })

function formatVin() {
  vin.value = vin.value.replace(/o/gi, '0').toUpperCase().slice(0, 17)
}

const successState = computed(() => !!(keyCode.value && pinCode.value))
const disabled = computed(() => isLoading.value || vin.value.length !== 17)

async function verifyLogin() {
  if (!usernameInput.value) return
  isLoading.value = true
  errorMessage.value = null

  try {
    const res: any = await $customApi(`${API_BASE_URL}/check-user`, {
      method: 'POST',
      headers: {
        'Accept-Language': String(locale?.value || 'en'),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'currency': currencyCookie.value || 'USD',
        'secret-key': SECRET_KEY,
        'api-key': API_KEY,
      },
      body: { username: usernameInput.value, api_type: 'new' },
    })

    const data: UserCheckResponse = (res?.data && typeof res.data === 'object') ? res.data : res

    if (data?.error) {
      errorMessage.value = data.error
      logout()
    } else {
      isLoggedIn.value = true
      usernameCookie.value = usernameInput.value
      hasToken.value = !!data.has_token
      requestsThisMonth.value = data.requests_this_month || 0
      tokensLeft.value = data.tokens_left ?? null
    }
  } catch (e: any) {
    errorMessage.value = e?.response?.data?.error || t('vin_to_pin.generic_error')
    logout()
  } finally {
    isLoading.value = false
  }
}

function logout() {
  usernameCookie.value = null
  isLoggedIn.value = false
  usernameInput.value = ''
  vin.value = ''
  keyCode.value = ''
  pinCode.value = ''
  errorMessage.value = null
  forceOrder.value = false
}

async function handleSubmit(isRetry = false) {
  if (!isRetry) forceOrder.value = false // Reset order flag on fresh attempts

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
    const res: any = await $customApi(`${API_BASE_URL}/vin-to-pin-new`, {
      method: 'POST',
      headers: {
        'Accept-Language': String(locale?.value || 'en'),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'currency': currencyCookie.value || 'USD',
        'secret-key': SECRET_KEY,
        'api-key': API_KEY,
      },
      body: { 
        username: usernameCookie.value, 
        vin: vin.value,
        force_order: forceOrder.value 
      },
    })

    const data: ApiResponse = (res?.data && typeof res.data === 'object') ? res.data : res

    // Catch the confirmation request from the backend
    if (data?.status === 'requires_confirmation') {
      isLoading.value = false // Pause loading for user prompt
      const wantsToOrder = confirm('This VIN is not in the database. Would you like to order it from the external server?')
      
      if (wantsToOrder) {
        forceOrder.value = true
        await handleSubmit(true) // Retry with force_order = true
      } else {
        errorMessage.value = 'Order cancelled.'
      }
      return // Stop execution of the current loop
    }

    if (data?.error) {
      errorMessage.value = data.error
    } else if (data?.vin === 'Not Correct Vin') {
      errorMessage.value = t('vin_to_pin.invalid_vin')
    } else {
      keyCode.value = data?.key_code || ''
      pinCode.value = data?.pin_code || ''
      
      // Update stats based on request
      requestsThisMonth.value = data?.requests_this_month ?? requestsThisMonth.value
      if (data?.has_token) {
        tokensLeft.value = data?.requests_left_month ?? tokensLeft.value
      }

      if (data?.available_in_db && usernameCookie.value === '4immo8110') greenTextState.value = true
    }
  } catch (e: any) {
    if (e?.data?.errors?.vin?.[0]) errorMessage.value = e.data.errors.vin[0]
    else if (e?.response?.data?.error) errorMessage.value = e.response.data.error
    else errorMessage.value = t('vin_to_pin.generic_error')
    
    // If auth failure during request, boot them out
    if (e?.response?.status === 400 && e?.response?.data?.error?.includes('username')) {
       logout()
    }
  } finally {
    isLoading.value = false
  }
}

function copyToClipboard() {
  const text = `*${vin.value}*\n${keyCode.value}\n${pinCode.value}`
  navigator.clipboard.writeText(text).catch(() => {})
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
      @click="logout"
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
        <div
          v-if="isLoading"
          class="fixed inset-0 z-10 bg-black/55 flex items-center justify-center"
        >
          <div class="h-12 w-12 rounded-full border-4 border-white/25 border-t-white animate-spin"></div>
        </div>
      </transition>

      <form v-if="!isLoggedIn" @submit.prevent="verifyLogin" class="flex flex-col items-center">
        <div class="row-gap">
          <input
            type="text"
            v-model="usernameInput"
            required
            :placeholder="$t('vin_to_pin.username_placeholder') || 'Enter Username'"
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
              :class="[
                successState ? 'success-border' : '',
                greenTextState ? 'green-text' : ''
              ]"
            />
          </div>

          <div class="row-gap">
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
          </div>

          <div class="row-gap">
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