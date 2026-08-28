<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNuxtApp, useRuntimeConfig } from '#imports'

// Assuming useAuth is your custom composable for authentication
const { isAuthenticated, user } = useAuth() 

const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp()

const searchInput = ref('')
const loading = ref(false)
const partNumber = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

const isVinValid = computed(() => searchInput.value.trim().length === 17)

// Check if user has zero tokens
const hasNoTokens = computed(() => {
  return isAuthenticated.value && (user.value?.tokens || 0) <= 0
})

// Updated checkout handler to accept price and token amount
const handlePaypalCheckout = async (price: number, tokens: number) => {
  // Build your PayPal redirect/modal logic here
}

const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  searchInput.value = target.value.toUpperCase().replace(/\s/g, '')
}

const handleSearch = async () => {
  if (!isVinValid.value || !isAuthenticated.value || hasNoTokens.value) return

  errorMsg.value = null
  partNumber.value = null
  loading.value = true

  try {
    const res = await $customApi(`/vin-lookup`, {
      method: 'POST',
      body: { vin: searchInput.value }
    })

    const fetchedPartNumber = res?.part_details?.part_number 
                           || res?.data?.part_details?.part_number 
                           || res?.part_number 
                           || res?.data?.part_number

    if (fetchedPartNumber) {
      partNumber.value = fetchedPartNumber
      
      // Deduct 1 token locally so the UI updates instantly
      if (user.value && user.value.tokens > 0) {
        user.value.tokens -= 1
      }
    } else {
      errorMsg.value = 'No part number found for this VIN.'
    }
  } catch (err: any) {
    const status = err?.status || err?.statusCode || err?.response?.status;
    
    // We'll use 402 (Payment Required) or 403 for insufficient tokens from Laravel
    if (status === 402 || status === 403) {
      if (user.value) {
        user.value.tokens = 0; // Force to 0 to trigger purchase UI
      }
      errorMsg.value = null; 
    } else {
      errorMsg.value = err?.data?.message || err?.message || 'An error occurred while fetching the part number.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container mx-auto px-4 my-10">
    <div class="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 md:p-12 text-center">
      
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-800">Part Number Lookup</h2>
        <p class="text-sm font-bold text-blue-600 mt-2 uppercase tracking-widest">
          EXCLUSIVE DATABASE FOR KIA / HYUNDAI VEHICLES
        </p>
        <p v-if="isAuthenticated" class="mt-3 font-bold text-lg" :class="hasNoTokens ? 'text-red-500' : 'text-green-600'">
          <svg class="w-5 h-5 inline-block mb-1 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Available Tokens: {{ user?.tokens || 0 }}
        </p>
      </div>

      <div class="max-w-2xl mx-auto space-y-6">
        <div class="relative">
            <input 
            v-model="searchInput"
            @input="handleInput"
            type="text" 
            maxlength="17"
            placeholder="ENTER 17-CHARACTER VIN NUMBER..." 
            class="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-center text-lg uppercase tracking-widest"
            :disabled="loading" 
            @keyup.enter="handleSearch"
            />
        </div>

        <div class="w-full">
          <template v-if="!isAuthenticated">
            <NuxtLink to="/login" class="w-full flex justify-center items-center bg-gray-800 text-white py-4 rounded-xl font-bold hover:bg-gray-900 transition shadow-md text-lg transform active:scale-[0.99]">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              Login to Access This Service
            </NuxtLink>
            <p class="mt-3 text-sm text-gray-500 font-medium">
              You must be logged into your account to search the VIN database.
            </p>
          </template>

          <template v-else-if="hasNoTokens">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                @click="handlePaypalCheckout(7, 1)"
                class="w-full flex flex-col justify-center items-center bg-[#FFC439] text-[#003087] py-4 rounded-xl font-extrabold hover:bg-[#f2ba36] transition shadow-md text-lg transform active:scale-[0.99]"
              >
                <span>Buy 1 Token</span>
                <span class="text-sm font-semibold opacity-80">$7.00 USD</span>
              </button>
              
              <button 
                @click="handlePaypalCheckout(50, 10)"
                class="w-full flex flex-col justify-center items-center bg-[#FFC439] text-[#003087] py-4 border-2 border-[#003087] rounded-xl font-extrabold hover:bg-[#f2ba36] transition shadow-md text-lg transform active:scale-[0.99]"
              >
                <span>Buy 10 Tokens</span>
                <span class="text-sm font-semibold opacity-80">$50.00 USD (Save $20)</span>
              </button>
            </div>
            <p class="mt-4 text-sm text-gray-500 font-medium">
              You need at least 1 token to perform a VIN lookup.
            </p>
          </template>

          <template v-else>
            <button 
              @click="handleSearch"
              :disabled="loading || !isVinValid"
              class="w-full flex justify-center items-center bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-md disabled:bg-gray-200 disabled:text-gray-400 text-lg transform active:scale-[0.99]"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching Database...
              </span>
              <span v-else-if="!isVinValid">Enter 17 Characters to Search</span>
              <span v-else>Search Part Database (Costs 1 Token)</span>
            </button>
          </template>
        </div>
      </div>

      <transition name="fade">
        <div v-if="partNumber || errorMsg" class="max-w-md mx-auto mt-8">
          <div v-if="partNumber" class="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center shadow-sm">
            <span class="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-widest mb-3">
              Match Found
            </span>
            <div class="text-sm text-gray-500 uppercase font-semibold mb-1">OEM Part Number</div>
            <div class="text-3xl font-black text-gray-900">{{ partNumber }}</div>
          </div>
          <div v-if="errorMsg" class="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <div class="text-red-600 font-semibold">{{ errorMsg }}</div>
          </div>
        </div>
      </transition>

    </div>
  </div>
</template>

<style scoped>
input { text-transform: uppercase; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-10px); }
</style>