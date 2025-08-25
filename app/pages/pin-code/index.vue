<template>
  <main class="pin-code-page">
    <!-- Breadcrumb -->
    <nav aria-label="breadcrumb" class="border-b bg-gray-50">
      <div class="container mx-auto max-w-7xl px-4">
        <ol class="flex items-center gap-2 py-3 text-sm text-gray-600">
          <li>
            <NuxtLink :to="localePath('/')" class="hover:text-gray-900 underline-offset-2 hover:underline">
              {{ t('products.home') }}
            </NuxtLink>
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
        <!-- OFFLINE -->
        <section class="lg:col-span-4">
          <h3 class="text-center text-xl md:text-2xl font-extrabold tracking-tight text-gray-900">
            {{ t('pincode.pincodeoffline') }}
          </h3>

          <div class="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3">
            <article
              v-for="(brand, index) in offlinePinCode"
              :key="index"
              class="group rounded-lg bg-white shadow-sm ring-1 ring-gray-200 p-3 flex flex-col transition hover:shadow-md"
            >
              <NuxtLink
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
                <b class="mt-auto text-center block text-base text-orange-700">
                  {{ brand?.price?.value }} {{ brand?.price?.currency }}
                </b>
              </NuxtLink>
            </article>
          </div>
        </section>

        <!-- ONLINE -->
        <section class="lg:col-span-8">
          <h3 class="text-center text-xl md:text-2xl font-extrabold tracking-tight text-gray-900">
            {{ t('pincode.pincodeonline') }}
          </h3>

          <div class="mt-4 rounded-xl overflow-hidden ring-1 ring-gray-200 bg-white">
            <iframe
              height="520"
              width="100%"
              src="https://vin.prokeytools.com/login"
              class="block"
              style="border: none;"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              title="Pro Key Tools — VIN Login"
            />
          </div>

          <h4 class="mt-4 text-center text-lg font-semibold text-gray-800">
            {{ t('pincode.togetpincode') }}
          </h4>
        </section>
      </div>
    </div>

    <!-- PRODUCTS GRID (PIN CODE ONLINE via category_id=4) -->
    <section ref="pinGridEl" class="container mx-auto max-w-7xl px-4 mt-10">
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
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ProductGrid from '~/components/products/ProductGrid.vue'
import { NuxtImg } from '#components'

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
  async () => await $customApi(`${API_BASE_URL}/slug/${slugParam}`, { method: 'GET' }),
  { server: true, default: () => null, dedupe: 'defer' }
)
if (error.value) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
const resolved = computed<any>(() => slugData.value?.data ?? slugData.value ?? null)

/* ---------- OFFLINE pin-code list ---------- */
const { data: offlineRes } = await useAsyncData(
  'offlinePinCode',
  async () => await $customApi(`${API_BASE_URL}/pin-code/offline-pincode`, { method: 'GET' }),
  { server: true, default: () => ({ data: [] }), dedupe: 'defer' }
)
const offlinePinCode = computed<any[]>(() => offlineRes.value?.data?.data ?? offlineRes.value?.data ?? [])

/* ---------------- helpers (same style as your home page) ---------------- */
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
  try {
    loadingItems.value = true
    const res = await $customApi(`${API_BASE_URL}/homepage-products/featured`, {
      method: 'GET',
      params: {
        page,
        rows,
        per_row: perRow,
        category_id: 4,     // 👈 PIN CODE category
        only_featured: 0,   // include all items in this category
        currency: 'USD',
      }
    })
    const { items: list, meta } = unwrapApi(res)
    items.value        = list.map(mapApiProduct)
    itemsMeta.value    = meta
    itemsPage.value    = Number(meta?.current_page || page || 1)
    itemsLastRef.value = lastFromMeta(meta)
  } catch (err) {
    console.error('[PINCODE] fetch error:', err)
    items.value = []
  } finally {
    loadingItems.value = false
  }
}

/* Lazy-load the grid when it comes into view */
const { el: pinGridEl } = useLazySection(() => fetchPinCode(1, rowsForGrid, PRODUCTS_PER_ROW))

/* ---------------- SEO ---------------- */
const siteName = 'Techno Lock Keys'
const baseUrl  = 'https://www.tlkeys.com'
const canonical = `${baseUrl}/pin-code`
const ogImage = 'https://dev-srv.tlkeys.com/storage/images/seo/og-image.jpg'
const logoUrl = 'https://www.tlkeys.com/tlk-logo.png'

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
if (process.client) (window as any).__pin = { itemsMeta, itemsPage, itemsLastRef }
</script>

<style scoped>
.pin-code-page { display: block; }
</style>
