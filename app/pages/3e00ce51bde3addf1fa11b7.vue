<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useNuxtApp, useRuntimeConfig } from '#imports'

definePageMeta({ layout: 'pincode_layout' })

type VinResponse = {
  partno?: string | null
  requests_left?: number | null
  subscription_ends?: string | null
  error?: string | null
}

const vin              = ref('')
const username         = ref('')
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

const usernameCookie = useCookie<string | null>('username', {
  default: () => null,
  maxAge: 60 * 60 * 12,
  sameSite: 'lax',
  path: '/',
})

if (process.client && usernameCookie.value) {
  username.value = usernameCookie.value
}

watch(vin, (val) => {
  if (val.length === 17) showVinError.value = false
})

function formatVin() {
  vin.value = vin.value.replace(/o/gi, '0').toUpperCase().slice(0, 17)
}

const canSubmit = computed(() =>
  vin.value.length === 17 && username.value.trim().length > 0 && !isLoading.value
)

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

  usernameCookie.value = username.value

  try {
    const res: any = await $customApi(`${API_BASE_URL}/vin-to-part-number`, {
      method: 'POST',
      body: { username: username.value, vin: vin.value },
      headers: {
        'Accept-Language': (globalThis as any)?.$i18n?.locale || 'en',
        'Content-Type': 'application/json',
        'currency': currencyCookie.value || 'USD',
        'Accept': 'application/json',
        'secret-key': SECRET_KEY,
        'api-key': API_KEY,
      },
    })

    const data: VinResponse = (res?.data && typeof res.data === 'object') ? res.data : res

    pinCode.value = (data?.partno ?? '') as string
    requestsLeft.value = (data?.requests_left ?? null) as number | null
    subscriptionEnds.value = (data?.subscription_ends ?? null) as string | null

    if (!pinCode.value && data?.error) {
      errorMessage.value = data.error
    }
  } catch (err: any) {
    console.error('VIN → Part Number error:', err)
    errorMessage.value =
      err?.data?.error ||
      err?.response?.data?.error ||
      err?.message ||
      'There was an error sending your request.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <!-- Page wrapper -->
  <main class="min-h-screen bg-black py-8 px-4 flex items-center justify-center">
    <!-- Card -->
    <div class="relative max-w-md rounded-2xl bg-neutral-900 text-white shadow-xl p-6">
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

      <h3 class="text-center text-xl font-semibold tracking-tight mb-4">
        KIA / HYUNDAI Part Number
      </h3>

      <form @submit.prevent="handleSubmit" class="space-y-3">
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
            class="w-full h-12 rounded-xl border border-white/10 bg-neutral-800/70 px-3 text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <!-- Username -->
        <div>
          <input
            type="password"
            v-model="username"
            autocomplete="current-password"
            placeholder="Enter Username"
            required
            class="w-full h-12 rounded-xl border border-white/10 bg-neutral-800/70 px-3 text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <!-- Part Number Result -->
        <div>
          <input
            type="text"
            v-model="pinCode"
            placeholder="Part Number"
            readonly
            class="w-full h-12 rounded-xl border border-white/10 bg-neutral-800/70 px-3 text-black placeholder:text-neutral-400"
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
            <strong class="text-white">Queries left today:</strong> {{ requestsLeft }} / 5
          </div>
          <div v-if="subscriptionEnds">
            <strong class="text-white">Subscription ends:</strong> {{ subscriptionEnds }}
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="!canSubmit"
          aria-disabled="!canSubmit"
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
