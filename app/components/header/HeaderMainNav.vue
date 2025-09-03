<template>
  <!-- sticky + dynamic shadow on scroll -->
  <nav
    ref="mainNavRef"
    class="header-main-nav sticky top-0 z-50 bg-gray-900/95 text-white backdrop-blur supports-[backdrop-filter]:bg-gray-900/80"
    :class="scrolled ? 'shadow-lg ring-1 ring-black/10' : ''"
    v-cloak
  >
    <div class="container mx-auto relative" ref="containerRef">
      <div class="flex items-center gap-2 justify-center">
        <!-- Cars -->
        <button
          type="button"
          class="px-4 py-3 hover:bg-gray-800 flex items-center gap-2"
          :class="btnClass(openCars)"
          @click="toggleCars"
          :aria-expanded="openCars ? 'true' : 'false'"
        >
          {{ $t('cars') || 'Cars' }}
          <svg class="w-4 h-4 transition-transform" :class="openCars ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Manufacturers -->
        <button
          type="button"
          class="px-4 py-3 hover:bg-gray-800 flex items-center gap-2"
          :class="btnClass(openManufacturers)"
          @click="toggleManufacturers"
          :aria-expanded="openManufacturers ? 'true' : 'false'"
        >
          {{ $t('manufacturers') || 'Manufacturers' }}
          <svg class="w-4 h-4 transition-transform" :class="openManufacturers ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Keys & Remotes -->
        <button
          type="button"
          class="px-4 py-3 hover:bg-gray-800 flex items-center gap-2"
          :class="btnClass(openKeys)"
          @click="toggleKeys"
          :aria-expanded="openKeys ? 'true' : 'false'"
        >
          {{ $t('keysRemotes') || 'Keys & Remotes' }}
          <svg class="w-4 h-4 transition-transform" :class="openKeys ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Devices & Machines -->
        <button
          type="button"
          class="px-4 py-3 hover:bg-gray-800 flex items-center gap-2"
          :class="btnClass(openDevices)"
          @click="toggleDevices"
          :aria-expanded="openDevices ? 'true' : 'false'"
        >
          {{ $t('devicesMachines') || 'Devices & Machines' }}
          <svg class="w-4 h-4 transition-transform" :class="openDevices ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Accessories & Tools -->
        <button
          type="button"
          class="px-4 py-3 hover:bg-gray-800 flex items-center gap-2"
          :class="btnClass(openAccessories)"
          @click="toggleAccessories"
          :aria-expanded="openAccessories ? 'true' : 'false'"
        >
          {{ $t('accessoriesTools') || 'Accessories & Tools' }}
          <svg class="w-4 h-4 transition-transform" :class="openAccessories ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </button>

        <!-- Software & Tokens -->
        <button
          type="button"
          class="px-4 py-3 hover:bg-gray-800 flex items-center gap-2"
          :class="btnClass(openSoftTok)"
          @click="toggleSoftTok"
          :aria-expanded="openSoftTok ? 'true' : 'false'"
        >
          {{ $t('softwareTokens') || 'Software & Tokens' }}
          <svg class="w-4 h-4 transition-transform" :class="openSoftTok ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </button>

        <NuxtLinkLocale
          to="/downloads"
          class="px-4 py-3 hover:bg-gray-800 flex items-center gap-2"
          :class="linkClass('/downloads')"
          :aria-current="isActive('/downloads') ? 'page' : undefined"
        >
          {{ $t('downloads') || 'Downloads' }}
        </NuxtLinkLocale>

        <NuxtLinkLocale
          to="/pin-code"
          class="px-4 py-3 bg-red-500 hover:bg-gray-800 flex items-center gap-2"
          :class="linkClass('/pin-code')"
          :aria-current="isActive('/pin-code') ? 'page' : undefined"
        >
          {{ $t('pinCodes') || 'Pin Codes' }}
        </NuxtLinkLocale>
      </div>

      <!-- Cars dropdown -->
      <Transition name="fade-scale">
        <div v-if="openCars" class="absolute left-0 right-0 mt-1 z-50">
          <div class="mx-auto max-w-screen-xl bg-white text-gray-900 rounded-xl shadow-2xl ring-1 ring-black/10">
            <div class="p-3 border-b border-gray-200 flex items-center gap-3">
              <span v-if="loadingCars" class="text-sm text-gray-600">{{ $t('loading') || 'Loading…' }}</span>
              <span v-else-if="errorCars" class="text-sm text-red-600">{{ errorCars }}</span>
              <input v-model="carsQuery" type="text" :placeholder="$t('searchBrand') || 'Search brand…'" class="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div class="p-4 max-h-[40vh] lg:max-h-[50vh] xl:max-h-[60vh] overflow-y-auto">
              <div v-if="filteredCars.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                <button v-for="item in filteredCars" :key="item.slug" class="group flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 text-center" @click="goToBrand(item.slug)">
                  <img :src="item.image" :alt="item.name" class="h-20 w-20 object-contain rounded" loading="lazy" />
                  <span class="text-sm text-gray-800 group-hover:text-gray-900 line-clamp-1">{{ item.name }}</span>
                </button>
              </div>
              <div v-else-if="!loadingCars" class="p-6 text-center text-sm text-gray-600">{{ $t('noResults') || 'No results found.' }}</div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Manufacturers dropdown -->
      <Transition name="fade-scale">
        <div v-if="openManufacturers" class="absolute left-0 right-0 mt-1 z-50">
          <div class="mx-auto max-w-screen-xl bg-white text-gray-900 rounded-xl shadow-2xl ring-1 ring-black/10">
            <div class="p-3 border-b border-gray-200 flex items-center gap-3">
              <span v-if="loadingManufacturers" class="text-sm text-gray-600">{{ $t('loading') || 'Loading…' }}</span>
              <span v-else-if="errorManufacturers" class="text-sm text-red-600">{{ errorManufacturers }}</span>
              <input v-model="manufacturersQuery" type="text" :placeholder="$t('searchManufacturer') || 'Search manufacturer…'" class="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div class="p-4 max-h-[60vh] overflow-y-auto">
              <div v-if="filteredManufacturers.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                <button v-for="item in filteredManufacturers" :key="item.slug" class="group flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 text-center" @click="goToBrand(item.slug)">
                  <img :src="item.image" :alt="item.name" class="h-20 w-20 object-contain rounded" loading="lazy" />
                  <span class="text-sm text-gray-800 group-hover:text-gray-900 line-clamp-1">{{ item.name }}</span>
                </button>
              </div>
              <div v-else-if="!loadingManufacturers" class="p-6 text-center text-sm text-gray-600">{{ $t('noResults') || 'No results found.' }}</div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Keys & Remotes dropdown -->
      <Transition name="fade-scale">
        <div v-if="openKeys" class="absolute left-0 right-0 mt-1 z-50">
          <div class="mx-auto max-w-screen-xl bg-white text-gray-900 rounded-xl shadow-2xl ring-1 ring-black/10">
            <div class="p-3 border-b border-gray-200 flex items-center gap-3">
              <span v-if="loadingKeys" class="text-sm text-gray-600">{{ $t('loading') || 'Loading…' }}</span>
              <span v-else-if="errorKeys" class="text-sm text-red-600">{{ errorKeys }}</span>
              <input v-model="keysQuery" type="text" :placeholder="$t('searchKeyRemote') || 'Search keys & remotes…'" class="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div class="p-4 max-h-[60vh] overflow-y-auto">
              <div v-if="filteredKeys.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                <button v-for="item in filteredKeys" :key="item.slug" class="group flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 text-center" @click="goToBrand(item.slug)">
                  <img :src="item.image" :alt="item.name" class="h-20 w-20 object-contain rounded" loading="lazy" />
                  <span class="text-sm text-gray-800 group-hover:text-gray-900 line-clamp-1">{{ item.name }}</span>
                </button>
              </div>
              <div v-else-if="!loadingKeys" class="p-6 text-center text-sm text-gray-600">{{ $t('noResults') || 'No results found.' }}</div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Devices & Machines dropdown -->
      <Transition name="fade-scale">
        <div v-if="openDevices" class="absolute left-0 right-0 mt-1 z-50">
          <div class="mx-auto max-w-screen-xl bg-white text-gray-900 rounded-xl shadow-2xl ring-1 ring-black/10">
            <div class="p-3 border-b border-gray-200 flex items-center gap-3">
              <span v-if="loadingDevices" class="text-sm text-gray-600">{{ $t('loading') || 'Loading…' }}</span>
              <span v-else-if="errorDevices" class="text-sm text-red-600">{{ errorDevices }}</span>
              <input v-model="devicesQuery" type="text" :placeholder="$t('searchDeviceMachine') || 'Search devices & machines…'" class="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div class="p-4 max-h-[60vh] overflow-y-auto">
              <div v-if="filteredDevices.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                <button v-for="item in filteredDevices" :key="item.slug" class="group flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 text-center" @click="goToBrand(item.slug)">
                  <img :src="item.image" :alt="item.name" class="h-20 w-20 object-contain rounded" loading="lazy" />
                  <span class="text-sm text-gray-800 group-hover:text-gray-900 line-clamp-1">{{ item.name }}</span>
                </button>
              </div>
              <div v-else-if="!loadingDevices" class="p-6 text-center text-sm text-gray-600">{{ $t('noResults') || 'No results found.' }}</div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Accessories & Tools dropdown -->
      <Transition name="fade-scale">
        <div v-if="openAccessories" class="absolute left-0 right-0 mt-1 z-50">
          <div class="mx-auto max-w-screen-xl bg-white text-gray-900 rounded-xl shadow-2xl ring-1 ring-black/10">
            <div class="p-3 border-b border-gray-200 flex items-center gap-3">
              <span v-if="loadingAccessories" class="text-sm text-gray-600">{{ $t('loading') || 'Loading…' }}</span>
              <span v-else-if="errorAccessories" class="text-sm text-red-600">{{ errorAccessories }}</span>
              <input v-model="accessoriesQuery" type="text" :placeholder="$t('searchAccessoriesTools') || 'Search accessories & tools…'" class="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-gray-500" />
            </div>
            <div class="p-4 max-h-[60vh] overflow-y-auto">
              <div v-if="filteredAccessories.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                <button v-for="item in filteredAccessories" :key="item.slug" class="group flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 text-center" @click="goToBrand(item.slug)">
                  <img :src="item.image" :alt="item.name" class="h-20 w-20 object-contain rounded" loading="lazy" />
                  <span class="text-sm text-gray-800 group-hover:text-gray-900 line-clamp-1">{{ item.name }}</span>
                </button>
              </div>
              <div v-else-if="!loadingAccessories" class="p-6 text-center text-sm text-gray-600">{{ $t('noResults') || 'No results found.' }}</div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Software & Tokens dropdown (two columns) -->
      <Transition name="fade-scale">
        <div v-if="openSoftTok" class="absolute left-0 right-0 mt-1 z-50">
          <div class="mx-auto max-w-screen-xl bg-white text-gray-900 rounded-xl shadow-2xl ring-1 ring-black/10">
            <!-- Top bar -->
            <div class="p-3 border-b border-gray-200 flex items-center gap-3">
              <span v-if="loadingSoftTok" class="text-sm text-gray-600">
                {{ $t('loading') || 'Loading…' }}
              </span>
              <span v-else-if="errorSoftTok" class="text-sm text-red-600">
                {{ errorSoftTok }}
              </span>
              <input
                v-model="softTokQuery"
                type="text"
                :placeholder="$t('searchSoftwareTokens') || 'Search software & tokens…'"
                class="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>

            <!-- Two columns with divider -->
            <div class="p-4 max-h-[60vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-gray-300">
              <!-- Softwares -->
              <div class="md:pr-4">
                <h4 class="mb-3 font-semibold text-gray-900">
                  {{ $t('Softwares') || 'Softwares' }}
                </h4>
                <div v-if="filteredSoftwares.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <button
                    v-for="item in filteredSoftwares"
                    :key="'soft-'+item.slug"
                    class="group flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 text-center"
                    @click="goToBrand(item.slug, 'software')"
                  >
                    <img :src="item.image" :alt="item.name" class="h-16 w-16 object-contain rounded" loading="lazy" />
                    <span class="text-sm text-gray-800 group-hover:text-gray-900 line-clamp-1">
                      {{ item.name }}
                    </span>
                  </button>
                </div>
                <div v-else-if="!loadingSoftTok" class="text-sm text-gray-600">
                  {{ $t('noResults') || 'No results found.' }}
                </div>
              </div>

              <!-- Tokens -->
              <div class="md:pl-4">
                <h4 class="mb-3 font-semibold text-gray-900">
                  {{ $t('Tokens') || 'Tokens' }}
                </h4>
                <div v-if="filteredTokens.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <button
                    v-for="item in filteredTokens"
                    :key="'tok-'+item.slug"
                    class="group flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 text-center"
                    @click="goToBrand(item.slug, 'token')"
                  >
                    <img :src="item.image" :alt="item.name" class="h-16 w-16 object-contain rounded" loading="lazy" />
                    <span class="text-sm text-gray-800 group-hover:text-gray-900 line-clamp-1">
                      {{ item.name }}
                    </span>
                  </button>
                </div>
                <div v-else-if="!loadingSoftTok" class="text-sm text-gray-600">
                  {{ $t('noResults') || 'No results found.' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

    </div>
  </nav>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'

const { public: { API_BASE_URL } } = useRuntimeConfig()
const { t } = useI18n()
const router = useRouter()
const route = useRoute()

/* ---------- sticky + scroll shadow ---------- */
const scrolled = ref(false)
let handleScroll = null

/* ---------- expose main-nav height for a second sticky bar ---------- */
const mainNavRef = ref(null)
let ro = null
const setMainNavHeightVar = () => {
  const h = mainNavRef.value?.offsetHeight ?? 56
  document.documentElement.style.setProperty('--main-nav-h', `${h}px`)
}

/* ---------- open states ---------- */
const openCars = ref(false)
const openManufacturers = ref(false)
const openKeys = ref(false)
const openDevices = ref(false)
const openAccessories = ref(false)
const openSoftTok = ref(false)

/* ---------- data ---------- */
const cars = ref([])
const manufacturers = ref([])
const keysRemotes = ref([])
const devicesMachines = ref([])
const accessoriesTools = ref([])
const softwares = ref([])
const tokens = ref([])

/* ---------- loading / errors ---------- */
const loadingCars = ref(false);          const errorCars = ref('')
const loadingManufacturers = ref(false); const errorManufacturers = ref('')
const loadingKeys = ref(false);          const errorKeys = ref('')
const loadingDevices = ref(false);       const errorDevices = ref('')
const loadingAccessories = ref(false);   const errorAccessories = ref('')
const loadingSoftTok = ref(false);       const errorSoftTok = ref('')

/* ---------- queries ---------- */
const carsQuery = ref('')
const manufacturersQuery = ref('')
const keysQuery = ref('')
const devicesQuery = ref('')
const accessoriesQuery = ref('')
const softTokQuery = ref('')

const containerRef = ref(null)

/* ---------- extractors ---------- */
function extractCars(res) {
  return res?.menu?.car_menu ?? res?.data?.menu?.car_menu ?? res?.car_menu ?? (Array.isArray(res) ? res : [])
}
function extractManufacturers(res) {
  return res?.menu?.manufacturer_menu ?? res?.data?.menu?.manufacturer_menu ?? res?.manufacturer_menu ?? (Array.isArray(res) ? res : [])
}
function extractKeysRemotes(res) {
  return res?.menu?.keys_and_remotes_menu ?? res?.data?.menu?.keys_and_remotes_menu ?? res?.keys_and_remotes_menu ?? (Array.isArray(res) ? res : [])
}
function extractDevicesMachines(res) {
  return res?.menu?.devices_and_machines_menu ?? res?.data?.menu?.devices_and_machines_menu ?? res?.devices_and_machines_menu ?? (Array.isArray(res) ? res : [])
}
function extractAccessoriesTools(res) {
  return res?.menu?.accessories_and_tools_menu ?? res?.data?.menu?.accessories_and_tools_menu ?? res?.accessories_and_tools_menu ?? (Array.isArray(res) ? res : [])
}
function extractSoftwareTokens(res) {
  const node =
    res?.menu?.software_and_tokens ??
    res?.data?.menu?.software_and_tokens ??
    res?.software_and_tokens ??
    res ?? {}
  return {
    softwares: Array.isArray(node.softwares) ? node.softwares : [],
    tokens: Array.isArray(node.tokens) ? node.tokens : [],
  }
}

/* ---------- filters ---------- */
const filteredCars = computed(() => {
  const q = carsQuery.value.trim().toLowerCase()
  return q ? cars.value.filter(i => i.name?.toLowerCase().includes(q)) : cars.value
})
const filteredManufacturers = computed(() => {
  const q = manufacturersQuery.value.trim().toLowerCase()
  return q ? manufacturers.value.filter(i => i.name?.toLowerCase().includes(q)) : manufacturers.value
})
const filteredKeys = computed(() => {
  const q = keysQuery.value.trim().toLowerCase()
  return q ? keysRemotes.value.filter(i => i.name?.toLowerCase().includes(q)) : keysRemotes.value
})
const filteredDevices = computed(() => {
  const q = devicesQuery.value.trim().toLowerCase()
  return q ? devicesMachines.value.filter(i => i.name?.toLowerCase().includes(q)) : devicesMachines.value
})
const filteredAccessories = computed(() => {
  const q = accessoriesQuery.value.trim().toLowerCase()
  return q ? accessoriesTools.value.filter(i => i.name?.toLowerCase().includes(q)) : accessoriesTools.value
})
const filteredSoftwares = computed(() => {
  const q = softTokQuery.value.trim().toLowerCase()
  return q ? (softwares.value || []).filter(i => i.name?.toLowerCase().includes(q)) : (softwares.value || [])
})
const filteredTokens = computed(() => {
  const q = softTokQuery.value.trim().toLowerCase()
  return q ? (tokens.value || []).filter(i => i.name?.toLowerCase().includes(q)) : (tokens.value || [])
})

/* ---------- toggles ---------- */
async function toggleCars() {
  const next = !openCars.value; closeAll(); openCars.value = next
  if (openCars.value && !cars.value.length) await fetchCars()
}
async function toggleManufacturers() {
  const next = !openManufacturers.value; closeAll(); openManufacturers.value = next
  if (openManufacturers.value && !manufacturers.value.length) await fetchManufacturers()
}
async function toggleKeys() {
  const next = !openKeys.value; closeAll(); openKeys.value = next
  if (openKeys.value && !keysRemotes.value.length) await fetchKeysRemotes()
}
async function toggleDevices() {
  const next = !openDevices.value; closeAll(); openDevices.value = next
  if (openDevices.value && !devicesMachines.value.length) await fetchDevicesMachines()
}
async function toggleAccessories() {
  const next = !openAccessories.value; closeAll(); openAccessories.value = next
  if (openAccessories.value && !accessoriesTools.value.length) await fetchAccessoriesTools()
}
async function toggleSoftTok() {
  const next = !openSoftTok.value; closeAll(); openSoftTok.value = next
  if (openSoftTok.value && (!softwares.value.length && !tokens.value.length)) {
    await fetchSoftwareTokens()
  }
}
function closeAll() {
  openCars.value = false
  openManufacturers.value = false
  openKeys.value = false
  openDevices.value = false
  openAccessories.value = false
  openSoftTok.value = false
}

/* ---------- fetchers ---------- */
async function fetchCars() {
  loadingCars.value = true; errorCars.value = ''
  try {
    const { $customApi } = useNuxtApp()
    const res = await $customApi(`${API_BASE_URL}/get_cars_menu`, { method: 'GET' })
    cars.value = Array.isArray(extractCars(res)) ? extractCars(res) : []
  } catch (err) {
    errorCars.value = err?.data?.message || err?.message || t('error') || 'Error loading cars.'
  } finally { loadingCars.value = false }
}
async function fetchManufacturers() {
  loadingManufacturers.value = true; errorManufacturers.value = ''
  try {
    const { $customApi } = useNuxtApp()
    const res = await $customApi(`${API_BASE_URL}/get_manufacturers_menu`, { method: 'GET' })
    manufacturers.value = Array.isArray(extractManufacturers(res)) ? extractManufacturers(res) : []
  } catch (err) {
    errorManufacturers.value = err?.data?.message || err?.message || t('error') || 'Error loading manufacturers.'
  } finally { loadingManufacturers.value = false }
}
async function fetchKeysRemotes() {
  loadingKeys.value = true; errorKeys.value = ''
  try {
    const { $customApi } = useNuxtApp()
    const res = await $customApi(`${API_BASE_URL}/get_keys_and_remotes_menu`, { method: 'GET' })
    keysRemotes.value = Array.isArray(extractKeysRemotes(res)) ? extractKeysRemotes(res) : []
  } catch (err) {
    errorKeys.value = err?.data?.message || err?.message || t('error') || 'Error loading keys & remotes.'
  } finally { loadingKeys.value = false }
}
async function fetchDevicesMachines() {
  loadingDevices.value = true; errorDevices.value = ''
  try {
    const { $customApi } = useNuxtApp()
    const res = await $customApi(`${API_BASE_URL}/get_devices_and_machines`, { method: 'GET' })
    devicesMachines.value = Array.isArray(extractDevicesMachines(res)) ? extractDevicesMachines(res) : []
  } catch (err) {
    errorDevices.value = err?.data?.message || err?.message || t('error') || 'Error loading devices & machines.'
  } finally { loadingDevices.value = false }
}
async function fetchAccessoriesTools() {
  loadingAccessories.value = true; errorAccessories.value = ''
  try {
    const { $customApi } = useNuxtApp()
    const res = await $customApi(`${API_BASE_URL}/get_accessories_and_tools`, { method: 'GET' })
    accessoriesTools.value = Array.isArray(extractAccessoriesTools(res)) ? extractAccessoriesTools(res) : []
  } catch (err) {
    errorAccessories.value = err?.data?.message || err?.message || t('error') || 'Error loading accessories & tools.'
  } finally { loadingAccessories.value = false }
}
async function fetchSoftwareTokens() {
  loadingSoftTok.value = true; errorSoftTok.value = ''
  try {
    const { $customApi } = useNuxtApp()
    const res = await $customApi(`${API_BASE_URL}/get_softwares_and_tokens`, { method: 'GET' })
    const { softwares: s, tokens: t } = extractSoftwareTokens(res)
    softwares.value = s
    tokens.value = t
  } catch (err) {
    errorSoftTok.value = err?.data?.message || err?.message || t('error') || 'Error loading software & tokens.'
  } finally { loadingSoftTok.value = false }
}

/* ---------- nav & UX ---------- */
function goToBrand(slug, category) {
  closeAll()
  if (!slug) return

  const path = slug.startsWith('/') ? slug : `/${slug}`
  const to = category
    ? { path, query: { categories: category } }
    : { path }

  router.push(to)
}
function onDocClick(e) {
  if (!containerRef.value) return
  if (!containerRef.value.contains(e.target)) closeAll()
}
function onEsc(e) { if (e.key === 'Escape') closeAll() }

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onEsc)
  // sticky shadow
  handleScroll = () => { scrolled.value = window.scrollY > 8 }
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()

  // expose height for the secondary sticky bar
  setMainNavHeightVar()
  ro = new ResizeObserver(setMainNavHeightVar)
  if (mainNavRef.value) ro.observe(mainNavRef.value)
  window.addEventListener('resize', setMainNavHeightVar)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onEsc)
  if (handleScroll) window.removeEventListener('scroll', handleScroll)
  ro?.disconnect()
  window.removeEventListener('resize', setMainNavHeightVar)
})

// Button style when opened
const btnClass = (isOpen) =>
  isOpen
    ? 'bg-orange-500 text-white hover:bg-orange-500 focus:bg-orange-500'
    : 'text-white'

// Link style & active state for plain links
const isActive = (path) => route.path.startsWith(path)
const linkClass = (path) =>
  isActive(path)
    ? 'bg-orange-500 text-white hover:bg-orange-500 focus:bg-orange-500'
    : 'text-white'
</script>

<style scoped>
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: opacity .15s ease, transform .15s ease;
}
.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0; transform: translateY(4px) scale(0.98);
}
[v-cloak] { display: none; }
</style>
