<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNuxtApp, useRuntimeConfig, useHead } from '#imports'
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
  available_in_db?: boolean
}

const vin = ref('')
const username = ref('')
const keyCode = ref('')
const pinCode = ref('')
const showVinError = ref(false)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const requestsToday = ref<number | undefined>(undefined)
const requestsThisMonth = ref<number | undefined>(undefined)
const requestsLeftToday = ref<number | undefined>(undefined)
const requestsLeftMonth = ref<number | undefined>(undefined)
const greenTextState = ref(false)

const { $customApi } = useNuxtApp()
const { public: { API_BASE_URL, API_KEY, SECRET_KEY } } = useRuntimeConfig()
const { t, locale } = (useI18n?.() as any) || { t: (s: string) => s, locale: ref('en') }

const currencyCookie = useCookie<string>('currency', { default: () => 'USD', sameSite: 'lax', path: '/' })
const usernameCookie = useCookie<string | null>('username', { default: () => null, maxAge: 60 * 60 * 12, sameSite: 'lax', path: '/' })

if (process.client && usernameCookie.value) username.value = usernameCookie.value

watch(vin, (v) => { if (v.length === 17) showVinError.value = false })

function formatVin() {
  vin.value = vin.value.replace(/o/gi, '0').toUpperCase().slice(0, 17)
}

const successState = computed(() => !!(keyCode.value && pinCode.value))
const disabled = computed(() => isLoading.value || vin.value.length !== 17)

async function handleSubmit() {
  if (vin.value.length !== 17) { showVinError.value = true; return }

  // reset
  showVinError.value = false
  errorMessage.value = null
  keyCode.value = ''
  pinCode.value = ''
  requestsToday.value = undefined
  requestsThisMonth.value = undefined
  requestsLeftToday.value = undefined
  requestsLeftMonth.value = undefined
  greenTextState.value = false
  usernameCookie.value = username.value

  isLoading.value = true
  try {
    const res: any = await $customApi(`${API_BASE_URL}/vin-to-pin-old`, {
      method: 'POST',
      headers: {
        'Accept-Language': String(locale?.value || 'en'),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'currency': currencyCookie.value || 'USD',
        'secret-key': SECRET_KEY,
        'api-key': API_KEY,
      },
      body: { username: username.value, vin: vin.value },
    })

    const data: ApiResponse = (res?.data && typeof res.data === 'object') ? res.data : res

    if (data?.error) {
      errorMessage.value = data.error
    } else if (data?.vin === 'Not Correct Vin') {
      errorMessage.value = t('vin_to_pin.invalid_vin')
    } else {
      keyCode.value = data?.key_code || ''
      pinCode.value = data?.pin_code || ''
      errorMessage.value = null
      if (data?.available_in_db && username.value === '4immo8110') greenTextState.value = true
    }

    requestsToday.value     = data?.requests_today        ?? 0
    requestsThisMonth.value = data?.requests_this_month   ?? 0
    requestsLeftToday.value = data?.requests_left_today   ?? 0
    requestsLeftMonth.value = data?.requests_left_month   ?? 0
  } catch (e: any) {
    if (e?.data?.errors?.vin?.[0]) {
      errorMessage.value = e.data.errors.vin[0]
    } else if (e?.data?.message) {
      errorMessage.value = e.data.message
    } else if (e?.data?.error) {
      errorMessage.value = e.data.error
    } else if (e?.response?.data?.error) {
      errorMessage.value = e.response.data.error
    } else if (e?.response?.data?.message) {
      errorMessage.value = e.response.data.message
    } else {
      errorMessage.value = t('vin_to_pin.generic_error')
    }
    keyCode.value = ''
    pinCode.value = ''
  } finally {
    isLoading.value = false
  }
}

function copyToClipboard() {
  const text = `${vin.value}\n${keyCode.value}\n${pinCode.value}`
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
    class="min-h-screen bg-black flex items-start justify-center"
    :dir="(locale === 'ar' || locale?.value === 'ar') ? 'rtl' : 'ltr'"
  >
    <div class="w-full max-w-[760px] px-4 m-auto">
      <!-- Title -->
      <h2 class="text-white text-center font-semibold tracking-wide text-[22px] mt-16 mb-6">
        {{ $t('vin_to_pin.title') }}
      </h2>

      <!-- Error -->
      <div
        v-if="errorMessage"
        class="mx-auto mb-5 max-w-[680px] text-center rounded-md border border-red-400 bg-red-400 text-white text-xl px-4 py-3 text-sm"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <!-- Counters -->
      <div
        v-if="requestsToday !== undefined
              && requestsThisMonth !== undefined
              && requestsLeftToday !== undefined
              && requestsLeftMonth !== undefined"
        class="mx-auto mb-5 max-w-[680px] text-center text-zinc-400 text-md text-white"
      >
        {{ $t('vin_to_pin.today') }}: {{ requestsToday }}
        |
        {{ $t('vin_to_pin.this_month') }}: {{ requestsThisMonth }}
        |
        {{ $t('vin_to_pin.left_month') }}: {{ requestsLeftMonth }}
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col items-center">
        <!-- VIN -->
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

        <!-- Username -->
        <input
          type="password"
          v-model="username"
          autocomplete="new-password"
          required
          :placeholder="$t('vin_to_pin.username_placeholder')"
          class="pill-input username-width"
          :class="[
            successState ? 'success-border' : '',
            greenTextState ? 'green-text' : ''
          ]"
        />

        <!-- Key Code -->
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

        <!-- Pin Code -->
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

        <!-- GET button -->
        <button
          type="submit"
          :disabled="disabled"
          class="get-button mt-8"
        >
          <svg v-if="isLoading" class="h-5 w-5 mr-2 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="4"/>
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          </svg>
          <span>{{ isLoading ? $t('vin_to_pin.loading') : $t('vin_to_pin.get_button') }}</span>
        </button>

        <!-- Copy -->
        <button
          v-if="keyCode && pinCode && !isLoading"
          type="button"
          @click="copyToClipboard"
          class="copy-button mt-3"
        >
          {{ $t('vin_to_pin.copy_button') }}
        </button>
      </form>
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
  height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1.5px solid #5fb99c;
  background: #1e1e1e;
  color: #dff7ef;
  font-weight: 600;
  letter-spacing: .3px;
}

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .pill-input { height: 50px; font-size: 16px; margin: 12px auto; }
  .get-button { width: 160px; height: 50px; font-size: 16px; }
}

.custom-message{ background-color: red; color: white; }
</style>
