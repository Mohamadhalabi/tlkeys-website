<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNuxtApp, useRuntimeConfig, useLocalePath, useI18n } from '#imports'
import ProductCarousel from '~/components/products/ProductCarousel.vue'

type ApiMeta = { current_page?: number; last_page?: number; total?: number; page_size?: number }

const props = withDefaults(defineProps<{
  title: string
  categoryId: number
  leftImage?: string
  leftImageAlt?: string
  leftImageTo?: string
  viewAllTo?: string
  viewAllLabel?: string
  perRow?: number
  rows?: number
  currency?: string
}>(), {
  perRow: 4,
  rows: 1,
  currency: 'USD',
  leftImage: '',
  leftImageAlt: '',
  leftImageTo: '',
  viewAllTo: '',
  viewAllLabel: ''
})

const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp()

/* ---------- helpers ---------- */
function unwrapApi(res: any) {
  const body  = (res && typeof res === 'object' && 'data' in res && !Array.isArray(res.data)) ? res.data : res
  const items = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : [])
  const meta  = (body && body.meta) ?? (res && (res as any).meta) ?? null
  return { items, meta: meta as ApiMeta | null }
}

function mapApiProduct(p: any) {
  const hasSale = p?.sale_price != null && p?.sale_price !== 0

  // ✅ robust stock normalization (supports several backend field names)
  const stockRaw =
    p?.quantity ??
    null

  const stock =
    stockRaw === null || stockRaw === undefined
      ? null
      : (Number.isFinite(Number(stockRaw)) ? Number(stockRaw) : null)

  // discount from API
  const d = p?.discount || {}
  const typeRaw = d?.type
  const valueNum =
    typeof d?.value === 'number' ? d.value : (d?.value != null ? Number(d.value) : null)
  const active = !!d?.active && (typeRaw === 'fixed' || typeRaw === 'percent') && valueNum != null

  // tiers
  const tablePrice =
    Array.isArray(p?.table_price) ? p.table_price
    : Array.isArray(p?.table_price?.data) ? p.table_price.data
    : null

  // free shipping flag
  const isFree =
    p?.is_free_shipping === 1 || p?.is_free_shipping === '1' || p?.is_free_shipping === true

  // categories → detect software/token
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

    // ✅ expose normalized stock to ProductCard / cart meta
    stock,

    // display price (sale wins)
    price: hasSale ? p.sale_price : p.price,
    oldPrice: hasSale ? p.price : null,

    // pricing knobs for ProductCard
    regular_price: p.regular_price ?? p.price ?? null,
    sale_price: p.sale_price ?? null,
    table_price: tablePrice,
    discount_type: active ? (typeRaw as 'fixed' | 'percent') : null,
    discount_value: active ? valueNum : null,
    discount_start_date: d?.start_date ?? null,
    discount_end_date:   d?.end_date ?? null,

    // meta / links / badges
    sku: p.sku ?? '',
    category: categoryName,
    categorySlug,
    slug: p.slug,
    href: p.slug ? `/products/${p.slug}` : `/products/${p.id}`,
    freeShipping: isFree,
    badgeText: isFree ? 'FREE SHIPPING' : null,

    // flags used by cards
    hide_price: hidePrice,
    requires_serial: requiresSerial,
  }
}


function lastFromMeta(m: ApiMeta | null) {
  const lp = Number(m?.last_page)
  if (Number.isFinite(lp) && lp > 1) return lp
  const total = Number(m?.total || 0)
  const size  = Math.max(1, Number(m?.page_size || 1))
  const calc  = Math.ceil(total / size)
  return calc > 0 ? calc : 1
}

/* ---------- state ---------- */
const products = ref<any[]>([])
const meta      = ref<ApiMeta | null>(null)
const page      = ref(1)
const lastRef   = ref(1)

/* ---------- fetch ---------- */
async function fetchPage(p = 1) {
  const res = await $customApi(`${API_BASE_URL}/homepage-products/featured`, {
    method: 'GET',
    params: {
      page: p,
      rows: props.rows,
      per_row: props.perRow,
      category_id: props.categoryId,
      only_featured: 0,
      include: 'table_price,categories',  // ⬅️ include categories so we can set requires_serial
      currency: props.currency,
    }
  })
  const { items, meta: m } = unwrapApi(res)
  products.value = items.map(mapApiProduct)
  meta.value     = m
  page.value     = Number(m?.current_page || p || 1)
  lastRef.value  = lastFromMeta(m)
}

/* ---------- lazy load ---------- */
const el = ref<HTMLElement | null>(null)
onMounted(() => {
  if (!el.value) return
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { fetchPage(1); io.disconnect() }
  }, { rootMargin: '200px' })
  io.observe(el.value)
})

/* ---------- i18n + links ---------- */
const i18n = (useI18n?.() as any) || null
const t = i18n?.t ?? ((s:string)=>s)
const currentLocale = i18n?.locale ?? ref('en')
const isRtl = computed(() => /^ar(\b|-|_)/i.test(String(currentLocale.value)))

const localePath = useLocalePath()
const hasLeftImage = computed(() => !!props.leftImage)

const leftHref = computed(() => {
  if (!props.leftImageTo) return ''
  if (/^https?:\/\//i.test(props.leftImageTo)) return props.leftImageTo
  return localePath(props.leftImageTo)
})
const viewAllLabel = computed(() => props.viewAllLabel || t('home.viewAll') || 'View all')
const viewAllHref = computed(() => {
  if (!props.viewAllTo) return ''
  if (/^https?:\/\//i.test(props.viewAllTo)) return props.viewAllTo
  return localePath(props.viewAllTo)
})
</script>

<template>
  <section ref="el" class="mt-6">
    <div class="lg:container md:mx-auto lg:px-4">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <!-- LEFT IMAGE -->
        <div v-if="hasLeftImage" class="hidden lg:col-span-3 lg:block">
          <NuxtLinkLocale
            v-if="leftHref"
            :to="leftHref"
            class="group block h-full"
            aria-label="Open {{ title }}"
          >
            <div class="relative h-full min-h-[520px] rounded-3xl overflow-hidden bg-white/40">
              <NuxtImg
                :src="leftImage!"
                :alt="leftImageAlt || title"
                class="absolute inset-0 h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                format="webp"
                decoding="async"
                loading="lazy"
              />
            </div>
          </NuxtLinkLocale>

          <div v-else class="relative h-full min-h-[520px] rounded-3xl overflow-hidden bg-white/40">
            <NuxtImg
              :src="leftImage!"
              :alt="leftImageAlt || title"
              class="absolute inset-0 h-full w-full object-contain"
              sizes="(min-width:1536px) 24vw, (min-width:1280px) 25vw, (min-width:1024px) 28vw, 100vw"
              format="webp"
              decoding="async"
              loading="lazy"
            />
          </div>
        </div>

        <!-- CAROUSEL -->
        <div :class="hasLeftImage ? 'lg:col-span-9' : 'lg:col-span-12'">
          <ProductCarousel
            v-if="products.length"
            :title="title"
            :products="products"
            :rowsBase="1" :rowsSm="1" :rowsMd="1" :rowsLg="1" :rowsXl="1"
            :perRowBase="2" :perRowSm="2" :perRowMd="3" :perRowLg="4" :perRowXl="4"
            :serverPaging="true"
            :currentPage="page"
            :lastPage="lastRef"
            :show-arrows="true"
            :show-dots="lastRef <= 12"
            :rtl="isRtl"
            @request-page="(p:number) => fetchPage(p)"
          >
            <template #title-action>
              <NuxtLinkLocale
                v-if="viewAllHref"
                :to="viewAllHref"
                class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
                       text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="View all {{ title }}"
              >
                <span>{{ viewAllLabel }}</span>
                <svg v-if="!isRtl" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                </svg>
                <svg v-else class="h-4 w-4 rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                </svg>
              </NuxtLinkLocale>
            </template>
          </ProductCarousel>

          <div v-else class="px-1 py-4 text-sm text-gray-500">
            Loading {{ title }}…
          </div>
        </div>
      </div>
    </div>
  </section>
</template>