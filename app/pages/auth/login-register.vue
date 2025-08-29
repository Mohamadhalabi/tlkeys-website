<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from '#imports'
import { useAuth } from '~/composables/useAuth'
import { useCart } from '~/composables/useCart'
import { useAlertStore } from '~/stores/alert'

const auth = useAuth()
const cart = useCart()
const alerts = useAlertStore()
const router = useRouter()

// --- login form ---
const lEmail = ref('')
const lPassword = ref('')
const lRemember = ref(false)
const lLoading = ref(false)

// --- register form ---
const rName = ref('')
const rPhone = ref('')
const rEmail = ref('')
const rPassword = ref('')
const rLoading = ref(false)

function trim(s: string) { return s.trim() }

async function doLogin() {
  lLoading.value = true
  try {
    await auth.login({ email: trim(lEmail.value), password: lPassword.value })

    // push guest cart to server (quantities). Your cart view then recomputes prices
    await cart.syncGuestToServer()

    alerts.showAlert({ type: 'success', title: 'Welcome back!', message: 'Logged in successfully.' })
    // go to previous page or cart (up to you)
    router.push('/')
  } catch (e: any) {
    alerts.showAlert({ type: 'error', title: 'Login failed', message: e?.data?.message || e?.message || 'Please check your credentials.' })
  } finally {
    lLoading.value = false
  }
}

async function doRegister() {
  rLoading.value = true
  try {
    const res = await auth.register({
      name: trim(rName.value),
      email: trim(rEmail.value),
      phone: trim(rPhone.value),
      password: rPassword.value
    })
    alerts.showAlert({ type: 'success', title: 'Account created', message: res?.message || 'Registered successfully. Please login.' })
    // optionally prefill login email
    lEmail.value = rEmail.value
    lPassword.value = ''
  } catch (e: any) {
    alerts.showAlert({ type: 'error', title: 'Register failed', message: e?.data?.message || e?.message || 'Please review the form.' })
  } finally {
    rLoading.value = false
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <nav class="text-sm text-gray-500 mb-6">
      <NuxtLinkLocale to="/" class="hover:underline">Home</NuxtLinkLocale>
      <span class="mx-2">›</span>
      <span class="text-gray-700">Login / Register</span>
    </nav>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Login -->
      <div class="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold mb-4">Login</h2>

        <label class="block text-sm mb-1">Email *</label>
        <input v-model="lEmail" type="email" class="w-full mb-3 rounded-lg border px-3 py-2" />

        <label class="block text-sm mb-1">Password *</label>
        <input v-model="lPassword" type="password" class="w-full mb-3 rounded-lg border px-3 py-2" />

        <div class="flex items-center justify-between mb-4">
          <label class="inline-flex items-center gap-2 text-sm">
            <input v-model="lRemember" type="checkbox" class="rounded border-gray-300" />
            Remember me
          </label>
          <NuxtLinkLocale to="/auth/forgot-password" class="text-sm text-gray-600 hover:underline">Forgot password?</NuxtLinkLocale>
        </div>

        <button
          :disabled="lLoading"
          class="w-full rounded-xl bg-gray-900 text-white py-3 font-semibold hover:bg-black disabled:opacity-60"
          @click="doLogin"
        >
          {{ lLoading ? 'Logging in…' : 'Login' }}
        </button>
      </div>

      <!-- Register -->
      <div class="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold mb-4">Sign up</h2>

        <label class="block text-sm mb-1">Full name *</label>
        <input v-model="rName" type="text" class="w-full mb-3 rounded-lg border px-3 py-2" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1">Phone *</label>
            <input v-model="rPhone" type="tel" class="w-full mb-3 rounded-lg border px-3 py-2" />
          </div>
          <div></div>
        </div>

        <label class="block text-sm mb-1">Email address *</label>
        <input v-model="rEmail" type="email" class="w-full mb-3 rounded-lg border px-3 py-2" />

        <label class="block text-sm mb-1">Password *</label>
        <input v-model="rPassword" type="password" class="w-full mb-5 rounded-lg border px-3 py-2" />

        <button
          :disabled="rLoading"
          class="w-full rounded-xl bg-gray-900 text-white py-3 font-semibold hover:bg-black disabled:opacity-60"
          @click="doRegister"
        >
          {{ rLoading ? 'Registering…' : 'Register' }}
        </button>
      </div>
    </div>
  </div>
</template>
