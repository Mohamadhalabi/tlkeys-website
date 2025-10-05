<script setup lang="ts">
import { ref } from 'vue'
import { useNuxtApp, useHead } from '#imports'

definePageMeta({ layout: 'pincode_layout' })

// 🧠 Set HTML <title> and meta tags
useHead({
  title: 'VIN → PIN (OLD) | Sandbox Demo',
  meta: [
    { name: 'description', content: 'Demo sandbox for VIN to PIN (OLD). Enter a VIN to retrieve key and pin codes.' },
  ],
})

const { $customApi } = useNuxtApp()

const vin = ref('')
const username = ref('demo321')  // demo user
const keyCode = ref('')
const pinCode = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

function normalizeVin() {
  vin.value = vin.value.replace(/o/gi, '0').toUpperCase().slice(0, 17)
}

async function submitOld() {
  errorMessage.value = null
  keyCode.value = ''
  pinCode.value = ''
  isLoading.value = true

  try {
    const data = await $customApi('/sandbox/vin-to-pin-old', {
      method: 'POST',
      body: { vin: vin.value, username: username.value },
    })

    if ((data as any)?.error) {
      errorMessage.value = (data as any).error
      return
    }

    keyCode.value = (data as any)?.key_code || ''
    pinCode.value = (data as any)?.pin_code || ''
  } catch (e: any) {
    const status = e?.status
    const data = e?.data
    if (status === 401) errorMessage.value = data?.error || 'Unauthorized.'
    else if (status === 404) errorMessage.value = data?.error || 'Not found.'
    else if (status === 422) {
      errorMessage.value =
        data?.errors?.username?.[0] ||
        data?.errors?.vin?.[0] ||
        'Invalid input.'
    } else errorMessage.value = data?.error || data?.message || 'Unexpected error.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-black text-white flex items-center justify-center p-6">
    <div class="w-full max-w-xl">
      <h1 class="text-center text-2xl font-semibold mb-6">Demo — VIN → PIN (OLD)</h1>

      <div v-if="errorMessage" class="mb-4 rounded-md bg-red-500/15 border border-red-400 p-3 text-red-200">
        {{ errorMessage }}
      </div>

      <div class="space-y-4">
        <input class="field" placeholder="VIN (17 chars)"
               v-model="vin" @input="normalizeVin" maxlength="17" />
        <input class="field" placeholder="Username" v-model="username" type="password" />
        <button class="btn" :disabled="isLoading" @click="submitOld">
          {{ isLoading ? 'Loading…' : 'GET' }}
        </button>

        <div class="grid grid-cols-2 gap-3 mt-4">
          <input class="field" placeholder="Key Code" :value="keyCode" readonly />
          <input class="field" placeholder="Pin Code" :value="pinCode" readonly />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.field {
  width: 100%;
  height: 52px;
  background: #222;
  border: 1.5px solid #3a3a3a;
  border-radius: 12px;
  text-align: center;
  color: #eee;
  outline: none;
}
.field::placeholder { color: #a6a6a6; }
.btn {
  width: 100%;
  height: 52px;
  background: #5fb99c;
  border-radius: 12px;
  font-weight: 800;
  color: #fff;
}
.btn:disabled { opacity: .7; }
</style>
