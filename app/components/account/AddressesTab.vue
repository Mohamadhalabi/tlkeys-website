<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useNuxtApp, useI18n } from '#imports'

/* ---------------- Types ---------------- */
type Address = {
  id: number
  country_id?: number | null
  country_name?: string | null
  zone_id?: number | null
  city?: string | null
  street?: string | null
  address?: string | null
  postal_code?: string | null
  phone?: string | null
  is_default?: number | boolean
}

type Country = {
  id: number
  name: string | Record<string, string>
  iso2?: string | null
  iso3?: string | null
  zone_id?: number | null
}

type AddressForm = Partial<Address> & { is_default?: boolean }

/* ---------------- Setup ---------------- */
const { $customApi } = useNuxtApp()
const { t, locale } = useI18n()

// State
const list = ref<Address[]>([])
const loading = ref(false)
const error = ref('')

// Form State
const showAddressForm = ref(false)
const addressForm = ref<AddressForm>({})
const isEditing = computed(() => !!addressForm.value.id)

// City Logic State
const cityOptions = ref<any[]>([])
const isLoadingCities = ref(false)
const citySearch = ref('')
const showCityList = ref(false)

// Countries State
const countries = ref<Country[]>([])
const countriesLoading = ref(false)
const countriesError = ref<string | null>(null)

/* ---------------- Helpers ---------------- */
function toTitleCase(str: string): string {
  if (!str) return ''
  return str.toLowerCase().split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1)
  }).join(' ')
}

function countryDisplayName(c: Country, loc: string): string {
  try {
    if (typeof c.name === 'string') {
      const parsed = JSON.parse(c.name as string)
      if (parsed && typeof parsed === 'object') {
        return parsed[loc] || (parsed as any).en || (Object.values(parsed)[0] as string) || ''
      }
      return c.name
    }
    if (c.name && typeof c.name === 'object') {
      return (c.name[loc] || (c.name as any).en || (Object.values(c.name)[0] as string) || '') as string
    }
  } catch {}
  return String(c.name ?? '')
}

// FIX: Helper to get country name for the card display
function getAddressCountryName(address: Address): string {
  // 1. Try the name provided by the address API directly
  if (address.country_name) return address.country_name
  
  // 2. If missing, look it up in our countries list using the ID
  if (address.country_id && countries.value.length) {
    const found = countries.value.find(c => c.id === address.country_id)
    if (found) return countryDisplayName(found, String(locale.value))
  }
  
  return '—'
}

// Filter cities based on search
const filteredCities = computed(() => {
  if (!citySearch.value) return cityOptions.value
  const lower = citySearch.value.toLowerCase()
  return cityOptions.value.filter(c => c.name.toLowerCase().includes(lower))
})

/* ---------------- Data Fetching ---------------- */
async function fetchAddresses() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await $customApi('/addresses', { method: 'GET' })
    list.value = res?.data ?? res ?? []
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to load addresses.'
  } finally {
    loading.value = false
  }
}

async function fetchCountries() {
  countriesLoading.value = true
  countriesError.value = null
  try {
    const res = await $customApi<any>('/get-countries')
    const arr = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
    countries.value = (arr || []) as Country[]
  } catch (e: any) {
    countriesError.value = t('errors.failedToLoadCountries') || 'Failed to load countries'
  } finally {
    countriesLoading.value = false
  }
}

/* ---------------- City API Logic ---------------- */
async function fetchCitiesExternal(countryId: number) {
  isLoadingCities.value = true
  cityOptions.value = []
  
  try {
    const countryObj = countries.value.find(c => c.id === countryId)
    if (!countryObj) return

    let cleanCountryName = ''
    if (typeof countryObj.name === 'string') {
        try {
            const parsed = JSON.parse(countryObj.name)
            cleanCountryName = parsed.en || Object.values(parsed)[0]
        } catch {
            cleanCountryName = countryObj.name
        }
    } else if (countryObj.name && typeof countryObj.name === 'object') {
        cleanCountryName = (countryObj.name as any).en || Object.values(countryObj.name)[0]
    }
    
    if (!cleanCountryName) return

    const response = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ country: cleanCountryName })
    })
    
    const json = await response.json()
    
    if (!json.error && Array.isArray(json.data)) {
        const uniqueMap = new Map()
        json.data.forEach((cityName: string, index: number) => {
            if(!cityName) return
            const niceName = toTitleCase(cityName.trim())
            const key = niceName.toLowerCase()
            if(!uniqueMap.has(key)) {
                uniqueMap.set(key, { id: index, name: niceName })
            }
        })
        cityOptions.value = Array.from(uniqueMap.values())
    }
  } catch (e) {
    console.error("Failed to load cities from external API", e)
  } finally {
    isLoadingCities.value = false
  }
}

function selectCity(city: any) {
  addressForm.value.city = city.name
  citySearch.value = city.name
  showCityList.value = false
}

function onCityBlur() {
  setTimeout(() => {
    const match = cityOptions.value.find(c => c.name.toLowerCase() === citySearch.value.trim().toLowerCase())
    if (match) {
       addressForm.value.city = match.name
       citySearch.value = match.name
    } else {
       const typed = citySearch.value.trim()
       if(typed.length > 0) {
           addressForm.value.city = toTitleCase(typed)
       } else {
           addressForm.value.city = ''
       }
    }
    showCityList.value = false
  }, 200)
}

/* ---------------- Form UX ---------------- */
function openAddressForm(a?: Address) {
  if (a) {
      // Edit Mode
      addressForm.value = { 
        ...a,
        is_default: !!a.is_default
      }
      citySearch.value = a.city || ''
      if(a.country_id) fetchCitiesExternal(a.country_id)
  } else {
      // New Mode
      addressForm.value = {
        country_id: undefined as any,
        city: '',
        street: '',
        address: '',
        phone: '',
        postal_code: '',
        is_default: false
      }
      citySearch.value = ''
      cityOptions.value = []
  }
  showAddressForm.value = true
}

function closeAddressForm() { 
  showAddressForm.value = false 
  cityOptions.value = []
  citySearch.value = ''
  error.value = ''
}

// Watch Country Change
watch(() => addressForm.value.country_id, (newId, oldId) => {
  if (!showAddressForm.value) return
  if (oldId !== undefined && newId !== oldId) {
     addressForm.value.city = ''
     citySearch.value = ''
     addressForm.value.postal_code = '' 
  }
  if (newId) {
    fetchCitiesExternal(newId)
  } else {
    cityOptions.value = []
  }
})

/* ---------------- Save/Delete ---------------- */
async function saveAddress() {
  const body = { ...addressForm.value }
  
  if (!body.country_id || !String(body.city||'').trim() || !String(body.street||'').trim()
      || !String(body.address||'').trim() || !String(body.phone||'').trim()) {
    alert(t('checkout.allAddressFieldsRequired') || 'Please fill in all address fields.')
    return
  }

  try {
    let savedId: number | null = null

    if (isEditing.value && body.id) {
      // FIX: Use POST and the specific edit endpoint (matches Checkout.vue)
      await $customApi(`/edit-addresses/${body.id}`, { method: 'POST', body })
      savedId = Number(body.id)
    } else {
      // CREATE
      const res = await $customApi<{ id: number }>(`/addresses`, { method: 'POST', body })
      savedId = (res as any)?.id ?? null
    }

    if (body.is_default && (savedId || body.id)) {
      const idToSet = Number(savedId || body.id)
      if (Number.isFinite(idToSet)) {
        await $customApi(`/addresses/${idToSet}/default`, { method: 'POST' })
      }
    }

    await fetchAddresses()
    closeAddressForm()
  } catch (e: any) {
    console.error(e)
    alert(e?.data?.message || e?.message || 'Save failed.')
  }
}

async function removeAddress(a: Address) {
  if (!confirm(t('checkout.deleteAddressConfirm') || 'Delete this address?')) return
  try {
    await $customApi(`/delete-addresses/${a.id}`, { method: 'POST' })
    await fetchAddresses()
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Delete failed.')
  }
}

/* ---------------- Lifecycle ---------------- */
onMounted(async () => {
  await Promise.all([fetchAddresses(), fetchCountries()])
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="font-semibold text-xl flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm.75 5a.75.75 0 10-1.5 0v6a.75.75 0 00.75.75H16a.75.75 0 000-1.5h-3.25V7z" v-if="loading"/>
            <path d="M12 12a5 5 0 100-10 5 5 0 000 10z" v-else/><path fill-rule="evenodd" d="M2 20a8 8 0 1116 0v1H2v-1z" clip-rule="evenodd" v-if="!loading"/>
        </svg>
        {{ $t('checkout.addrress') || 'Addresses' }}
      </h2>
      
      <button 
        v-if="!showAddressForm"
        class="rounded-2xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 bg-white shadow-sm"
        @click="openAddressForm()"
      >
        + {{ $t('checkout.addAddress') || 'Add New' }}
      </button>
    </div>

    <div v-if="error" class="p-4 rounded-2xl bg-red-50 text-red-700 border border-red-200">
      {{ error }}
    </div>

    <div v-if="loading" class="py-10 text-center text-gray-500">
      Loading...
    </div>

    <div v-else>
      
      <div v-if="!showAddressForm">
        <div v-if="list.length === 0" class="text-gray-500 italic p-4 text-center border rounded-2xl bg-gray-50">
           {{ $t('checkout.noAddresses') || 'No addresses found. Please add one.' }}
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <div
            v-for="a in list"
            :key="a.id"
            class="rounded-2xl border p-4 bg-white hover:shadow-md transition duration-200 relative group"
            :class="a.is_default ? 'ring-2 ring-emerald-500 ring-offset-2' : ''"
          >
             <div class="absolute top-4 right-4 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                 <button class="p-1.5 rounded-lg border bg-white hover:bg-gray-50 text-gray-600" @click="openAddressForm(a)" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                 </button>
                 <button class="p-1.5 rounded-lg border bg-white hover:bg-red-50 text-red-600" @click="removeAddress(a)" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
             </div>

            <div class="pr-16">
              <div class="font-bold text-gray-900 flex items-center gap-2">
                {{ getAddressCountryName(a) }} <span v-if="a.city">— {{ a.city }}</span>
              </div>
              <div class="text-sm text-gray-600 mt-1">
                <template v-if="a.street">{{ a.street }}<br /></template>
                {{ a.address }}
              </div>
              <div class="mt-2 text-sm text-gray-500 space-y-0.5">
                 <div v-if="a.phone">☎ {{ a.phone }}</div>
                 <div v-if="a.postal_code">📮 {{ a.postal_code }}</div>
              </div>

              <div class="mt-3" v-if="a.is_default">
                 <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200 text-xs font-medium">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>{{ $t('checkout.default') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="bg-gray-50 p-6 rounded-2xl border border-gray-200">
         <h4 class="text-lg font-bold mb-4 text-gray-800">
           {{ isEditing ? $t('checkout.editAddress') : $t('checkout.newAddress') }}
         </h4>
         
         <form @submit.prevent="saveAddress" class="space-y-4 max-w-2xl">
          <div>
            <label class="text-sm font-medium block mb-1.5 text-gray-700">{{ $t('checkout.country') }}</label>
            <select v-model.number="addressForm.country_id" class="w-full rounded-xl border-gray-300 shadow-sm px-3 py-2.5 bg-white border focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition" required>
              <option value="">{{ $t('checkout.selectCountry') }}</option>
              <option v-for="c in countries" :key="c.id" :value="c.id">
                {{ countryDisplayName(c, String($i18n?.locale || locale)) }}
              </option>
            </select>
          </div>

          <div class="relative">
            <label class="text-sm font-medium block mb-1.5 text-gray-700">
              {{ $t('checkout.city') }}
              <span class="text-red-500">*</span>
            </label>
            
            <div class="relative">
              <input 
                type="text"
                v-model="citySearch"
                @focus="showCityList = true"
                @blur="onCityBlur"
                class="w-full rounded-xl border-gray-300 shadow-sm px-3 py-2.5 pr-10 bg-white border focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition"
                :placeholder="isLoadingCities ? 'Loading cities...' : ($t('checkout.enterCity') || 'Select city...')"
                :disabled="!addressForm.country_id || isLoadingCities"
                autocomplete="off"
                required
              />

              <div v-if="isLoadingCities" class="absolute right-3 top-3">
                <svg class="animate-spin h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              </div>
              <div v-else class="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>

              <ul 
                v-if="showCityList && !isLoadingCities && cityOptions.length > 0" 
                class="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
              >
                <li 
                  v-for="city in filteredCities" 
                  :key="city.id"
                  @mousedown.prevent="selectCity(city)"
                  class="cursor-pointer select-none relative py-2.5 pl-3 pr-9 hover:bg-orange-50 text-gray-900 border-b border-gray-50 last:border-0"
                >
                  <span class="block truncate font-normal" :class="{ 'font-semibold text-orange-600': addressForm.city === city.name }">
                    {{ city.name }}
                  </span>
                  <span v-if="addressForm.city === city.name" class="absolute inset-y-0 right-0 flex items-center pr-4 text-orange-600">
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </span>
                </li>
                <li v-if="filteredCities.length === 0" class="px-3 py-2 text-gray-500 text-sm">
                   No results. You can type manually.
                </li>
              </ul>
            </div>
          </div>

          <div>
            <label class="text-sm font-medium block mb-1.5 text-gray-700">{{ $t('checkout.street') }}</label>
            <input v-model="addressForm.street" type="text" class="w-full rounded-xl border-gray-300 shadow-sm px-3 py-2.5 bg-white border focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition" required />
          </div>

          <div>
            <label class="text-sm font-medium block mb-1.5 text-gray-700">{{ $t('checkout.address') }}</label>
            <textarea v-model="addressForm.address" rows="3" class="w-full rounded-xl border-gray-300 shadow-sm px-3 py-2.5 bg-white border focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition" required></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium block mb-1.5 text-gray-700">
                {{ $t('checkout.postalCode') }}
              </label>
              <input 
                v-model="addressForm.postal_code" 
                type="text" 
                class="w-full rounded-xl border-gray-300 shadow-sm px-3 py-2.5 bg-white border focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition"
                required 
              />
            </div>

            <div>
              <label class="text-sm font-medium block mb-1.5 text-gray-700">{{ $t('checkout.phone') }}</label>
              <input v-model="addressForm.phone" type="text" class="w-full rounded-xl border-gray-300 shadow-sm px-3 py-2.5 bg-white border focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition" required />
            </div>
          </div>

          <div class="pt-2">
            <label class="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="addressForm.is_default" class="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
              <span class="text-sm text-gray-700">{{ $t('checkout.setAsDefault') }}</span>
            </label>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-gray-200 mt-4">
            <button type="button" class="px-5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-medium text-gray-700 transition" @click="closeAddressForm">{{ $t('cancel') }}</button>
            <button type="submit" class="px-5 py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 shadow-md shadow-orange-200 transition">{{ $t('save') }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>