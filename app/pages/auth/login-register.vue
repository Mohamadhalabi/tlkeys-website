<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from '#imports'
import { useAuth } from '~/composables/useAuth'
import { useCart } from '~/composables/useCart'
import { useAlertStore } from '~/stores/alert'

// i18n (uses global translation files)
const i18nApi = (useI18n?.() as any) || null
const t = i18nApi?.t ?? ((s: string, _?: any) => s)

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

    // push guest cart to server (quantities). Your cart view then recomputes prices.
    await cart.syncGuestToServer()

    alerts.showAlert({
      type: 'success',
      title: t('auth.login.successTitle'),
      message: t('auth.login.successMessage')
    })
    // go to previous page or home (kept as home)
    router.push('/')
  } catch (e: any) {
    alerts.showAlert({
      type: 'error',
      title: t('auth.login.errorTitle'),
      message: e?.data?.message || e?.message || t('auth.login.errorFallback')
    })
  } finally {
    lLoading.value = false
  }
}

async function doRegister() {
  rLoading.value = true
  try {
    // 1) Create the account
    const res = await auth.register({
      name: trim(rName.value),
      email: trim(rEmail.value),
      phone: trim(rPhone.value),
      password: rPassword.value
    })

    // 2) Auto-login after successful registration
    await auth.login({ email: trim(rEmail.value), password: rPassword.value })

    // 3) Sync guest cart
    await cart.syncGuestToServer()

    // 4) Success alert (single, friendly)
    alerts.showAlert({
      type: 'success',
      title: t('auth.register.successTitle'),
      message: res?.message || t('auth.register.successMessage')
    })

    // 5) Redirect (kept as home)
    router.push('/')
  } catch (e: any) {
    alerts.showAlert({
      type: 'error',
      title: t('auth.register.errorTitle'),
      message: e?.data?.message || e?.message || t('auth.register.errorFallback')
    })
  } finally {
    rLoading.value = false
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <nav class="text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
      <NuxtLinkLocale to="/" class="hover:underline">
        {{ t('breadcrumbs.home') }}
      </NuxtLinkLocale>
      <span class="mx-2">›</span>
      <span class="text-gray-700">{{ t('auth.loginRegister') }}</span>
    </nav>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Login -->
      <div class="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold mb-4">{{ t('auth.login.title') }}</h2>

        <label class="block text-sm mb-1" for="loginEmail">{{ t('common.email') }} *</label>
        <input
          id="loginEmail"
          v-model="lEmail"
          type="email"
          class="w-full mb-3 rounded-lg border px-3 py-2"
          :placeholder="t('auth.login.emailPlaceholder')"
          autocomplete="email"
        />

        <label class="block text-sm mb-1" for="loginPassword">{{ t('common.password') }} *</label>
        <input
          id="loginPassword"
          v-model="lPassword"
          type="password"
          class="w-full mb-3 rounded-lg border px-3 py-2"
          :placeholder="t('auth.login.passwordPlaceholder')"
          autocomplete="current-password"
        />

        <div class="flex items-center justify-between mb-4">
          <label class="inline-flex items-center gap-2 text-sm">
            <input v-model="lRemember" type="checkbox" class="rounded border-gray-300" />
            {{ t('auth.login.remember') }}
          </label>
          <NuxtLinkLocale to="/auth/forgotpassword" class="text-sm text-gray-600 hover:underline">
            {{ t('auth.login.forgot') }}
          </NuxtLinkLocale>
        </div>

        <button
          :disabled="lLoading"
          class="w-full rounded-xl bg-gray-900 text-white py-3 font-semibold hover:bg-black disabled:opacity-60"
          @click="doLogin"
        >
          {{ lLoading ? t('auth.login.loading') : t('auth.login.cta') }}
        </button>
      </div>

      <!-- Register -->
      <div class="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 class="text-lg font-semibold mb-4">{{ t('auth.register.title') }}</h2>

        <label class="block text-sm mb-1" for="rName">{{ t('auth.register.fullName') }} *</label>
        <input
          id="rName"
          v-model="rName"
          type="text"
          class="w-full mb-3 rounded-lg border px-3 py-2"
          :placeholder="t('auth.register.fullNamePlaceholder')"
          autocomplete="name"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1" for="rPhone">{{ t('auth.register.phone') }} *</label>
            <input
              id="rPhone"
              v-model="rPhone"
              type="tel"
              class="w-full mb-3 rounded-lg border px-3 py-2"
              :placeholder="t('auth.register.phonePlaceholder')"
              autocomplete="tel"
            />
          </div>
          <div></div>
        </div>

        <label class="block text-sm mb-1" for="rEmail">{{ t('common.emailAddress') }} *</label>
        <input
          id="rEmail"
          v-model="rEmail"
          type="email"
          class="w-full mb-3 rounded-lg border px-3 py-2"
          :placeholder="t('auth.register.emailPlaceholder')"
          autocomplete="email"
        />

        <label class="block text-sm mb-1" for="rPassword">{{ t('common.password') }} *</label>
        <input
          id="rPassword"
          v-model="rPassword"
          type="password"
          class="w-full mb-5 rounded-lg border px-3 py-2"
          :placeholder="t('auth.register.passwordPlaceholder')"
          autocomplete="new-password"
        />

        <button
          :disabled="rLoading"
          class="w-full rounded-xl bg-gray-900 text-white py-3 font-semibold hover:bg-black disabled:opacity-60"
          @click="doRegister"
        >
          {{ rLoading ? t('auth.register.loading') : t('auth.register.cta') }}
        </button>
      </div>
    </div>
  </div>
</template>
