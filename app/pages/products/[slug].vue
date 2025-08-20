<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue'
import { useI18n, useHead, useRoute, useRuntimeConfig, useNuxtApp } from '#imports'
import { computeUnitPrice } from '~/utils/pricing'

// composables
import { useCurrency } from '~/composables/useCurrency'
import { useAuth } from '~/composables/useAuth'
import { useCart } from '~/composables/useCart'
import { useWishlist } from '~/composables/useWishlist'

/* ---------------- Types ---------------- */
// types at the top of pages/wishlist/index.vue
type PriceTableRow = { min_qty: number; max_qty?: number | null; price: number; sale_price?: number | null }
type WishRow = {
  product_id: Id
  title?: string
  image?: string
  sku?: string
  slug?: string
  price?: number | null            // snapshot unit price we showed on add-to-wishlist
  regular_price?: number | null
  sale_price?: number | null
  table_price?: PriceTableRow[] | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | null
}
type Review = { id: number | string; author_name?: string | null; rating?: number | null; content?: string | null; created_at?: string | null }
type ProductImage = { src: string; alt?: string; id?: number; w?: number; h?: number }
type SimpleItem = { id: number | string; name?: string; title?: string; slug?: string }

type Product = {
  id: number | string
  slug: string
  title: string
  summary_name?: string | null
  image?: string | null
  description?: string | null
  price: number | string
  regular_price?: number | string | null
  sale_price?: number | string | null
  images: ProductImage[]
  table_price?: PriceTableRow[]
  reviews?: Review[]
  categories?: SimpleItem[]
  manufacturers?: SimpleItem[]
  brands?: SimpleItem[]
  sku?: string | null
  min_purchase_qty?: number
  quantity?: number | null
  // Discount (from backend "discount" block)
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | string | null
  discount_start?: string | null
  discount_end?: string | null
  discount_active?: boolean
}

/* ---------------- Base setup ---------------- */
const route = useRoute()
const { localeProperties, t } = useI18n()
const dir = computed(() => localeProperties.value.dir || 'ltr')

const runtime = useRuntimeConfig()
const API_BASE_URL = runtime.public.API_BASE_URL as string
const { $customApi } = useNuxtApp()

const { currency, formatMoney } = useCurrency()
const auth = useAuth()
const cart = useCart()
const wishlist = useWishlist()

const slug = computed(() => route.params.slug as string)

/* ---------------- helpers ---------------- */
const normAlt = (alt: any, title: string) => {
  if (!alt) return title || ''
  if (typeof alt === 'string') {
    try {
      const o = JSON.parse(alt)
      if (o && typeof o === 'object') {
        const first = Object.values(o as Record<string, any>)[0]
        return (o as any).en ?? (typeof first === 'string' ? first : title || '')
      }
    } catch { /* not JSON */ }
    return alt
  }
  if (typeof alt === 'object') {
    const first = Object.values(alt as Record<string, any>)[0]
    return (alt as any).en ?? (typeof first === 'string' ? first : title || '')
  }
  return title || ''
}

const toNum = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const isPercentOrFixed = (t: any): t is 'percent' | 'fixed' => t === 'percent' || t === 'fixed'

/* ---------------- SSR fetch & normalize ---------------- */
const { data: ssr, pending: loading, error } = await useAsyncData(
  () => `product:${slug.value}`,
  async () => {
    const endpoint =
      `${API_BASE_URL}/products/slug/${encodeURIComponent(slug.value)}` +
      `?include=images,table_price,description,reviews,categories,manufacturers,brands,discount`
    const res = await $customApi(endpoint)
    const data = (res?.data ?? res) as any

    let gallery: ProductImage[] =
      Array.isArray(data.images) && data.images.length
        ? data.images
        : (data.image ? [{ src: data.image, alt: data.title || 'image' }] : [])

    gallery = gallery.map((img: any) => ({
      src: img.src,
      alt: normAlt(img.alt, data.title),
      id: img.id ?? undefined,
      w: img.w ? Number(img.w) : undefined,
      h: img.h ? Number(img.h) : undefined
    }))

    // ---- normalize discount ----
    const rawDisc = data?.discount?.data ?? data?.discount ?? {}
    const discType  = isPercentOrFixed(rawDisc?.type) ? rawDisc.type : null
    const discValue = toNum(rawDisc?.value)
    const startISO = rawDisc?.start_date ?? null
    const endISO   = rawDisc?.end_date ?? null
    const nowMs    = Date.now()
    const startOk  = startISO ? nowMs >= Date.parse(startISO) : true
    const endOk    = endISO   ? nowMs <= Date.parse(endISO)   : true
    const active   = Boolean(rawDisc?.active) && discType && discValue !== null && startOk && endOk

    const basePrice =
      toNum(data.sale_price) ??
      toNum(data.price) ??
      toNum(data.regular_price) ??
      0

    const product: Product = {
      id: data.id,
      slug: data.slug,
      title: data.title ?? data.name ?? '',
      summary_name: data.summary_name ?? null,
      image: data.image ?? null,
      description: data.description ?? '',

      price: basePrice,
      regular_price: toNum(data.regular_price),
      sale_price: toNum(data.sale_price),

      images: gallery.length
        ? gallery
        : [{ src: '/images/placeholder.webp', alt: data.title || 'image' }],
      table_price: Array.isArray(data.table_price) ? data.table_price : [],
      reviews: (Array.isArray(data.reviews) ? data.reviews : []).filter(
        (r: any) => r && (r.rating || r.content || r.author_name)
      ),
      categories: Array.isArray(data.categories) ? data.categories : [],
      manufacturers: Array.isArray(data.manufacturers) ? data.manufacturers : [],
      brands: Array.isArray(data.brands) ? data.brands : [],
      sku: data.sku ?? null,
      min_purchase_qty: Number(data.min_purchase_qty ?? 1),
      quantity: data.quantity ?? null,

      discount_type:  active ? discType : null,
      discount_value: active ? discValue : null,
      discount_start: startISO,
      discount_end:   endISO,
      discount_active: active,
    }

    return product
  },
  { server: true, default: () => null, watch: [() => slug.value] }
)

const product = computed<Product | null>(() => ssr.value)

/* ---------------- Qty UI ---------------- */
const qty = ref(1)
const minQty = computed(() => product.value?.min_purchase_qty ?? 1)
const canDecrement = computed(() => qty.value > minQty.value)
function dec() { if (qty.value > minQty.value) qty.value-- }
function inc() { qty.value++ }

/* ---------------- Live price (tier + discount aware) ---------------- */
const rawFallback = computed(() => {
  const p = product.value as any
  return p ? (toNum(p.sale_price) ?? toNum(p.price) ?? toNum(p.regular_price) ?? 0) : 0
})

const unitPrice = computed(() => {
  if (!product.value) return 0
  const res = computeUnitPrice(product.value as any, qty.value)
  return res.unit > 0 ? res.unit : (rawFallback.value || 0)
})

const unitWithoutDiscount = computed(() => {
  if (!product.value) return 0
  const forcedBase =
    (typeof product.value.regular_price === 'number' && product.value.regular_price > 0)
      ? product.value.regular_price
      : Number(product.value.price || 0)

  const p: any = {
    ...(product.value as any),
    discount_type: null,
    discount_value: null,
    sale_price: null,
    price: forcedBase,
    table_price: Array.isArray(product.value.table_price)
      ? product.value.table_price.map(r => ({ ...r, sale_price: null }))
      : null,
  }
  return computeUnitPrice(p, qty.value).unit
})

const displayPrice = computed(() => {
  if (!product.value) return { current: 0, old: null as number | null }
  const current = unitPrice.value
  const old = current < unitWithoutDiscount.value ? unitWithoutDiscount.value : null
  return { current, old }
})

/* ---------------- Discount countdown ---------------- */
const now = ref(Date.now())
let timer: any = null
onMounted(() => { timer = setInterval(() => (now.value = Date.now()), 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
const discountEndsIn = computed(() => {
  const end = product.value?.discount_active && product.value?.discount_end
    ? Date.parse(product.value.discount_end)
    : NaN
  if (!Number.isFinite(end)) return null
  const diff = end - now.value
  if (diff <= 0) return null
  const s = Math.floor(diff / 1000)
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return days > 0 ? `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`
                  : `${pad(hours)}:${pad(mins)}:${pad(secs)}`
})

/* ---------------- Actions ---------------- */
const adding = ref(false)
const wishing = ref(false)

/** IMPORTANT: Normalize to string for compare. */
const inWish = computed(() => product.value
  ? wishlist.isInWishlist(String(product.value.id))
  : false
)

async function onAddToCart() {
  if (!product.value) return
  const p = product.value
  const { unit } = computeUnitPrice(p as any, qty.value)

  await cart.add(p.id, qty.value, {
    title: p.title,
    image: p.image || p.images?.[0]?.src,
    sku: p.sku || undefined,
    slug: p.slug,
    price: toNum(p.price) ?? 0,
    regular_price: toNum(p.regular_price),
    sale_price: toNum(p.sale_price),
    table_price: Array.isArray(p.table_price) ? p.table_price : null,
    discount_type: p.discount_type ?? null,
    discount_value: toNum(p.discount_value),
    priceSnapshot: unit > 0 ? unit : (rawFallback.value || 0),
  })
}

// pages/products/slug.vue — inside onToggleWishlist()
async function onToggleWishlist() {
  if (!product.value) return
  try {
    wishing.value = true
    const p = product.value

    const { unit } = computeUnitPrice(p as any, Math.max(1, Number(qty.value || 1)))
    const snapshotPrice = unit > 0
      ? unit
      : (toNum(p.sale_price) ?? toNum(p.price) ?? toNum(p.regular_price) ?? 0)

    await wishlist.toggle(p.id, {
      title: p.title,
      image: p.image || p.images?.[0]?.src,
      sku:   p.sku || undefined,
      slug:  p.slug,

      // pricing snapshot + raw inputs for recomputation
      price: snapshotPrice,
      regular_price: toNum(p.regular_price) ?? toNum(p.price) ?? null,
      sale_price:    toNum(p.sale_price) ?? null,
      table_price:   Array.isArray(p.table_price) ? p.table_price as any : null,
      discount_type: p.discount_type ?? null,
      discount_value: toNum(p.discount_value) ?? null,
    })
  } finally {
    wishing.value = false
  }
}

/* ---------------- Debug (remove later) ---------------- */
watchEffect(() => {
  if (!product.value) return
  // these logs help confirm why a button would be disabled
  console.log('[WISHLIST DEBUG]', {
    productId: String(product.value.id),
    inWish: inWish.value,
    wishing: wishing.value,
    loadingServer: (wishlist as any).loadingServer,
    serverIds: (wishlist as any).serverIds
  })
})

/* ---------------- SEO ---------------- */
useHead(() => {
  const title = product.value?.title || 'Product'
  const desc = (product.value?.description || '').toString().replace(/<[^>]+>/g, '').slice(0, 160)
  const img = product.value?.images?.[0]?.src || product.value?.image || ''
  return {
    title,
    meta: [
      { name: 'description', content: desc },
      { property: 'og:title', content: title },
      { property: 'og:description', content: desc },
      ...(img ? [{ property: 'og:image', content: img }] : []),
      { name: 'twitter:card', content: 'summary_large_image' }
    ]
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-6" :dir="dir">
    <!-- Loading / Error -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="h-8 w-2/3 bg-gray-200 rounded"></div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div class="h-[520px] bg-gray-200 rounded-2xl"></div>
        <div class="space-y-4">
          <div class="h-6 w-2/3 bg-gray-200 rounded"></div>
          <div class="h-6 w-1/3 bg-gray-200 rounded"></div>
          <div class="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
      {{ (error as any)?.message || error }}
    </div>

    <div v-else-if="product" class="space-y-8">
      <!-- Two column: left gallery, right sticky details -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <!-- LEFT: Gallery -->
        <div class="lg:order-1">
          <ProductGallery
            :images="product.images"
            :maxWidth="680"
            :maxHeight="520"
            class="mx-auto"
          />
        </div>

        <!-- RIGHT: Details (sticky) -->
        <div class="lg:order-2">
          <div class="sticky top-24 space-y-6">
            <!-- Title + meta -->
            <header class="space-y-2">
              <h1 class="text-3xl font-semibold tracking-tight text-gray-900">
                {{ product.title }}
              </h1>
              <p v-if="product.summary_name" class="text-gray-700">
                {{ product.summary_name }}
              </p>
              <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                <span v-if="(product.categories || []).length"><strong class="text-gray-800">Category:</strong>
                  {{ (product.categories || []).map(c => c.name || '').filter(Boolean).join(', ') }}</span>
                <span v-if="(product.manufacturers || []).length"><strong class="text-gray-800">Manufacturer:</strong>
                  {{ (product.manufacturers || []).map(m => m.title || m.name || '').filter(Boolean).join(', ') }}</span>
                <span v-if="(product.brands || []).length"><strong class="text-gray-800">Brand:</strong>
                  {{ (product.brands || []).map(b => b.name || '').filter(Boolean).join(', ') }}</span>
              </div>
              <p v-if="product.sku" class="text-sm text-gray-500">SKU: {{ product.sku }}</p>
            </header>

            <!-- Price card -->
            <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div class="flex items-end gap-3">
                <span class="text-3xl font-bold tracking-tight text-red-600">
                  {{ formatMoney(displayPrice.current) }}
                </span>
                <span v-if="displayPrice.old" class="text-lg text-gray-500 line-through">
                  {{ formatMoney(displayPrice.old) }}
                </span>
                <span
                  v-if="discountEndsIn"
                  class="ms-auto inline-flex items-center rounded-full bg-red-50 text-red-700 text-xs font-medium px-2 py-1 border border-red-200"
                >
                  Ends in {{ discountEndsIn }}
                </span>
              </div>

              <!-- Quantity input -->
              <div class="mt-5 flex items-center gap-3">
                <div class="inline-flex items-center rounded-xl border border-gray-300 overflow-hidden">
                  <button type="button" class="px-3 py-2 hover:bg-gray-50 disabled:opacity-40" :disabled="!canDecrement" @click="dec">−</button>
                  <input class="w-16 text-center py-2 outline-none" type="number" :min="minQty" v-model.number="qty" />
                  <button type="button" class="px-3 py-2 hover:bg-gray-50" @click="inc">+</button>
                </div>
                <span class="text-sm text-gray-500">Min: {{ minQty }}</span>
              </div>

              <!-- Quantity pricing (table tiers) -->
              <div class="mt-5">
                <ProductPriceTable
                  v-if="product.table_price && product.table_price.length"
                  :rows="product.table_price"
                  :currency="currency.value"
                  :title="t('Quantity Pricing')"
                />
              </div>

              <!-- Actions -->
              <div class="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  class="px-6 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition shadow-sm disabled:opacity-60"
                  :disabled="adding"
                  @click="onAddToCart"
                >
                  <span v-if="!adding">{{ t('Add to Cart') }}</span>
                  <span v-else>{{ t('Adding...') }}</span>
                </button>

                <button
                  type="button"
                  class="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-60"
                  :disabled="wishing"
                  @click="onToggleWishlist"
                >
                  <span v-if="!wishing">
                    {{ inWish ? t('Remove from Wishlist') : t('Add to Wishlist') }}
                  </span>
                  <span v-else>{{ t('Saving...') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section v-if="product.description" class="mt-6">
        <div class="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div class="px-4 py-3 bg-gray-50 font-medium">Description</div>
          <div class="p-5">
            <div class="prose max-w-none" v-html="product.description"></div>
          </div>
        </div>
      </section>

      <!-- Reviews -->
      <section v-if="product.reviews && product.reviews.length" class="mt-6">
        <div class="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div class="px-4 py-3 bg-gray-50 font-medium">Reviews</div>
          <div class="p-5 space-y-4">
            <article v-for="rev in product.reviews" :key="rev.id" class="border border-gray-200 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <h4 class="font-semibold">{{ rev.author_name || 'Anonymous' }}</h4>
                <ProductRatingStars :value="rev.rating || 0" />
              </div>
              <p v-if="rev.content" class="mt-2 text-gray-700 whitespace-pre-line">{{ rev.content }}</p>
              <p v-if="rev.created_at" class="mt-2 text-xs text-gray-500">
                {{ new Date(rev.created_at).toLocaleDateString() }}
              </p>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
