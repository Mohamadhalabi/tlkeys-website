<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNuxtApp } from '#imports'
import { useAuth } from '~/composables/useAuth'
import { useAlertStore } from '~/stores/alert'

const props = defineProps<{
  apiBaseUrl: string
  productId: number | string
  productSlug: string
  sku?: string | null
  whatsapp?: string
}>()

const { $customApi } = useNuxtApp()
const auth = useAuth()
const alert = useAlertStore()

const isLogged = computed(() => !!auth?.user)

const contactName  = ref<string>(auth?.user?.name  || '')
const contactEmail = ref<string>(auth?.user?.email || '')
const contactMsg   = ref<string>('')

const busy = ref(false)

function validate(): string | null {
  if (!contactMsg.value.trim()) return 'Please enter your message.'
  if (!isLogged.value) {
    if (!contactName.value.trim()) return 'Please enter your name.'
    if (!contactEmail.value.trim()) return 'Please enter your email.'
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.value.trim())
    if (!ok) return 'Please enter a valid email address.'
  }
  return null
}

async function submit() {
  const err = validate()
  if (err) {
    alert.showAlert({ type: 'error', title: 'Form error', message: err, timeout: 3500 })
    return
  }

  busy.value = true
  try {
    await $customApi(`${props.apiBaseUrl}/contact-us`, {
      method: 'POST',
      body: {
        name: (contactName.value || auth?.user?.name || '') ?? '',
        email: (contactEmail.value || auth?.user?.email || '') ?? '',
        subject: props.sku ? `Inquiry about SKU ${props.sku}` : '',
        message: contactMsg.value,
        type: 'product',
        product_id: props.productId,
        product_slug: props.productSlug,
      }
    })

    alert.showAlert({
      type: 'success',
      title: 'Message sent',
      sku: props.sku || undefined,
      message: 'Thanks! Your message has been sent.',
      timeout: 3500,
    })

    contactMsg.value = ''
  } catch (e: any) {
    alert.showAlert({
      type: 'error',
      title: 'Couldn’t send message',
      message: e?.message || 'Failed to send. Please try again.',
      timeout: 4500,
    })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit" novalidate>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Name</label>
        <input
          v-model="contactName"
          type="text"
          required
          class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-400 focus:ring focus:ring-orange-100"
          placeholder="Your name"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input
          v-model="contactEmail"
          type="email"
          required
          class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-400 focus:ring focus:ring-orange-100"
          placeholder="name@example.com"
        />
      </div>
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">Message</label>
      <textarea
        v-model="contactMsg"
        rows="5"
        required
        class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-400 focus:ring focus:ring-orange-100"
        placeholder="How can we help?"
      ></textarea>
      <p class="mt-1 text-xs text-gray-500">
        Subject: {{ (sku ? `Inquiry about SKU ${sku}` : 'General inquiry') }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-medium text-white shadow-sm ring-1 ring-orange-500/10 hover:bg-orange-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:opacity-60"
        :disabled="busy"
      >
        <span v-if="!busy">Send Message</span>
        <span v-else>Sending…</span>
      </button>

      <a
        v-if="whatsapp"
        :href="whatsapp"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-white hover:shadow-sm transition"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 .5C5.73.5.5 5.73.5 12c0 2.11.55 4.16 1.6 5.97L.5 23.5l5.72-1.57A11.46 11.46 0 0 0 12 23.5c6.27 0 11.5-5.23 11.5-11.5S18.27.5 12 .5zm0 20.75c-1.89 0-3.72-.5-5.33-1.45l-.38-.23-3.4.93.91-3.32-.25-.39A9.46 9.46 0 1 1 21.46 12c0 5.23-4.23 9.25-9.46 9.25zm5.3-6.95c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15s-.77.97-.95 1.17c-.17.2-.35.22-.65.07s-1.27-.47-2.42-1.5c-.9-.8-1.5-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.5-.5-.67-.5-.17 0-.37 0-.57.02-.2.02-.52.07-.8.37-.27.3-1.05 1.03-1.05 2.52 0 1.5 1.07 2.95 1.22 3.15.15.2 2.1 3.2 5.1 4.47.72.31 1.28.5 1.72.65.72.23 1.37.2 1.88.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/>
        </svg>
        Chat on WhatsApp
      </a>
    </div>
  </form>
</template>
