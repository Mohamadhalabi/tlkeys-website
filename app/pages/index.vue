<script setup lang="ts">
import ProSlider from '~/components/ProSlider.vue'
import CategoriesGrid from '~/components/home/CategoriesGrid.vue'
import ProductCarousel from '~/components/products/ProductCarousel.vue'
import { onMounted, ref, computed, watch } from 'vue'

type SliderItem = { image: string; link?: string; title?: string; alt?: string; type?: string }

const heightClasses = 'h-[180px] sm:h-[240px] md:h-[320px] lg:h-[420px] xl:h-[480px]'
const imgSizes = '(min-width: 1280px) 1280px, (min-width: 1024px) 1024px, 100vw'

const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp()
const { locale } = useI18n?.() as any || { locale: ref('en') }

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

if (process.client && typeof watch === 'function') watch(() => locale.value, () => refreshSliders?.())

/* ---------------- Categories (sample) ---------------- */
const categories = [
  { title: 'Car Remotes',     href: '/car-remotes',    image: '/images/home/categories/car-remotes.webp' },
  { title: 'Xhorse Remotes',  href: '/xhorse-remotes', image: '/images/home/categories/xhorse-remote.webp' },
  { title: 'Keydiy Remotes',  href: '/keydiy-remotes', image: '/images/home/categories/keydiy-kd-remote.webp' },
  { title: 'Remote PCB',      href: '/remote-pcb',     image: '/images/home/categories/pcb-remote.webp' },

  { title: 'Key Programming Devices', href: '/key-programming-diagnostics-tools', image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/devices-and-machines/devices%20and%20machine.jpg' },
  { title: 'Key Cutting Machines',    href: '/key-cutting-machine',               image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/devices-and-machines/key%20cutting%20machines.jpg' },
  { title: 'Cables',                   href: '/cables',                            image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/devices-and-machines/cables%202.jpg' },
  { title: 'Adapter',                  href: '/adapter',                           image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/devices-and-machines/adapers.jpg' },

  { title: 'Cutter',                   href: '/cutter',                            image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/accessories-tools/1698760907-Cutter.jpg' },
  { title: 'Emulators',                href: '/emulators',                         image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/devices-and-machines/emulators.jpg' },
  { title: 'Opening Tools',            href: '/opening-tools',                     image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/accessories-tools/opening%20tools.jpg' },
  { title: 'Immobilizer Smart Box',    href: '/immobilizer-smart-box',             image: 'https://dev-srv.tlkeys.com/storage/images/main-menu/accessories-tools/immobilizer-smart-box.jpg' },
]
const catRows = computed(() => Math.ceil((categories?.length || 0) / 5))

/* -------- helpers for product sections -------- */
function unwrapApi(res: any) {
  const body = (res && typeof res === 'object' && 'data' in res && !Array.isArray((res as any).data))
    ? (res as any).data
    : res

  const items = Array.isArray(body?.data) ? body.data
              : Array.isArray(body)       ? body
              : []

  const meta = (body && body.meta) ?? (res && (res as any).meta) ?? null

  if (process.client) {
    console.log('[UNWRAP]', {
      gotArray: Array.isArray(items), len: items.length,
      metaFrom: body?.meta ? 'body.meta' : ((res as any)?.meta ? 'res.meta' : 'none'),
      meta
    })
  }

  return { items, meta }
}

function mapApiProduct(p: any) {
  const hasSale = p?.sale_price != null && p?.sale_price !== 0
  const categoryName =
    Array.isArray(p?.categories) && p.categories[0]?.name
      ? String(p.categories[0].name)
      : ''
  const categorySlug =
    Array.isArray(p?.categories) && p.categories[0]?.slug
      ? String(p.categories[0].slug).toLowerCase()
      : ''

  return {
    id: p.id,
    name: p.title ?? p.short_title ?? '',
    image: p.image,
    price: hasSale ? p.sale_price : p.price,
    oldPrice: hasSale ? p.price : null,
    sku: p.sku ?? '',
    category: categoryName,
    categorySlug,
    slug: p.slug,
    href: p.slug ? `/products/${p.slug}` : `/products/${p.id}`,
  }
}

function lastFromMeta(meta: any) {
  const lp = Number(meta?.last_page)
  if (Number.isFinite(lp) && lp > 1) return lp
  const total = Number(meta?.total || 0)
  const size  = Math.max(1, Number(meta?.page_size || 1))
  const calc  = Math.ceil(total / size)
  return calc > 0 ? calc : 1
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

/* -------- FEATURED -------- */
const featured        = ref<any[]>([])
const featuredMeta    = ref<any | null>(null)
const featuredPage    = ref(1)
const featuredLastRef = ref(1)

async function fetchFeatured(page = 1, rows = 2, perRow = 6) {
  const res = await $customApi(`${API_BASE_URL}/homepage-products/featured`, {
    method: 'GET',
    params: { page, rows, per_row: perRow }
  })

  console.log("TEST");
  console.log(res);
  const { items, meta } = unwrapApi(res)
  featured.value         = items.map(mapApiProduct)
  featuredMeta.value     = meta
  featuredPage.value     = Number(meta?.current_page || page || 1)
  featuredLastRef.value  = lastFromMeta(meta)
  console.log('[FEATURED] page=', featuredPage.value, 'last=', featuredLastRef.value, 'meta=', meta)
}
const { el: featuredEl } = useLazySection(() => fetchFeatured(1))

/* -------- NEW ARRIVALS -------- */
const newArrivals = ref<any[]>([])
const newMeta     = ref<any | null>(null)
const newPage     = ref(1)
const newLastRef  = ref(1)

async function fetchNew(page = 1, rows = 1, perRow = 6) {
  const res = await $customApi(`${API_BASE_URL}/homepage-products/new-arrivals`, {
    method: 'GET',
    params: { page, rows, per_row: perRow, currency: 'USD' }
  })
  const { items, meta } = unwrapApi(res)
  newArrivals.value = items.map(mapApiProduct)
  newMeta.value     = meta
  newPage.value     = Number(meta?.current_page || page || 1)
  newLastRef.value  = lastFromMeta(meta)
  console.log('[NEW] page=', newPage.value, 'last=', newLastRef.value, 'meta=', meta)
}
const { el: newEl } = useLazySection(() => fetchNew(1))

/* -------- XHORSE REMOTES (category_id: 29) -------- */
const XHORSE_LEFT_IMAGE = '/images/home/sections/xhorse-remotes-left.webp'

const xhorse         = ref<any[]>([])
const xhorseMeta     = ref<any | null>(null)
const xhorsePage     = ref(1)
const xhorseLastRef  = ref(1)

/** Use perRow = 4 to match the lg layout (4 cards visible) */
async function fetchXhorse(page = 1, rows = 1, perRow = 4) {
  const res = await $customApi(`${API_BASE_URL}/homepage-products/featured`, {
    method: 'GET',
    params: {
      page,
      rows,
      per_row: perRow,     // 👈 controls page size
      category_id: 29,
      only_featured: 0, // 👈 include all in cat 29 (not only featured)
      currency: 'USD',
    }
  })
  const { items, meta } = unwrapApi(res)
  xhorse.value        = items.map(mapApiProduct)
  xhorseMeta.value    = meta
  xhorsePage.value    = Number(meta?.current_page || page || 1)
  xhorseLastRef.value = lastFromMeta(meta)
  console.log('[XHORSE] page=', xhorsePage.value, 'last=', xhorseLastRef.value, 'meta=', meta)
}
const { el: xhorseEl } = useLazySection(() => fetchXhorse(1, 1, 4))

/* expose debug */
if (process.client) (window as any).__home = {
  slidersRaw, itemsForSlider, slidersError,
  featuredMeta, newMeta, xhorseMeta,
  featuredPage, newPage, xhorsePage,
  featuredLastRef, newLastRef, xhorseLastRef
}
</script>

<template>
  <!-- Hero Slider -->
  <section class="mt-3">
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

  <!-- Categories -->
  <CategoriesGrid
    title="Browse Categories"
    :items="categories"
    :rows="catRows"
    :perRow="5"
    containerClass="max-w-screen-2xl"
  />

  <!-- Featured -->
  <section ref="featuredEl">
    <ProductCarousel
      v-if="featured.length"
      title="FEATURED PRODUCTS"
      :products="featured"
      :rowsBase="1" :rowsSm="1" :rowsMd="1" :rowsLg="2" :rowsXl="2"
      :perRowBase="2" :perRowSm="2" :perRowMd="3" :perRowLg="6" :perRowXl="6"
      :serverPaging="true"
      :currentPage="featuredPage"
      :lastPage="featuredLastRef"
      :show-arrows="true"
      :show-dots="featuredLastRef <= 12"
      @request-page="fetchFeatured"
    />
    <div v-else class="mx-auto max-w-screen-2xl px-3 sm:px-4 py-6 text-sm text-gray-500">
      Loading featured…
    </div>
  </section>

  <!-- New Arrivals -->
  <section ref="newEl">
    <ProductCarousel
      v-if="newArrivals.length"
      title="NEW ARRIVALS"
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
      @request-page="fetchNew"
    />
    <div v-else class="mx-auto max-w-screen-2xl px-3 sm:px-4 py-6 text-sm text-gray-500">
      Loading new arrivals…
    </div>
  </section>

  <!-- Xhorse Remotes (category_id: 29) -->
  <section ref="xhorseEl" class="mt-6">
    <div class="mx-auto max-w-screen-2xl px-3 sm:px-4">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <!-- Left image -->
        <div class="hidden lg:block lg:col-span-3 m-auto">
          <div class="hidden lg:flex lg:col-span-3 items-center justify-center">
            <NuxtImg
              v-if="XHORSE_LEFT_IMAGE"
              src="/images/home/banners/xhorse-remote-banner.png"
              alt="Xhorse Remotes"
              class="max-h-[600px] w-auto object-contain rounded-3xl"
              sizes="420px"
              format="webp"
              decoding="async"
              loading="lazy"
            />
          </div>
        </div>

        <!-- Carousel -->
        <div class="lg:col-span-9">
          <ProductCarousel
            v-if="xhorse.length"
            title="Xhorse remotes"
            :products="xhorse"
            :rowsBase="1" :rowsSm="1" :rowsMd="1" :rowsLg="1" :rowsXl="1"
            :perRowBase="2" :perRowSm="2" :perRowMd="4" :perRowLg="4" :perRowXl="6"
            :serverPaging="true"
            :currentPage="xhorsePage"
            :lastPage="xhorseLastRef"
            :show-arrows="true"
            :show-dots="xhorseLastRef <= 12"
            @request-page="(p) => fetchXhorse(p, 1, 4)"
          />
          <div v-else class="px-1 py-4 text-sm text-gray-500">
            Loading Xhorse remotes…
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* arrows are handled inside ProductCarousel */
</style>
