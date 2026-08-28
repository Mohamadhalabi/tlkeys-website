<template>
  <main class="pin-code-page">
    <nav aria-label="breadcrumb" class="border-b bg-gray-50">
      <div class="container mx-auto max-w-7xl px-4">
        <ol class="flex items-center gap-2 py-3 text-sm text-gray-600">
          <li>
            <NuxtLinkLocale :to="localePath('/')" class="hover:text-gray-900 underline-offset-2 hover:underline">
              {{ t('products.home') }}
            </NuxtLinkLocale>
          </li>
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium">
            {{ t('pincode.pincode') }}
          </li>
        </ol>
      </div>
    </nav>

    <div class="container mx-auto max-w-7xl px-4 mt-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- OFFLINE — second on mobile, first from lg up -->
        <section class="order-2 lg:order-1 lg:col-span-5 xl:col-span-4">
          <h3 class="text-center text-xl md:text-2xl font-extrabold tracking-tight text-gray-900">
            {{ t('pincode.pincodeoffline') }}
          </h3>

          <div class="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3">
            <article
              v-for="(brand, index) in offlinePinCode"
              :key="index"
              class="group rounded-lg bg-white shadow-sm ring-1 ring-gray-200 p-3 flex flex-col transition hover:shadow-md"
            >
              <NuxtLinkLocale
                :to="`/products/${brand.slug}`"
                class="flex flex-col h-full text-current no-underline"
              >
                <NuxtImg
                  :src="brand?.image?.l?.url"
                  :alt="brand?.short_title || brand?.sku || 'Pin code item'"
                  width="200"
                  height="200"
                  class="mx-auto rounded-md object-contain aspect-square bg-gray-50"
                />
                <p class="mt-2 text-center text-xs text-gray-500">
                  {{ brand?.sku }}
                </p>
                <p class="mt-1 text-center text-sm font-semibold text-gray-900">
                  {{ brand?.short_title }}
                </p>

                <b v-if="Number(brand?.price?.value) > 0" class="mt-auto text-center block text-base text-orange-700">
                  {{ brand?.price?.value }} {{ brand?.price?.currency }}
                </b>
              </NuxtLinkLocale>
            </article>
          </div>
        </section>

        <!-- ONLINE — first on mobile, second from lg up -->
        <section class="order-1 lg:order-2 lg:col-span-7 xl:col-span-8">
          <h3 class="text-center text-xl md:text-2xl font-extrabold tracking-tight text-gray-900">
            {{ t('pincode.pincodeonline') }}
          </h3>

          <div class="mt-4">
            <PinCodeCalculator
              ref="calc"
              endpoint="/pin-code/calculate"
              :price-pre="15"
              :price-post="55"
              @pay="onPay"
              @success="onPinSuccess"
            />
          </div>

          <!-- products grid for category_id = 6688 -->
          <div ref="calcGridEl" class="mt-8">
            <ProductGrid
              :key="gridKeyCalc"
              :title="t('labels.products')"
              :products="calcItems"
              :rows="rowsForCalcGrid"
              :products-per-row="CALC_PRODUCTS_PER_ROW"
              :show-rewards="true"
              :show-add="true"
              :show-qty="true"
              container-class="max-w-screen-2xl"
            />
            <div v-if="loadingCalcItems" class="px-3 py-4 text-sm text-gray-500">
              {{ t('common.loading') }}
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- <section ref="pinGridEl" class="container mx-auto max-w-7xl px-4 mt-10">
      <ProductGrid
        :key="gridKey"
        :title="t('labels.products')"
        :products="items"
        :rows="rowsForGrid"
        :products-per-row="PRODUCTS_PER_ROW"
        :show-rewards="true"
        :show-add="true"
        :show-qty="true"
        container-class="max-w-screen-2xl"
      />
      <div v-if="loadingItems" class="px-3 py-4 text-sm text-gray-500">{{ t('common.loading') }}</div>
    </section> -->
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ProductGrid from '~/components/products/ProductGrid.vue'
import { NuxtImg } from '#components'
import PinCodeCalculator from '~/components/pincode/PincodeForm.vue'

/* i18n / routing */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

/* API */
const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp() as any

/* ---------- optional slug resolution (kept for consistency) ---------- */
const slugParam = (route.params.slug as string) || 'pin-code'
const { data: slugData, error } = await useAsyncData(
  () => `slug:${slugParam}`,
  async () => await $customApi(`/slug/${slugParam}`, { method: 'GET' }),
  { server: true, default: () => null, dedupe: 'defer' }
)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
const resolved = computed<any>(() => slugData.value?.data ?? slugData.value ?? null)

/* ---------- OFFLINE pin-code list ---------- */
const { data: offlineRes } = await useAsyncData(
  'offlinePinCode',
  async () => await $customApi(`/pin-code/offline-pincode`, { method: 'GET' }),
  { server: true, default: () => ({ data: [] }), dedupe: 'defer' }
)
const offlinePinCode = computed<any[]>(() => offlineRes.value?.data?.data ?? offlineRes.value?.data ?? [])

/* ---------------- PIN calculator wiring ---------------- */
const calc = ref<any>(null)

function onPay(order: any) {
  console.log('[PIN CODE] checkout started', order)
}

function onPinSuccess(payload: any) {
  console.log('[PIN CODE] result', payload)
}

/* After a PayPal / card redirect returns, run the calculation automatically. */
onMounted(() => {
  if (route.query.paid === '1' && route.query.vin) {
    calc.value?.setVin(String(route.query.vin))
    calc.value?.calculate()
  }
})

/* ---------------- helpers ---------------- */
function unwrapApi(res: any) {
  const body = (res && typeof res === 'object' && 'data' in res && !Array.isArray((res as any).data))
    ? (res as any).data
    : res
  const items = Array.isArray(body?.data) ? body.data
              : Array.isArray(body)       ? body
              : []
  const meta = (body && body.meta) ?? (res && (res as any).meta) ?? null
  return { items, meta }
}

/* Image can arrive as a plain string OR as { l: { url }, m: {...}, s: {...} } */
function pickImage(img: any): string {
  if (!img) return ''
  if (typeof img === 'string') return img
  return img?.l?.url ?? img?.m?.url ?? img?.s?.url ?? img?.url ?? ''
}

function pickGallery(p: any): string[] {
  const raw = p?.gallery ?? p?.images ?? []
  if (!Array.isArray(raw)) return []
  return raw.map(pickImage).filter(Boolean)
}

/* Base price vs final price, under whatever key ProductResource uses. */
function readPrices(p: any) {
  const base  = p.regular_price ?? p.price ?? p.original_price ?? null
  const final = p.sale_price ?? p.final_price ?? p.price_after_discount ?? p.discounted_price ?? null

  return {
    // BASE price — never the discounted value, or the card discounts it twice.
    price: base,
    regular_price: base,
    sale_price: (final != null && Number(final) !== Number(base)) ? final : null,
    table_price: Array.isArray(p?.table_price) ? p.table_price
               : Array.isArray(p?.packages)    ? p.packages
               : null,
  }
}

/* Discount metadata, flat or nested. Note the API column is `end_date_discount`. */
function readDiscount(p: any) {
  const d = p?.discount ?? p?.active_discount ?? p?.promotion ?? null

  const type  = p.discount_type  ?? d?.type  ?? d?.discount_type  ?? null
  const value = p.discount_value ?? d?.value ?? d?.discount_value ?? d?.amount ?? null
  const start = p.discount_start_date ?? p.start_date_discount ?? d?.start_date ?? d?.starts_at ?? null
  const end   = p.discount_end_date   ?? p.end_date_discount   ?? d?.end_date   ?? d?.ends_at   ?? null

  return {
    discount_type: (type === 'percent' || type === 'fixed') ? type : null,
    discount_value: value ?? null,
    discount_start_date: start ?? null,
    discount_end_date: end ?? null,
  }
}

function mapApiProduct(p: any) {
  const cat = Array.isArray(p?.categories) ? p.categories[0] : null

  return {
    id: p.id,
    name: p.title ?? p.short_title ?? p.name ?? '',

    image: pickImage(p?.image),
    gallery: pickGallery(p),

    ...readPrices(p),
    ...readDiscount(p),

    display_euro_price: !!p.display_euro_price,
    euro_price: p.euro_price ?? 0,

    hide_price: !!p.hide_price,
    requires_serial: !!p.requires_serial,
    part_number: p.part_number ?? p.mpn ?? null,

    stock: Number.isFinite(Number(p?.quantity ?? p?.stock ?? p?.available_quantity))
      ? Number(p?.quantity ?? p?.stock ?? p?.available_quantity)
      : null,
    sku: p.sku ?? '',
    category: cat?.name ? String(cat.name) : '',
    categorySlug: cat?.slug ? String(cat.slug).toLowerCase() : '',
    slug: p.slug,
    href: p.slug ? `/products/${p.slug}` : `/products/${p.id}`,
  }
}

function lastFromMeta(meta: any) {
  const lp = Number(meta?.last_page)
  if (Number.isFinite(lp) && lp > 1) return lp
  const total = Number(meta?.total || 0)
  const size  = Math.max(1, Number(meta?.per_page || meta?.page_size || 1))
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

/* Shared fetcher — now hitting the ProductResource-backed pin-code endpoint. */
async function fetchByCategory(opts: {
  categoryId: number
  page?: number
  rows?: number
  perRow?: number
  target: { list: any; meta: any; page: any; last: any; loading: any }
  label?: string
}) {
  const { categoryId, page = 1, rows = 1, perRow = 12, target, label = 'PRODUCTS' } = opts
  try {
    target.loading.value = true
    const res = await $customApi(`/pin-code/category-products`, {
      method: 'GET',
      params: {
        category_id: categoryId,
        page,
        per_page: rows * perRow,
      }
    })
    const { items: list, meta } = unwrapApi(res)

    // TEMP DEBUG — confirm ProductResource is emitting the discount fields.
    // Remove once verified.
    if (process.client && list?.[0]) {
      console.log(`[${label}] raw first item:`, list[0])
    }

    target.list.value    = list.map(mapApiProduct)
    target.meta.value    = meta
    target.page.value    = Number(meta?.current_page || page || 1)
    target.last.value    = lastFromMeta(meta)
  } catch (err) {
    console.error(`[${label}] fetch error:`, err)
    target.list.value = []
  } finally {
    target.loading.value = false
  }
}

/* ---------------- PIN CODE (ONLINE) by category_id = 4 ---------------- */
const items           = ref<any[]>([])
const itemsMeta       = ref<any | null>(null)
const itemsPage       = ref(1)
const itemsLastRef    = ref(1)
const loadingItems    = ref(false)

const PRODUCTS_PER_ROW: 3 | 4 | 5 | 6 = 12
const rowsForGrid = 1
const gridKey = 'grid-pincode'

async function fetchPinCode(page = 1, rows = rowsForGrid, perRow = PRODUCTS_PER_ROW) {
  await fetchByCategory({
    categoryId: 4,
    page, rows, perRow,
    label: 'PINCODE',
    target: { list: items, meta: itemsMeta, page: itemsPage, last: itemsLastRef, loading: loadingItems },
  })
}

const { el: pinGridEl } = useLazySection(() => fetchPinCode(1, rowsForGrid, PRODUCTS_PER_ROW))

/* ---------------- grid under the calculator, category_id = 6688 ---------------- */
const calcItems        = ref<any[]>([])
const calcItemsMeta    = ref<any | null>(null)
const calcItemsPage    = ref(1)
const calcItemsLastRef = ref(1)
const loadingCalcItems = ref(false)

const CALC_CATEGORY_ID = 6688
const CALC_PRODUCTS_PER_ROW = 4
const rowsForCalcGrid = 2
const gridKeyCalc = 'grid-pincode-6688'

async function fetchCalcCategory(page = 1, rows = rowsForCalcGrid, perRow = CALC_PRODUCTS_PER_ROW) {
  await fetchByCategory({
    categoryId: CALC_CATEGORY_ID,
    page, rows, perRow,
    label: 'PINCODE-6688',
    target: {
      list: calcItems,
      meta: calcItemsMeta,
      page: calcItemsPage,
      last: calcItemsLastRef,
      loading: loadingCalcItems,
    },
  })
}

const { el: calcGridEl } = useLazySection(() =>
  fetchCalcCategory(1, rowsForCalcGrid, CALC_PRODUCTS_PER_ROW)
)

/* ---------------- SEO ---------------- */
const siteName = 'Techno Lock Keys'
const baseUrl  = 'https://www.tlkeys.com'
const canonical = `${baseUrl}/pin-code`
const ogImage = 'https://www.tlkeys.com/images/og-image.jpg'
const logoUrl = 'https://www.tlkeys.com/images/logo/techno-lock-desktop-logo.webp'

useSeoMeta({
  title: t('pincode.seoTitle'),
  description: t('pincode.seoDescription'),
  ogType: 'website',
  ogSiteName: siteName,
  ogTitle: t('pincode.ogTitle'),
  ogDescription: t('pincode.ogDescription'),
  ogUrl: canonical,
  ogImage,
  twitterCard: 'summary_large_image'
})

const sameAs = [
  'https://www.facebook.com/technolockkeys_world/',
  'https://twitter.com/techno_lock',
  'https://api.whatsapp.com/send?phone=971504429045'
]

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: `${baseUrl}/`,
  image: logoUrl,
  description: t('pincode.ogDescription'),
  sameAs,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Industrial No. 5, behind Maliha Road., shop No. 8',
    addressLocality: 'Sharjah',
    addressCountry: 'AE'
  },
  telephone: '+971504429045',
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Saturday','Sunday'],
    opens: '08:00',
    closes: '18:00'
  }],
  priceRange: '$$',
  paymentAccepted: 'Cash, Credit Card, Paypal'
}

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: t('pincode.ogTitle'),
  url: canonical,
  description: t('pincode.seoDescription'),
  inLanguage: locale.value,
  isPartOf: { '@type': 'WebSite', name: siteName, url: baseUrl }
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: t('products.home'), item: `${baseUrl}/` },
    { '@type': 'ListItem', position: 2, name: t('pincode.pincode'), item: canonical }
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

/* Optional: expose for quick debugging */
if (process.client) {
  (window as any).__pin = { itemsMeta, itemsPage, itemsLastRef }
  ;(window as any).__pin6688 = { calcItemsMeta, calcItemsPage, calcItemsLastRef }
}
</script>

<style scoped>
.pin-code-page { display: block; }
</style>