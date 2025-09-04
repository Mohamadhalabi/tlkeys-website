<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useNuxtApp, useRuntimeConfig, useHead } from '#imports'
import { useI18n } from 'vue-i18n'

definePageMeta({ layout: 'pincode_layout' })

type ApiResponse = {
  error?: string
  message?: string
  errors?: { vin?: string[] }
  vin?: string
  key_code?: string | null
  pin_code?: string | null
  requests_today?: number
  requests_this_month?: number
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
const greenTextState = ref(false) // turn inputs neon-green when condition matches

const { $customApi } = useNuxtApp()
const { public: { API_BASE_URL, API_KEY, SECRET_KEY } } = useRuntimeConfig()
const { locale } = (useI18n?.() as any) || { locale: ref('en') }

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

  // reset before request
  showVinError.value = false
  errorMessage.value = null
  keyCode.value = ''
  pinCode.value = ''
  requestsToday.value = undefined
  requestsThisMonth.value = undefined
  greenTextState.value = false
  usernameCookie.value = username.value

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
      body: { username: username.value, vin: vin.value },
    })

    const data: ApiResponse = (res?.data && typeof res.data === 'object') ? res.data : res

    if (data?.error) {
      errorMessage.value = data.error
    } else if (data?.vin === 'Not Correct Vin') {
      errorMessage.value = 'Invalid VIN entered. Please try again.'
    } else {
      keyCode.value = data?.key_code || ''
      pinCode.value = data?.pin_code || ''
      errorMessage.value = null
      if (data?.available_in_db && username.value === '4immo8110') greenTextState.value = true
    }

    requestsToday.value = data?.requests_today ?? 0
    requestsThisMonth.value = data?.requests_this_month ?? 0
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
      errorMessage.value = 'An error occurred. Please try again later.'
    }
    keyCode.value = ''
    pinCode.value = ''
  } finally {
    isLoading.value = false
  }
}

function copyToClipboard() {
  const text = `*${vin.value}*\n${keyCode.value}\n${pinCode.value}`
  navigator.clipboard.writeText(text).catch(() => {})
}

useHead({
  title: 'Vin To Pin',
  meta: [
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
    { name: 'googlebot', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
  ],
})
</script>

<template>
  <main class="min-h-screen bg-black flex items-start justify-center">
    <div class="w-full max-w-[760px] px-4 m-auto">
      <!-- Title -->
      <h3 class="text-white text-center font-semibold tracking-wide text-[22px] mt-16 mb-6">
        Vin Request
      </h3>

      <!-- Error -->
      <div
        v-if="errorMessage"
        class="mx-auto mb-5 max-w-[680px] text-center rounded-md border border-red-400 bg-red-400 text-white text-xl px-4 py-3 text-sm"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <!-- Loading overlay -->
      <transition name="fade">
        <div
          v-if="isLoading"
          class="fixed inset-0 z-10 bg-black/55 flex items-center justify-center"
          aria-live="polite" aria-busy="true"
        >
          <div class="h-12 w-12 rounded-full border-4 border-white/25 border-t-white animate-spin"></div>
          <span class="sr-only">Loading...</span>
        </div>
      </transition>

      <!-- Counters -->
      <div
        v-if="requestsToday !== undefined && requestsThisMonth !== undefined"
        class="mx-auto mb-5 max-w-[680px] text-center text-zinc-400 text-md text-white"
      >
        Today: {{ requestsToday }} | This Month: {{ requestsThisMonth }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="flex flex-col items-center">
        <!-- VIN -->
        <div class="row-gap">
          <div
            v-if="showVinError"
            class="mx-auto mb-2 max-w-[680px] rounded-md border border-red-400 bg-red-500/10 text-red-200 px-3 py-2 text-sm"
            role="alert"
          >
            VIN must be exactly 17 characters.
          </div>
          <input
            type="text"
            v-model="vin"
            @input="formatVin"
            maxlength="17"
            required
            autocomplete="off"
            placeholder="VIN Number"
            class="pill-input vin-width"
            :class="[
              successState ? 'success-border' : '',
              greenTextState ? 'green-text' : ''
            ]"
          />
        </div>

        <!-- Username -->
        <div class="row-gap">
          <input
            type="password"
            v-model="username"
            autocomplete="new-password"
            required
            placeholder="Enter Username"
            class="pill-input username-width"
            :class="[
              successState ? 'success-border' : '',
              greenTextState ? 'green-text' : ''
            ]"
          />
        </div>

        <!-- Key Code -->
        <div class="row-gap">
          <input
            type="text"
            v-model="keyCode"
            placeholder="Key Code"
            readonly
            class="pill-input key-width"
            :class="[
              successState ? 'success-border' : '',
              greenTextState ? 'green-text' : ''
            ]"
          />
        </div>

        <!-- Pin Code -->
        <div class="row-gap">
          <input
            type="text"
            v-model="pinCode"
            placeholder="Pin Code"
            readonly
            class="pill-input pin-width pin-accent"
            :class="[
              successState ? 'success-border' : '',
              greenTextState ? 'green-text' : ''
            ]"
          />
        </div>

        <!-- Actions -->
        <div class="actions-row">
          <button type="submit" class="get-button" :disabled="disabled">
            <svg v-if="isLoading" class="h-5 w-5 mr-2 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="4"/>
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            </svg>
            <span>{{ isLoading ? 'Loading…' : 'GET' }}</span>
          </button>

          <button
            v-if="keyCode && pinCode && !isLoading"
            type="button"
            class="copy-button"
            @click="copyToClipboard"
          >
            Copy
          </button>
        </div>
      </form>
    </div>
  </main>
</template>

<style scoped>
/* ---------- layout helpers (to mirror your original) ---------- */
.row-gap { margin: 20px 0; }
.actions-row {
  display: flex; align-items: center; justify-content: center;
  gap: 14px; margin-top: 26px; flex-wrap: wrap;
}

/* ---------- EXACT visual style from your screenshot ---------- */
.pill-input {
  height: 56px;
  background: #E40000;         /* 🔴 red background */
  border: 2px solid #6b6b6b;    /* subtle gray outline (kept) */
  color: #f2f2f2;               /* light text */
  border-radius: 14px;          /* rounded */
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

/* widths to match proportions in the screenshot */
.vin-width      { width: 680px; max-width: 92vw; }
.username-width { width: 420px; max-width: 86vw; }
.key-width      { width: 320px; max-width: 82vw; }
.pin-width      { width: 360px; max-width: 84vw; }

/* success = white outline */
.success-border {
  border-color: #ffffff !important;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.15);
}

/* green accent for the Pin Code field */
.pin-accent { box-shadow: 0 0 0 2px rgba(97,195,166,0.35); }

/* optional: neon success text (kept behavior) */
.green-text { color: #00ff00 !important; }

/* GET button (mint green) */
.get-button {
  width: 220px; height: 56px;
  background: #5fb99c;
  color: #ffffff; border: none; border-radius: 16px;
  font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  font-size: 20px;
  display: inline-flex; align-items: center; justify-content: center;
}
.get-button:disabled { opacity: 0.7; cursor: not-allowed; }

/* Copy button — subtle border, dark bg */
.copy-button {
  height: 56px; padding: 0 20px; border-radius: 16px;
  border: 2px solid #5fb99c; background: #222; color: #e7fff6;
  font-weight: 700; letter-spacing: 0.3px;
}

/* overlay fade */
.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* mobile tune */
@media (max-width: 480px) {
  .pill-input { height: 54px; font-size: 18px; }
  .get-button, .copy-button { height: 54px; font-size: 18px; }
}
</style>
