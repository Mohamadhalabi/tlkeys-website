<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNuxtApp } from '#app'
import { useI18n } from 'vue-i18n'

type User = {
  id: number
  name: string
  email: string
  phone?: string | null
  avatar?: string | null
}

const { t } = useI18n()               // 👈 i18n
const { $customApi } = useNuxtApp()

const loading = ref(true)
const saving = ref(false)
const user = ref<User | null>(null)

const form = ref({ name: '', phone: '' })
const pwd  = ref({ current: '', next: '', confirm: '' })
const msg  = ref<string>('')

async function fetchMe() {
  loading.value = true
  msg.value = ''
  try {
    const res: any = await $customApi('/me', { method: 'GET' })
    const u = res?.data ?? res
    user.value = u
    form.value.name  = u?.name ?? ''
    form.value.phone = u?.phone ?? ''
  } catch (e: any) {
    msg.value = e?.data?.message || e?.message || t('account.errors.loadProfile')
  } finally { loading.value = false }
}

async function saveProfile() {
  saving.value = true
  msg.value = ''
  try {
    await $customApi('/account', {
      method: 'POST',
      body: { name: form.value.name, phone: form.value.phone }
    })
    msg.value = t('account.messages.profileUpdated')
    // await fetchMe()
  } catch (e: any) {
    msg.value = e?.data?.message || e?.message || t('account.errors.updateProfile')
  } finally { saving.value = false }
}

async function changePassword() {
  if (!pwd.value.next || pwd.value.next !== pwd.value.confirm) {
    msg.value = t('account.errors.passwordsMismatch')
    return
  }
  saving.value = true
  msg.value = ''
  try {
    await $customApi('/account/password', {
      method: 'POST',
      body: {
        current_password: pwd.value.current,
        password: pwd.value.next,
        password_confirmation: pwd.value.confirm
      }
    })
    msg.value = t('account.messages.passwordChanged')
    pwd.value = { current: '', next: '', confirm: '' }
  } catch (e: any) {
    msg.value = e?.data?.message || e?.message || t('account.errors.passwordChange')
  } finally { saving.value = false }
}

onMounted(fetchMe)
</script>

<template>
  <div>
    <p v-if="msg" class="mb-4 text-sm" :class="msg.includes('failed') ? 'text-red-600' : 'text-emerald-700'">
      {{ msg }}
    </p>

    <div v-if="loading">{{ $t('common.loading') }}</div>

    <div v-else class="grid md:grid-cols-2 gap-8">
      <!-- Details -->
      <div>
        <h2 class="font-semibold text-lg mb-3">{{ $t('account.profile.title') }}</h2>
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">{{ $t('account.profile.fullName') }}</span>
            <input v-model="form.name" type="text" class="mt-1 input" />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">{{ $t('account.profile.phone') }}</span>
            <input v-model="form.phone" type="tel" class="mt-1 input" />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">{{ $t('account.profile.email') }}</span>
            <input :value="user?.email" type="email" class="mt-1 input bg-gray-100" readonly />
          </label>

          <button :disabled="saving" @click="saveProfile" class="btn-primary">
            {{ $t('account.profile.saveChanges') }}
          </button>
        </div>
      </div>

      <!-- Password -->
      <div>
        <h2 class="font-semibold text-lg mb-3">{{ $t('account.password.title') }}</h2>
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">{{ $t('account.password.current') }}</span>
            <input v-model="pwd.current" type="password" class="mt-1 input" />
          </label>
          <label class="block">
            <span class="text-sm text-gray-700">{{ $t('account.password.new') }}</span>
            <input v-model="pwd.next" type="password" class="mt-1 input" />
          </label>
          <label class="block">
            <span class="text-sm text-gray-700">{{ $t('account.password.confirm') }}</span>
            <input v-model="pwd.confirm" type="password" class="mt-1 input" />
          </label>

          <button :disabled="saving" @click="changePassword" class="btn-secondary">
            {{ $t('account.password.update') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input{ @apply w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300; }
.btn-primary{ @apply inline-flex items-center gap-2 rounded-lg bg-orange-600 text-white px-4 py-2 hover:bg-orange-700 disabled:opacity-50; }
.btn-secondary{ @apply inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 hover:bg-black disabled:opacity-50; }
</style>
