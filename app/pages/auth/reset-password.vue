<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from '#imports'

const i18nApi = (useI18n?.() as any) || null
const t = i18nApi?.t ?? ((s: string) => s)

const { $customApi } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const token = computed(() => (route.query.token as string) || '')
const email = computed(() => (route.query.email as string) || '') // optional, just for display

const password = ref('')
const confirm  = ref('')
const loading  = ref(false)
const notice   = ref<{ type:'success'|'error', text:string }|null>(null)

async function submit() {
  notice.value = null
  if (password.value.length < 6) {
    notice.value = { type: 'error', text: t('reset.minLen', 'Password must be at least 6 characters.') }
    return
  }
  if (password.value !== confirm.value) {
    notice.value = { type: 'error', text: t('reset.mismatch', 'Passwords do not match.') }
    return
  }

  loading.value = true
  try {
    await $customApi('/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        password: password.value,
        password_confirmation: confirm.value
      }
    })
    notice.value = { type: 'success', text: t('reset.success', 'Your password has been changed successfully.') }
    setTimeout(() => router.push('/auth/login-register'), 800)
  } catch (e: any) {
    const msg = e?.data?.message || e?.message || t('reset.error', 'Invalid or expired token.')
    notice.value = { type: 'error', text: msg }
  } finally { loading.value = false }
}

function contactWhatsApp() {
  const text = encodeURIComponent('I have a problem with resetting my password')
  window.open(`https://api.whatsapp.com/send?phone=971504429045&text=${text}`, '_blank')
}
</script>

<template>
  <div class="container mx-auto px-4 py-10">
    <div class="max-w-2xl mx-auto">
      <div class="rounded-2xl shadow border border-gray-300"
           style="border-top-width:4px; border-top-color:#ff832d">
        <div class="p-6">
          <form @submit.prevent="submit" class="space-y-5">
            <p class="text-gray-800">
              {{ t('reset.subText', 'Enter your new password below to complete the reset.') }}
            </p>

            <div v-if="email" class="text-sm text-gray-500">
              {{ t('reset.for', 'Resetting password for') }}: <span class="font-medium">{{ email }}</span>
            </div>

            <div>
              <label class="block text-sm text-gray-700 mb-1" for="new-pass">
                {{ t('common.password', 'Password') }}
              </label>
              <input
                id="new-pass"
                v-model="password"
                type="password"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                :placeholder="t('reset.passPlaceholder', 'New password')"
                autocomplete="new-password"
              />
            </div>

            <div>
              <label class="block text-sm text-gray-700 mb-1" for="confirm-pass">
                {{ t('reset.confirm', 'Confirm Password') }}
              </label>
              <input
                id="confirm-pass"
                v-model="confirm"
                type="password"
                required
                class="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                :placeholder="t('reset.confirmPlaceholder', 'Confirm new password')"
                autocomplete="new-password"
              />
            </div>

            <div class="flex items-center justify-between">
              <NuxtLinkLocale
                to="/auth/login-register"
                class="text-sm text-gray-700 hover:underline">
                {{ t('reset.back', 'Back to login') }}
              </NuxtLinkLocale>

              <button
                type="submit"
                :disabled="loading"
                class="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60">
                {{ loading ? t('reset.saving', 'Saving…') : t('reset.cta', 'Update Password') }}
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
