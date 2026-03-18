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

const handlePaypalCheckout = async () => {
  // We will build this out next to connect to your Laravel backend!
  console.log("Redirecting to PayPal for $5.00 checkout...")
}

// Format input: force uppercase and remove spaces
const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  searchInput.value = target.value.toUpperCase().replace(/\s/g, '')
}

const isLimitReached = computed(() => {
  return isAuthenticated.value && 
         !user.value?.is_premium && 
         (user.value?.lookup_count || 0) >= 1
})

const handleSearch = async () => {
  // Hard block: Do absolutely nothing if not logged in, invalid, or limit reached
  if (!isVinValid.value || !isAuthenticated.value || isLimitReached.value) return

  errorMsg.value = null
  partNumber.value = null
  loading.value = true

  try {
    const res = await $customApi(`${API_BASE_URL}/vin-lookup`, {
      method: 'POST',
      body: { vin: searchInput.value }
    })

    // Safely extract just the part number from your nested JSON response
    const fetchedPartNumber = res?.part_details?.part_number 
                           || res?.data?.part_details?.part_number 
                           || res?.part_number 
                           || res?.data?.part_number

    if (fetchedPartNumber) {
      partNumber.value = fetchedPartNumber
      
      // Increment local search count if they aren't premium
      if (user.value && !user.value.is_premium) {
        user.value.lookup_count = (user.value.lookup_count || 0) + 1
      }
    } else {
      errorMsg.value = 'No part number found for this VIN.'
    }
  } catch (err: any) {
    // FIXED: Catch the 429 Rate Limit status from Laravel
    const status = err?.status || err?.statusCode || err?.response?.status;
    
    if (status === 429) {
      // Force the local user state to 1. This instantly hides the red error box 
      // and reveals the yellow PayPal button!
      if (user.value) {
        user.value.lookup_count = 1;
      }
      errorMsg.value = null; 
    } else {
      // Handle actual server errors normally
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

          <template v-else-if="isLimitReached">
            <button 
              @click="handlePaypalCheckout"
              class="w-full flex justify-center items-center bg-[#FFC439] text-[#003087] py-4 rounded-xl font-extrabold hover:bg-[#f2ba36] transition shadow-md text-lg transform active:scale-[0.99]"
            >
              <svg class="w-6 h-6 mr-2" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M26.4 11.3C26.4 15.6 22.9 19 18.6 19H14.8L13.3 28.5H8.6L11.3 11.5H16.8C18.4 11.5 19.9 12.1 21 13.2C22.1 14.3 22.7 15.8 22.7 17.4C22.7 18.2 22.5 18.9 22.2 19.6C22 20.2 21.6 20.8 21.1 21.3C20.6 21.8 20 22.2 19.3 22.5C18.6 22.8 17.8 22.9 17 22.9H13.6L14.7 16.2H17.8C20.5 16.2 22.6 14.1 22.6 11.4C22.6 8.7 20.5 6.6 17.8 6.6H10.5L8.2 21H3.5L6.6 1.5H16.8C22.1 1.5 26.4 5.8 26.4 11.3Z" fill="#003087"/>
              </svg>
              Pay $5.00 via PayPal
            </button>
            <p class="mt-4 text-sm text-gray-500 font-medium">
              You have used your free lookup. Additional searches are <span class="font-bold text-gray-800">$5.00 each</span>.
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
              <span v-else>Search Part Database</span>
            </button>
            
            <p v-if="!user?.is_premium && !isLimitReached" class="mt-4 text-sm text-green-600 font-bold">
              ★ 1 Free search remaining in your account.
            </p>
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