<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNuxtApp, useRuntimeConfig, useHead, useSeoMeta, useRoute } from '#imports'
import ProductGrid from '~/components/products/ProductGrid.vue' // Adjust path if needed

const { t, locale } = useI18n()
const { isAuthenticated, user } = useAuth() 
const route = useRoute()

const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp() as any

// --- 1. VIN LOOKUP LOGIC ---
const searchInput = ref('')
const loading = ref(false)
const partNumber = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

const isVinValid = computed(() => searchInput.value.trim().length === 17)
const hasNoTokens = computed(() => isAuthenticated.value && (user.value?.tokens || 0) <= 0)

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
    const res = await $customApi(`${API_BASE_URL}/vin-lookup`, {
      method: 'POST',
      body: { vin: searchInput.value }
    })

    const fetchedPartNumber = res?.part_details?.part_number 
                           || res?.data?.part_details?.part_number 
                           || res?.part_number 
                           || res?.data?.part_number

    if (fetchedPartNumber) {
      partNumber.value = fetchedPartNumber
      if (user.value && user.value.tokens > 0) {
        user.value.tokens -= 1 // Deduct locally for instant UI update
      }
    } else {
      errorMsg.value = t('vin_lookup.error_not_found')
    }
  } catch (err: any) {
    const status = err?.status || err?.statusCode || err?.response?.status;
    if (status === 402 || status === 403) {
      if (user.value) user.value.tokens = 0; 
      errorMsg.value = null; 
    } else {
      errorMsg.value = err?.data?.message || err?.message || t('vin_lookup.error_general')
    }
  } finally {
    loading.value = false
  }
}

// --- 2. TOKEN PRODUCTS FETCHING LOGIC ---
const items = ref<any[]>([])
const loadingItems = ref(false)
const gridKey = 'grid-tokens'

function unwrapApi(res: any) {
  const body = (res && typeof res === 'object' && 'data' in res && !Array.isArray((res as any).data)) ? (res as any).data : res
  const itemsArray = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : []
  return { items: itemsArray }
}

function mapApiProduct(p: any) {
  const hasSale = p?.sale_price != null && p?.sale_price !== 0
  const categoryName = Array.isArray(p?.categories) && p.categories[0]?.name ? String(p.categories[0].name) : ''
  const categorySlug = Array.isArray(p?.categories) && p.categories[0]?.slug ? String(p.categories[0].slug).toLowerCase() : ''
  return {
    id: p.id,
    name: p.title ?? p.short_title ?? '',
    image: p.image,
    price: hasSale ? p.sale_price : p.price,
    oldPrice: hasSale ? p.price : null,
    stock: Number.isFinite(Number(p?.quantity ?? p?.stock ?? p?.available_quantity)) ? Number(p?.quantity ?? p?.stock ?? p?.available_quantity) : null,
    sku: p.sku ?? '',
    category: categoryName,
    categorySlug,
    slug: p.slug,
    href: p.slug ? `/products/${p.slug}` : `/products/${p.id}`,
  }
}

function useLazySection(cb: () => void) {
  const el = ref<HTMLElement | null>(null)
  onMounted(() => {
    if (!el.value) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { cb(); io.disconnect() }
    }, { rootMargin: '200px' })
    io.observe(el.value)
  })
  return { el }
}

async function fetchTokens() {
  try {
    loadingItems.value = true
    const res = await $customApi(`${API_BASE_URL}/homepage-products/featured`, {
      method: 'GET',
      params: {
        page: 1,
        rows: 1,
        per_row: 12,
        category_id: 6686, // Make sure this matches your Token Category ID
        only_featured: 0, 
        currency: 'USD',
      }
    })
    const { items: list } = unwrapApi(res)
    items.value = list.map(mapApiProduct)
  } catch (err) {
    console.error('[TOKENS] fetch error:', err)
    items.value = []
  } finally {
    loadingItems.value = false
  }
}

const { el: tokenGridEl } = useLazySection(() => fetchTokens())

// --- 3. SEO & SCHEMA ---
const siteName = 'Techno Lock Keys'
const baseUrl  = 'https://www.tlkeys.com'
const canonical = `${baseUrl}${route.path}`
const ogImage = `${baseUrl}/images/og-image.jpg`
const logoUrl = `${baseUrl}/images/logo/techno-lock-desktop-logo.webp`

useSeoMeta({
  title: t('vin_lookup.seo_title'),
  description: t('vin_lookup.seo_description'),
  ogType: 'website',
  ogSiteName: siteName,
  ogTitle: t('vin_lookup.seo_title'),
  ogDescription: t('vin_lookup.seo_description'),
  ogUrl: canonical,
  ogImage,
  twitterCard: 'summary_large_image'
})

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: `${baseUrl}/`,
  image: logoUrl,
  description: t('vin_lookup.seo_description'),
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Industrial No. 5, behind Maliha Road., shop No. 8',
    addressLocality: 'Sharjah',
    addressCountry: 'AE'
  },
  telephone: '+971504429045'
}

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: t('vin_lookup.seo_title'),
  url: canonical,
  description: t('vin_lookup.seo_description'),
  inLanguage: locale.value,
  isPartOf: { '@type': 'WebSite', name: siteName, url: baseUrl }
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: t('products.home') || 'Home', item: `${baseUrl}/` },
    { '@type': 'ListItem', position: 2, name: t('vin_lookup.title'), item: canonical }
  ]
}

useHead({
  htmlAttrs: { lang: locale.value },
  link: [{ rel: 'canonical', href: canonical }],
  meta: [{ 'http-equiv': 'content-language', content: locale.value }],
  script: [
    { key: 'org-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(orgJsonLd) },
    { key: 'webpage-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(webPageJsonLd) },
    { key: 'breadcrumb-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbJsonLd) }
  ]
})
</script>

<template>
  <main class="vin-lookup-page pb-16 sm:pb-24 bg-gray-50/50 min-h-screen">
    
    <div class="container mx-auto px-4 pt-10 sm:pt-16 max-w-4xl">
      <div class="relative bg-white border border-gray-100 shadow-2xl shadow-blue-900/5 rounded-[2rem] p-6 sm:p-10 lg:p-14 text-center overflow-hidden">
        
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent opacity-60 pointer-events-none"></div>

        <div class="relative z-10 mb-8 sm:mb-10">
          <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {{ t('vin_lookup.title') }}
          </h1>
          <p class="text-xs sm:text-sm font-bold text-blue-600 mt-3 uppercase tracking-[0.2em]">
            {{ t('vin_lookup.subtitle') }}
          </p>
          
          <div v-if="isAuthenticated" 
               class="inline-flex items-center justify-center mt-6 px-5 py-2 rounded-full border shadow-sm"
               :class="hasNoTokens ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-700'">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="font-bold text-sm sm:text-base">{{ t('vin_lookup.available_tokens') }}: {{ user?.tokens || 0 }}</span>
          </div>
        </div>

        <div class="relative z-10 max-w-2xl mx-auto space-y-6">
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <svg class="h-6 w-6 text-gray-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              v-model="searchInput"
              @input="handleInput"
              type="text" 
              maxlength="17"
              :placeholder="t('vin_lookup.placeholder')" 
              class="w-full pl-14 pr-6 py-4 sm:py-5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-center text-base sm:text-lg font-bold uppercase tracking-widest placeholder-gray-400 shadow-inner"
              :disabled="loading" 
              @keyup.enter="handleSearch"
            />
          </div>

          <div class="w-full">
            <template v-if="!isAuthenticated">
              <NuxtLinkLocale to="/auth/login-register" class="w-full flex justify-center items-center bg-gray-900 text-white py-4 sm:py-5 rounded-2xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-base sm:text-lg">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                {{ t('vin_lookup.login_btn') }}
              </NuxtLinkLocale>
            </template>
            
            <template v-else-if="hasNoTokens">
              <div class="w-full py-4 sm:py-5 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-200 shadow-sm text-sm sm:text-base">
                {{ t('vin_lookup.no_tokens_msg') }}
              </div>
            </template>

            <template v-else>
              <button 
                @click="handleSearch"
                :disabled="loading || !isVinValid"
                class="w-full flex justify-center items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 sm:py-5 rounded-2xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-blue-500/30 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed text-base sm:text-lg transform active:scale-[0.98]"
              >
                <span v-if="loading" class="flex items-center gap-2">
                  <svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ t('vin_lookup.searching') }}
                </span>
                <span v-else-if="!isVinValid">{{ t('vin_lookup.enter_17') }}</span>
                <span v-else>{{ t('vin_lookup.search_btn') }}</span>
              </button>
            </template>
          </div>
        </div>

        <transition name="fade">
          <div v-if="partNumber || errorMsg" class="max-w-xl mx-auto mt-8 sm:mt-10">
            
            <div v-if="partNumber" class="relative bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 rounded-2xl p-6 sm:p-8 text-center shadow-md overflow-hidden">
              <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              
              <span class="inline-block px-4 py-1.5 bg-blue-100 text-blue-800 text-xs sm:text-sm font-bold rounded-full uppercase tracking-widest mb-4 shadow-sm">
                {{ t('vin_lookup.match_found') }}
              </span>
              <div class="text-xs sm:text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">{{ t('vin_lookup.oem_part') }}</div>
              <div class="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">{{ partNumber }}</div>
            </div>

            <div v-if="errorMsg" class="bg-red-50 border border-red-200 rounded-2xl p-5 sm:p-6 text-center shadow-sm">
              <div class="flex items-center justify-center gap-2 text-red-600 font-bold text-sm sm:text-base">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {{ errorMsg }}
              </div>
            </div>
            
          </div>
        </transition>

      </div>
    </div>

    <section ref="tokenGridEl" class="container mx-auto max-w-7xl px-4 mt-16 sm:mt-6">
      
      <div class="text-center mb-8 sm:mb-12">
        <h3 class="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">{{ t('vin_lookup.purchase_title') }}</h3>
        <p class="text-base sm:text-lg text-gray-500 mt-3 max-w-2xl mx-auto">
          {{ t('vin_lookup.purchase_desc') }}
        </p>
      </div>

      <div class="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-4 sm:p-8">
        <ProductGrid
          :key="gridKey"
          title=""
          :products="items"
          :rows="1"
          :products-per-row="12"
          :show-rewards="false"
          :show-add="true"
          :show-qty="true"
          container-class="max-w-full"
        />
        
        <div v-if="loadingItems" class="px-3 py-10 text-center text-gray-400 font-medium animate-pulse">
          {{ t('vin_lookup.loading_packages') }}
        </div>
      </div>
      
    </section>

  </main>
</template>

<style scoped>
input { text-transform: uppercase; }

.fade-enter-active, .fade-leave-active { 
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
}
.fade-enter-from, .fade-leave-to { 
  opacity: 0; 
  transform: translateY(-10px) scale(0.98); 
}
</style>