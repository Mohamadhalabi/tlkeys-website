<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useNuxtApp } from '#imports'

const { $customApi } = useNuxtApp()
const route = useRoute()

const email = ref<string>((route.query.email as string) || '')
const loading = ref(false)
const notice = ref<{ type: 'success' | 'error', text: string } | null>(null)

async function submit() {
  notice.value = null
  loading.value = true
  try {
    await $customApi('/forget-password', {
      method: 'POST',
      body: { email: email.value.trim() }
    })
    notice.value = {
      type: 'success',
      text: 'Your password reset link has been sent to your email.'
    }
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || 'Unable to send reset email. Please try again.'
    notice.value = { type: 'error', text: msg }
  } finally {
    loading.value = false
  }
}

function contactWhatsApp() {
  const text = encodeURIComponent('I have a problem with resetting my password')
  window.open(`https://api.whatsapp.com/send?phone=971504429045&text=${text}`, '_blank')
}
</script>

<template>
  <div class="container mx-auto px-4 py-10">
    <div class="max-w-2xl mx-auto">
      <div class="rounded-2xl shadow border border-gray-300" style="border-top-width:4px; border-top-color:#ff832d">
        <div class="p-6">
          <form @submit.prevent="submit" class="space-y-5">
            <p class="text-gray-800">
              Lost your password? Please enter your email address. You will receive a link to create a new password via email.
            </p>

            <div>
              <label for="reset-email" class="block text-sm text-gray-700 mb-1">
                Email
              </label>
              <input
                id="reset-email"
                v-model="email"
                type="email"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="you@example.com"
                autocomplete="email"
              />
            </div>

            <div class="flex items-center justify-between">
              <NuxtLinkLocale to="/auth/login-register" class="text-sm text-gray-700 hover:underline">
                Click here to login
              </NuxtLinkLocale>

              <button
                type="submit"
                :disabled="loading"
                class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60">
                {{ loading ? 'Sending…' : 'Reset Password' }}
              </button>
            </div>

            <p v-if="notice" :class="notice.type === 'success' ? 'text-emerald-700' : 'text-red-600'">
              {{ notice.text }}
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
