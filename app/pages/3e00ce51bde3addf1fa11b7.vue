<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useNuxtApp, useRuntimeConfig, useCookie } from '#imports'

definePageMeta({
  layout: 'pincode_layout',
  analytics: false, // ⬅️ disable GA4 here
})

type VinResponse = {
  partno?: string | null
  requests_left?: number | null
  subscription_ends?: string | null
  error?: string | null
}

const vin              = ref('')
const usernameInput    = ref('')
const passwordInput    = ref('')
const pinCode          = ref('')
const showVinError     = ref(false)
const isLoading        = ref(false)
const requestsLeft     = ref<number | null>(null)
const subscriptionEnds = ref<string | null>(null)
const errorMessage     = ref<string | null>(null)

const { $customApi } = useNuxtApp()
const {
  public: { API_BASE_URL, API_KEY, SECRET_KEY },
} = useRuntimeConfig()

const currencyCookie = useCookie<string>('currency', {
  default: () => 'USD',
  path: '/',
  sameSite: 'lax',
})

/**
 * Separate cookie from the VIN/PIN pages: this endpoint authenticates
 * against part_number_users, a different table with different accounts.
 * The server enforces that too — a 'part' token will not unlock the
 * VIN/PIN endpoints.
 */
const tokenCookie = useCookie<string | null>('vp_token_part', {
  default: () => null,
  maxAge: 12 * 3600,
  sameSite: 'strict',
  path: '/',
})

const isLoggedIn = computed(() => !!tokenCookie.value)

function baseHeaders() {
  return {
    'Accept-Language': (globalThis as any)?.$i18n?.locale || 'en',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'currency': currencyCookie.value || 'USD',
    'secret-key': SECRET_KEY,
    'api-key': API_KEY,
  }
}

/**
 * A dedicated header rather than Authorization: plugins/auth.client.ts
 * puts the site's own JWT there on every request, which would overwrite
 * this one and cause an immediate 401.
 */
function authHeaders() {
  return { ...baseHeaders(), 'X-VinPin-Token': tokenCookie.value || '' }
}

watch(vin, (val) => {
  if (val.length === 17) showVinError.value = false
})

function formatVin() {
  vin.value = vin.value.replace(/o/gi, '0').toUpperCase().slice(0, 17)
}

const canSubmit = computed(() => vin.value.length === 17 && !isLoading.value)

async function handleLogin() {
  if (!usernameInput.value || !passwordInput.value) return

  isLoading.value = true
  errorMessage.value = null

  try {
    const res: any = await $customApi(`${API_BASE_URL}/vin-to-pin/login`, {
      method: 'POST',
      headers: baseHeaders(),
      body: {
        username: usernameInput.value,
        password: passwordInput.value,
        scope: 'part',
      },
    })

    const data = (res?.data && typeof res.data === 'object') ? res.data : res

    if (!data?.token) throw new Error(data?.error || 'Login failed')

    tokenCookie.value = data.token
    passwordInput.value = ''       // not kept in memory after use
  } catch (e: any) {
    errorMessage.value =
      e?.data?.error || e?.response?.data?.error || e?.message || 'Login failed'
    doLogout()
  } finally {
    isLoading.value = false
  }
}

function doLogout() {
  if (tokenCookie.value) {
    // Fire-and-forget: the cookie clears either way, so a failed network
    // call cannot leave the user stuck logged in.
    $customApi(`${API_BASE_URL}/vin-to-pin/logout`, {
      method: 'POST',
      headers: authHeaders(),
    }).catch(() => {})
  }

  tokenCookie.value = null
  usernameInput.value = ''
  passwordInput.value = ''
  vin.value = ''
  pinCode.value = ''
  requestsLeft.value = null
  subscriptionEnds.value = null
  errorMessage.value = null
}

async function handleSubmit() {
  if (vin.value.length !== 17) {
    showVinError.value = true
    return
  }

  showVinError.value = false
  errorMessage.value = null
  isLoading.value = true

  pinCode.value = ''
  requestsLeft.value = null
  subscriptionEnds.value = null

  try {
    const res: any = await $customApi(`${API_BASE_URL}/vin-to-part-number`, {
      method: 'POST',
      headers: authHeaders(),
      // No username in the body: the server reads it from the token, so
      // one account cannot spend another's daily quota.
      body: { vin: vin.value },
    })

    const data: VinResponse = (res?.data && typeof res.data === 'object') ? res.data : res

    pinCode.value = (data?.partno ?? '') as string
    requestsLeft.value = (data?.requests_left ?? null) as number | null
    subscriptionEnds.value = (data?.subscription_ends ?? null) as string | null

    if (!pinCode.value && data?.error) {
      errorMessage.value = data.error
    }
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status ?? err?.statusCode

    if (status === 401) {
      errorMessage.value = 'Session expired. Please log in again.'
      doLogout()
    } else if (status === 429) {
      errorMessage.value = 'Too many requests. Please wait a moment.'
    } else {
      errorMessage.value =
        err?.data?.error ||
        err?.response?.data?.error ||
        err?.message ||
        'There was an error sending your request.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <!-- Page wrapper -->
  <main class="min-h-screen bg-black py-8 px-4 flex items-center justify-center">
    <!-- Card -->
    <div class="relative max-w-md w-full rounded-2xl bg-neutral-900 text-white shadow-xl p-6">
      <!-- Loading overlay -->
      <div
        v-if="isLoading"
        class="absolute inset-0 z-10 rounded-2xl bg-black/75 flex items-center justify-center"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        <span class="sr-only">Loading...</span>
      </div>

      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-semibold tracking-tight">
          KIA / HYUNDAI Part Number
        </h3>

        <button
          v-if="isLoggedIn"
          type="button"
          class="text-sm text-neutral-400 hover:text-white underline"
          @click="doLogout"
        >
          Logout
        </button>
      </div>

      <!-- Login -->
      <form v-if="!isLoggedIn" @submit.prevent="handleLogin" class="space-y-3">
        <input
          type="text"
          v-model="usernameInput"
          autocomplete="username"
          placeholder="Username"
          required
          class="w-full h-12 rounded-xl border border-white/10 bg-neutral-800/70 px-3 text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />

        <input
          type="password"
          v-model="passwordInput"
          autocomplete="current-password"
          placeholder="Password"
          required
          class="w-full h-12 rounded-xl border border-white/10 bg-neutral-800/70 px-3 text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />

        <div
          v-if="errorMessage"
          class="rounded-md border border-red-400 bg-red-50/10 text-red-300 px-3 py-2 text-sm"
          role="alert"
        >
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full h-12 rounded-xl bg-green-500 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {{ isLoading ? 'Loading…' : 'Login' }}
        </button>
      </form>

      <!-- Lookup -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-3">
        <!-- VIN -->
        <div>
          <div
            v-if="showVinError"
            class="mb-2 rounded-md border border-red-400 bg-red-50/10 text-red-300 px-3 py-2 text-sm"
            role="alert"
          >
            VIN must be exactly 17 characters.
          </div>

          <input
            type="text"
            v-model="vin"
            @input="formatVin"
            maxlength="17"
            inputmode="text"
            autocomplete="off"
            placeholder="VIN Number"
            class="w-full h-12 rounded-xl border border-white/10 bg-neutral-800/70 px-3 text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <!-- Part Number Result -->
        <div>
          <input
            type="text"
            v-model="pinCode"
            placeholder="Part Number"
            readonly
            class="w-full h-12 rounded-xl border border-white/10 bg-neutral-800/70 px-3 text-white placeholder:text-neutral-400"
          />
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="rounded-md border border-red-400 bg-red-50/10 text-red-300 px-3 py-2 text-sm"
          role="alert"
        >
          {{ errorMessage }}
        </div>

        <!-- Limits -->
        <div v-if="requestsLeft !== null || subscriptionEnds !== null" class="text-sm text-neutral-300 space-y-1">
          <div v-if="requestsLeft !== null">
            <strong class="text-white">Queries left today:</strong> {{ requestsLeft }}
          </div>
          <div v-if="subscriptionEnds">
            <strong class="text-white">Subscription ends:</strong> {{ subscriptionEnds }}
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="!canSubmit"
          class="w-full h-12 rounded-xl bg-green-500 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
        >
          <svg
            v-if="isLoading"
            class="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.25" stroke-width="4"/>
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
          </svg>
          <span>{{ isLoading ? 'Loading…' : 'Get' }}</span>
        </button>
      </form>
    </div>
  </main>
</template>