<script setup lang="ts">
import ProSlider from '~/components/ProSlider.vue'
import CategoriesGrid from '~/components/home/CategoriesGrid.vue'
import ProductCarousel from '~/components/products/ProductCarousel.vue'
import BrandSection from '~/components/home/BrandSection.vue'
import { ref, computed, watch } from 'vue'
import { useSeoMeta, useHead, useRoute, useRequestURL, useRuntimeConfig, useNuxtApp, useAsyncData } from '#imports'
import { useI18n } from 'vue-i18n'

type SliderItem = { image: string; link?: string; title?: string; alt?: string; type?: string }

const heightClasses = 'h-[180px] sm:h-[240px] md:h-[320px] lg:h-[420px] xl:h-[480px]'
const imgSizes = '(min-width: 1280px) 1280px, (min-width: 1024px) 1024px, 100vw'

const { public: { API_BASE_URL, siteName: cfgSiteName, siteUrl: cfgSiteUrl, defaultOgImage } } = useRuntimeConfig()
const { $customApi } = useNuxtApp()

// i18n
const i18n = (useI18n?.() as any) || null
const t = i18n?.t ?? ((s: string) => s)
const locale = i18n?.locale ?? ref('en')
const defaultLocale: string = i18n?.defaultLocale ?? 'en'

/* ---------------- Slider ---------------- */
const sanitize = (arr: any[]): SliderItem[] =>
  (arr || []).map((x: any) => ({
    image: String(x.image || x.image_url || x.src || ''),
    link: x.link ? String(x.link) : undefined,
    title: x.title ? String(x.title) : undefined,
    alt: x.alt ? String(x.alt) : undefined,
    type: x.type ? String(x.type) : undefined,
  })).filter(x => !!x.image)

const { data: slidersRaw, error: slidersErrObj, refresh: refreshSliders } = await useAsyncData<unknown>(
  () => `home:sliders:${locale.value}`,
  async () => {
    const res = await $customApi(`${API_BASE_URL}/sliders`, { method: 'GET' })
    const list = (res?.data ?? res)?.data ?? (res?.data ?? res)?.result ?? []
    return Array.isArray(list) ? list : []
  },
  { server: true, default: () => [], staleTime: 60_000, dedupe: 'defer' }
)

const itemsForSlider = computed<SliderItem[]>(() =>
  sanitize(Array.isArray(slidersRaw.value) ? (slidersRaw.value as any[]) : [])
)
const slidersError = computed(() =>
  (slidersErrObj.value as any)?.data?.message || (slidersErrObj.value as any)?.message || ''
)

/* ---------------- Categories ---------------- */
const categories = [
  { title: t('home.categories.carRemotes') || 'Car Remotes',      href: '/car-remotes',    image: '/images/home/categories/car-remotes.webp' },
  { title: t('home.categories.xhorseRemotes') || 'Xhorse Remotes',  href: '/xhorse-remotes', image: '/images/home/categories/xhorse-remote.webp' },
  { title: t('home.categories.keydiyRemotes') || 'Keydiy Remotes',  href: '/keydiy-remotes', image: '/images/home/categories/keydiy-kd-remote.webp' },
  { title: t('home.categories.remotePcb') || 'Remote PCB',      href: '/remote-pcb',     image: '/images/home/categories/pcb-remote.webp' },

  { title: t('home.categories.keyProgrammingDevices') || 'Key Programming Devices', href: '/key-programming-diagnostics-tools', image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/devices-and-machines/devices%20and%20machine.jpg' },
  { title: t('home.categories.keyCuttingMachines') || 'Key Cutting Machines',    href: '/key-cutting-machine',                image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/devices-and-machines/key%20cutting%20machines.jpg' },
  { title: t('home.categories.cables') || 'Cables',                    href: '/cables',                             image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/devices-and-machines/cables%202.jpg' },
  { title: t('home.categories.adapter') || 'Adapter',                  href: '/adapter',                            image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/devices-and-machines/adapers.jpg' },

  { title: t('home.categories.cutter') || 'Cutter',                    href: '/cutter',                             image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/accessories-tools/1698760907-Cutter.jpg' },
  { title: t('home.categories.emulators') || 'Emulators',                href: '/emulators',                          image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/devices-and-machines/emulators.jpg' },
  { title: t('home.categories.openingTools') || 'Opening Tools',            href: '/opening-tools',                      image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/accessories-tools/opening%20tools.jpg' },
  { title: t('home.categories.immobilizerSmartBox') || 'Immobilizer Smart Box',    href: '/immobilizer-smart-box',              image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/accessories-tools/immobilizer-smart-box.jpg' },
]
const catRows = computed(() => Math.ceil((categories?.length || 0) / 5))

/* ---------------- LIMIT LOGIC & API HELPERS ---------------- */
const MAX_PER_SECTION = 48

function pageSizeFrom(meta: any, fallbackRows: number, fallbackPerRow: number, itemsLen: number) {
  const byMeta = Number(meta?.per_page ?? meta?.page_size)
  if (Number.isFinite(byMeta) && byMeta > 0) return byMeta
  const byProps = Math.max(1, (fallbackRows || 1) * (fallbackPerRow || 1))
  return Math.max(1, byMeta || byProps || itemsLen || 1)
}
function lastFromMeta(meta: any) {
  const lp = Number(meta?.last_page)
  if (Number.isFinite(lp) && lp > 1) return lp
  const total = Number(meta?.total || 0)
  const size  = Math.max(1, Number(meta?.page_size || meta?.per_page || 1))
  const calc  = Math.ceil(total / size)
  return calc > 0 ? calc : 1
}
function cappedLastPage(meta: any, rows: number, perRow: number, itemsLen: number) {
  const size = pageSizeFrom(meta, rows, perRow, itemsLen)
  const serverLast = lastFromMeta(meta)
  const capLast = Math.ceil(MAX_PER_SECTION / size)
  return Math.max(1, Math.min(serverLast, capLast))
}

function unwrapApi(res: any) {
  const body = (res && typeof res === 'object' && 'data' in res && !Array.isArray((res as any).data))
    ? (res as any).data
    : res
  const items = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : [])
  const meta = (body && body.meta) ?? (res && (res as any).meta) ?? null
  return { items, meta }
}

function mapApiProduct(p: any) {
  const hasSale = p?.sale_price != null && p?.sale_price !== 0

  const d = p?.discount || {}
  const typeRaw = d?.type
  const valueNum =
    typeof d?.value === 'number' ? d.value
    : d?.value != null ? Number(d.value)
    : null
  const start = d?.start_date ?? null
  const end   = d?.end_date ?? null
  const active = !!d?.active && (typeRaw === 'fixed' || typeRaw === 'percent') && valueNum != null

  const tablePrice: any[] =
    Array.isArray(p?.table_price) ? p.table_price
    : Array.isArray(p?.table_price?.data) ? p.table_price.data
    : []

  const isFree =
    p?.is_free_shipping === 1 ||
    p?.is_free_shipping === '1' ||
    p?.is_free_shipping === true

  const cats = Array.isArray(p?.categories) ? p.categories : []
  const catIds = cats.map((c:any) => Number(c?.id)).filter((n:number) => Number.isFinite(n))
  const requiresSerial = catIds.includes(47) || catIds.includes(48)
  const hidePrice = Number(p?.hide_price ?? 0) === 1

  const categoryName = cats[0]?.name ? String(cats[0].name) : ''
  const categorySlug = cats[0]?.slug ? String(cats[0].slug).toLowerCase() : ''

  return {
    id: p.id,
    name: p.title ?? p.short_title ?? '',
    image: p.image,
    part_number: p.part_number ?? null, // <-- ADD THIS LINE
    stock: Number.isFinite(Number(p?.quantity ?? p?.stock ?? p?.available_quantity))
      ? Number(p?.quantity ?? p?.stock ?? p?.available_quantity)
      : null,
    price: hasSale ? p.sale_price : p.price,
    oldPrice: hasSale ? p.price : null,

    regular_price: p.regular_price ?? p.price ?? null,
    sale_price: p.sale_price ?? null,
    table_price: tablePrice,
    discount_type: active ? (typeRaw as 'fixed'|'percent') : null,
    discount_value: active ? valueNum : null,
    discount_start_date: start,
    discount_end_date:   end,
    display_euro_price: Number(p?.display_euro_price ?? 0) === 1,
    euro_price: p?.euro_price ?? null,

    sku: p.sku ?? '',
    category: categoryName,
    categorySlug,
    slug: p.slug,
    href: p.slug ? `/products/${p.slug}` : `/products/${p.id}`,
    freeShipping: isFree,
    badgeText: isFree ? 'FREE SHIPPING' : null,

    hide_price: hidePrice,
    requires_serial: requiresSerial,
  }
}

/* -------- FEATURED (SSR) -------- */
const fetchFeaturedApi = async (page = 1, rows = 2, perRow = 6) => {
  const res = await $customApi(`${API_BASE_URL}/homepage-products/featured`, {
    method: 'GET',
    params: { page, rows, per_row: perRow, include: 'table_price,categories', currency: 'USD' }
  })
  const { items, meta } = unwrapApi(res)
  const capLast = cappedLastPage(meta, rows, perRow, items.length)
  return { 
    items: items.map(mapApiProduct), 
    meta, 
    page: Number(meta?.current_page || page || 1), 
    lastPage: capLast 
  }
}

// Fetch on server side
const { data: featuredData, refresh: refreshFeatured } = await useAsyncData(
  () => `home:featured:${locale.value}`,
  () => fetchFeaturedApi(1, 2, 6),
  { server: true, default: () => ({ items: [], meta: null, page: 1, lastPage: 1 }) }
)

const featured        = ref<any[]>(featuredData.value.items)
const featuredPage    = ref(featuredData.value.page)
const featuredLastRef = ref(featuredData.value.lastPage)

// Client-side paginator function
async function fetchFeaturedClient(page = 1, rows = 2, perRow = 6) {
  const data = await fetchFeaturedApi(page, rows, perRow)
  featured.value = data.items
  featuredPage.value = data.page
  featuredLastRef.value = data.lastPage
}

/* -------- NEW ARRIVALS (SSR) -------- */
const fetchNewApi = async (page = 1, rows = 1, perRow = 6) => {
  const res = await $customApi(`${API_BASE_URL}/homepage-products/new-arrivals`, {
    method: 'GET',
    params: { page, rows, per_row: perRow, include: 'table_price,categories', currency: 'USD' }
  })
  const { items, meta } = unwrapApi(res)
  const capLast = cappedLastPage(meta, rows, perRow, items.length)
  return { 
    items: items.map(mapApiProduct), 
    meta, 
    page: Number(meta?.current_page || page || 1), 
    lastPage: capLast 
  }
}

// Fetch on server side
const { data: newArrivalsData, refresh: refreshNew } = await useAsyncData(
  () => `home:new-arrivals:${locale.value}`,
  () => fetchNewApi(1, 1, 6),
  { server: true, default: () => ({ items: [], meta: null, page: 1, lastPage: 1 }) }
)

const newArrivals = ref<any[]>(newArrivalsData.value.items)
const newPage     = ref(newArrivalsData.value.page)
const newLastRef  = ref(newArrivalsData.value.lastPage)

// Client-side paginator function
async function fetchNewClient(page = 1, rows = 1, perRow = 6) {
  const data = await fetchNewApi(page, rows, perRow)
  newArrivals.value = data.items
  newPage.value = data.page
  newLastRef.value = data.lastPage
}

// Watchers for i18n changes
if (process.client && typeof watch === 'function') {
  watch(() => locale.value, async () => {
    refreshSliders?.()
    
    // Refresh SSR data sources and update refs when locale changes
    await Promise.all([refreshFeatured(), refreshNew()])
    featured.value = featuredData.value.items
    featuredPage.value = featuredData.value.page
    featuredLastRef.value = featuredData.value.lastPage

    newArrivals.value = newArrivalsData.value.items
    newPage.value = newArrivalsData.value.page
    newLastRef.value = newArrivalsData.value.lastPage
  })
}

/* ================= SEO ================= */
const route = useRoute()
const url = useRequestURL()
const siteName = computed(() => t('site.name') || cfgSiteName || 'TL Keys')
const siteUrl  = computed(() => cfgSiteUrl || `${url.origin}`)
const pathOnly  = computed(() => route.fullPath.split('#')[0].split('?')[0] || '/')
const canonical = computed(() => `${siteUrl.value}${pathOnly.value}`)
const toAbs = (src?: string) => {
  if (!src) return `${siteUrl.value}${defaultOgImage || '/images/og-image.jpg'}`
  return src.startsWith('http') ? src : `${siteUrl.value}${src.startsWith('/') ? src : `/${src}`}`
}
const ogImage = computed(() => toAbs(itemsForSlider.value?.[0]?.image))
const metaTitle   = computed(() => t('home.meta.title') || `${siteName.value} — ${t('home.meta.suffix') || 'Auto Keys & Remotes'}`)
const metaDesc    = computed(() => t('home.meta.description') || 'Shop car remotes, Xhorse, vvdi, autel, KEYDIY key programmers, cutters, cables, and more.')
const metaKeywords= computed(() => t('home.meta.keywords') || 'car remotes, xhorse, keydiy, key programming, key cutting, locksmith tools')

useSeoMeta({
  title: metaTitle,
  description: metaDesc,
  ogTitle: metaTitle,
  ogDescription: metaDesc,
  ogType: 'website',
  ogUrl: canonical,
  ogImage: ogImage,
  twitterCard: 'summary_large_image',
  twitterTitle: metaTitle,
  twitterDescription: metaDesc,
  twitterImage: ogImage,
  robots: 'index,follow',
  themeColor: '#000000',
  keywords: metaKeywords,
})

const websiteLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName.value,
  url: siteUrl.value,
  inLanguage: locale.value,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${siteUrl.value}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string'
  }
}))
const orgLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName.value,
  url: siteUrl.value,
  logo: toAbs('/images/logo/techno-lock-desktop-logo.webp')
}))
const webPageLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: metaTitle.value,
  url: canonical.value,
  description: metaDesc.value,
  inLanguage: locale.value,
  isPartOf: { '@type': 'WebSite', url: siteUrl.value, name: siteName.value },
  primaryImageOfPage: { '@type': 'ImageObject', url: ogImage.value }
}))

useHead({
  link: [
    { rel: 'canonical', href: canonical.value },
  ],
  script: [
    { key: 'ld-website',  type: 'application/ld+json', innerHTML: JSON.stringify(websiteLd.value) },
    { key: 'ld-org',      type: 'application/ld+json', innerHTML: JSON.stringify(orgLd.value) },
    { key: 'ld-webpage',  type: 'application/ld+json', innerHTML: JSON.stringify(webPageLd.value) },
  ]
})
</script>

<template>
  <section class="mt-3 hidden lg:block">
    <div class="relative left-1/2 right-1/2 -mx-[50vw] w-screen px-2 sm:px-3 md:px-4">
      <ProSlider
        v-if="itemsForSlider.length"
        :items="itemsForSlider"
        effect="slide"
        :rounded="true"
        :autoplay="true"
        :loop="true"
        :show-arrows="true"
        :show-dots="true"
        :show-progress="true"
        :img-sizes="imgSizes"
        :height="heightClasses"
        class="w-full"
      />
      <div v-else :class="heightClasses" class="w-full animate-pulse bg-gray-200 dark:bg-gray-800 rounded-2xl" />
    </div>
  </section>


  <div
    v-if="slidersError"
    class="mx-auto max-w-screen-2xl mt-4 rounded-md border border-red-300/60 bg-red-50 text-red-700 px-4 py-2 text-sm"
  >
    {{ slidersError }}
  </div>

  <h1 class="text-center font-bold text-base text-xs text-transparent">
    Techno Lock Keys Trading – Car Keys, Remotes, Emergency Keys, Key Cutting & Programming Machines
  </h1>

  <CategoriesGrid
    :title="t('home.browseCategories') || 'Browse Categories'"
    :items="categories"
    :rows="catRows"
    :perRow="5"
    containerClass="max-w-screen-2xl"
  />

  <section data-nosnippet>
    <ProductCarousel
      v-if="featured.length"
      :title="t('home.featuredProducts') || 'FEATURED PRODUCTS'"
      :products="featured"
      :rowsBase="1" :rowsSm="1" :rowsMd="2" :rowsLg="2" :rowsXl="2"
      :perRowBase="2" :perRowSm="2" :perRowMd="6" :perRowLg="5" :perRowXl="6"
      :serverPaging="true"
      :currentPage="featuredPage"
      :lastPage="featuredLastRef"
      :show-arrows="true"
      :show-dots="featuredLastRef <= 12"
      @request-page="fetchFeaturedClient"
    />
  </section>

  <section data-nosnippet>
    <ProductCarousel
      v-if="newArrivals.length"
      :title="t('home.newArrivals') || 'NEW ARRIVALS'"
      :products="newArrivals"
      :rowsBase="1" :rowsSm="1" :rowsMd="1" :rowsLg="1" :rowsXl="1"
      :perRowBase="2" :perRowSm="2" :perRowMd="3" :perRowLg="4" :perRowXl="6"
      :serverPaging="true"
      :currentPage="newPage"
      :lastPage="newLastRef"
      backgroundGradient="linear-gradient(90deg,#A30000 0%, #D72626 50%, #A30000 100%)"
      overlayClass="bg-black/10"
      :show-arrows="true"
      :show-dots="newLastRef <= 12"
      @request-page="fetchNewClient"
    />
  </section>


  <BrandSection
    data-nosnippet
    :title="t('home.xhorseRemotes') || 'Xhorse remotes'"
    :category-id="29"
    left-image="/images/home/banners/xhorse-remotes.webp"
    :left-image-alt="t('home.xhorseRemotesAlt') || 'Xhorse Remotes'"
    left-image-to="/xhorse-remotes"
    view-all-to="/xhorse-remotes"
    :per-row="4"
  />
  <BrandSection
    data-nosnippet
    :title="t('home.lonsdorRemotes') || 'Lonsdor remotes'"
    :category-id="30"
    left-image="/images/home/banners/lonsdor-remotes.webp"
    :left-image-alt="t('home.lonsdorRemotesAlt') || 'Lonsdor Remotes'"
    left-image-to="/lonsdor-remotes"
    view-all-to="/lonsdor-remotes"
    :per-row="4"
  />
  <BrandSection
    data-nosnippet
    :title="t('home.keydiyRemotes') || 'Keydiy remotes'"
    :category-id="33"
    left-image="/images/home/banners/keydiy-remotes.webp"
    :left-image-alt="t('home.keydiyRemotesAlt') || 'Keydiy Remotes'"
    left-image-to="/keydiy-remotes"
    view-all-to="/keydiy-remotes"
    :per-row="4"
  />
</template>