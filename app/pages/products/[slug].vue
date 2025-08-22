<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n, useHead, useRoute, useRuntimeConfig, useNuxtApp, useRequestURL } from '#imports'
import { computeUnitPrice } from '~/utils/pricing'

/* composables */
import { useCurrency } from '~/composables/useCurrency'
import { useCart } from '~/composables/useCart'
import { useWishlist } from '~/composables/useWishlist'
import { useAlertStore } from '~/stores/alert'

/* components */
import ProductTabDescription from '~/components/product/tabs/ProductTabDescription.vue'
import ProductTabReviews from '~/components/product/tabs/ProductTabReviews.vue'
import ProductTabFAQ from '~/components/product/tabs/ProductTabFAQ.vue'
import ProductTabVideos from '~/components/product/tabs/ProductTabVideos.vue'
import ProductTabContact from '~/components/product/tabs/ProductTabContact.vue'
import ProductGallery from '~/components/product/ProductGallery.vue'
import ProductPriceTable from '~/components/product/ProductPriceTable.vue'
import ProductAttributesTable from '~/components/product/ProductAttributesTable.vue'
import ProductRelatedGrid from '~/components/product/ProductRelatedGrid.vue'
import ProductCompatibilityTable from '~/components/product/ProductCompatibilityTable.vue'
import FlipCountdown from '~/components/ui/FlipCountdown.vue'
import ProductCarousel from '~/components/products/ProductCarousel.vue'

/* ---------------- Types ---------------- */
type PriceTableRow = { min_qty: number; max_qty?: number | null; price: number | string; sale_price?: number | string | null }
type Review       = { id: number | string; author_name?: string | null; rating?: number | null; content?: string | null; created_at?: string | null }
type ProductImage = { src: string; alt?: string; id?: number; w?: number; h?: number }
type SimpleItem   = { id: number | string; name?: string; title?: string; slug?: string }
type FaqItem      = { q: string; a: string }
type VideoItem    = { title?: string | null; url: string }
type AttrItem     = { id: number | string; slug?: string; value: string }
type AttrGroup    = { id: number | string; slug?: string; name: string; items: AttrItem[] }
type MiniProduct  = {
  id: number | string
  slug?: string
  title: string
  image?: string | null
  sku?: string | null
  price?: number | null
  regular_price?: number | null
  sale_price?: number | null
}
type CompatibilityRow = { brand: string; model: string; from: number | null; to: number | null }

type Product = {
  id: number | string
  slug: string
  title: string
  meta_title?: string | null
  meta_description?: string | null
  summary_name?: string | null
  short_title?: string | null
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
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | string | null
  discount_start?: string | null
  discount_end?: string | null
  discount_active?: boolean
  accessories?: MiniProduct[]
  bundles?: MiniProduct[]
  attributes?: AttrGroup[]
  compatibility?: CompatibilityRow[]
  faq?: FaqItem[] | null
  videos?: VideoItem[] | null
}

/* ---------------- Base setup ---------------- */
const route = useRoute()
const { t: _t, localeProperties } = useI18n()
const dir = computed(() => localeProperties.value.dir || 'ltr')

const runtime = useRuntimeConfig()
const API_BASE_URL = runtime.public.API_BASE_URL as string
const SITE_URL = (runtime.public.SITE_URL as string) || ''
const { $customApi } = useNuxtApp()
const requestURL = useRequestURL()

const t = (key: string, fallback?: string) => {
  const out = _t(key) as string
  return out === key ? (fallback ?? key) : out
}

const { currency, formatMoney } = useCurrency()
const cart = useCart()
const wishlist = useWishlist()
const alerts = useAlertStore()
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
    } catch {}
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
const nameToPath = (s?: string | null) => {
  if (!s) return '/'
  const cleaned = s.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, '')
  return `/${encodeURIComponent(cleaned)}`
}

const isUrgent = computed(() => {
  if (!discountEndsIn.value) return false
  return !String(discountEndsIn.value).includes('d')
})

const discountRange = computed(() => {
  const start = product.value?.discount_active && product.value?.discount_start
    ? Date.parse(product.value.discount_start) : NaN
  const end   = product.value?.discount_active && product.value?.discount_end
    ? Date.parse(product.value.discount_end)   : NaN
  return { start, end }
})

const discountProgress = computed(() => {
  const { start, end } = discountRange.value
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null
  const total = end - start
  const elapsed = Math.min(Math.max(now.value - start, 0), total)
  const pct = Math.round((elapsed / total) * 100)
  return { pct, total, elapsed, end }
})

const discountTooltip = computed(() => {
  const endISO = product.value?.discount_end
  if (!endISO) return ''
  try {
    return new Date(endISO).toLocaleString()
  } catch { return String(endISO) }
})

/* ---------------- SSR fetch & normalize ---------------- */
const { data: ssr, pending: loading, error } = await useAsyncData(
  () => `product:${slug.value}`,
  async () => {
    const endpoint =
      `${API_BASE_URL}/products/slug/${encodeURIComponent(slug.value)}` +
      `?include=images,table_price,description,reviews,categories,manufacturers,brands,meta_title,meta_description,discount,accessories,bundles,attributes,faq,videos,compatibility`
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

    const rawDisc   = data?.discount?.data ?? data?.discount ?? {}
    const discType  = isPercentOrFixed(rawDisc?.type) ? rawDisc.type : null
    const discValue = toNum(rawDisc?.value)
    const startISO  = rawDisc?.start_date ?? null
    const endISO    = rawDisc?.end_date ?? null
    const nowMs     = Date.now()
    const startOk   = startISO ? nowMs >= Date.parse(startISO) : true
    const endOk     = endISO   ? nowMs <= Date.parse(endISO)   : true
    const active    = Boolean(rawDisc?.active) && discType && discValue !== null && startOk && endOk

    const basePrice =
      toNum(data.sale_price) ??
      toNum(data.price) ??
      toNum(data.regular_price) ??
      0

    const faqRaw    = (data?.faq?.data ?? data?.faq) || []
    const videosRaw = (data?.videos?.data ?? data?.videos) || []

    const product: Product = {
      id: data.id,
      slug: data.slug,
      title: data.title ?? data.name ?? '',
      summary_name: data.summary_name ?? null,
      short_title: data.short_title ?? null,
      image: data.image ?? null,
      description: data.description ?? '',
      meta_title: data.meta_title ?? '',
      meta_description: data.meta_description ?? '',
      price: basePrice,
      regular_price: toNum(data.regular_price),
      sale_price: toNum(data.sale_price),
      images: gallery.length ? gallery : [{ src: '/images/placeholder.webp', alt: data.title || 'image' }],
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

      accessories: Array.isArray(data.accessories) ? data.accessories : [],
      bundles: Array.isArray(data.bundles) ? data.bundles : [],
      attributes: Array.isArray(data.attributes) ? data.attributes : [],
      compatibility: Array.isArray(data.compatibility) ? data.compatibility : [],
      faq: Array.isArray(faqRaw)
        ? faqRaw.map((x: any) => ({ q: String(x.q ?? x.question ?? ''), a: String(x.a ?? x.answer ?? '') }))
        : [],
      videos: Array.isArray(videosRaw)
        ? videosRaw.map((x: any) => ({ title: x.title ?? null, url: String(x.url ?? x.link ?? '') }))
        : []
    }

    return product
  },
  { server: true, default: () => null, watch: [() => slug.value] }
)

const product = computed<Product | null>(() => ssr.value)

/* ---------------- Computed links & breadcrumb ---------------- */
const primaryCategory = computed(() => (product.value?.categories || [])[0])
const breadcrumb = computed(() => {
  const items: { label: string; to?: string }[] = [{ label: 'Home', to: '/' }]
  const catLabel = primaryCategory.value?.name || primaryCategory.value?.title
  if (catLabel) items.push({ label: catLabel, to: nameToPath(catLabel || '') })
  items.push({ label: product.value?.short_title || product.value?.title || 'Product' })
  return items
})
function makeLinks<T>(src: T[] | undefined | null, labelOf: (x: T) => string | undefined | null) {
  const out: { label: string; to: string }[] = []
  const seen = new Set<string>()
  for (const row of src || []) {
    const label = (labelOf(row) || '').trim()
    if (!label) continue
    const norm = label.toLowerCase().replace(/\s+/g, ' ')
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push({ label, to: nameToPath(label) })
  }
  return out
}
const categoryLinks = computed(() => makeLinks(product.value?.categories, c => c?.name || c?.title))
const manufacturerLinks = computed(() => makeLinks(product.value?.manufacturers, m => m?.title || m?.name))
const brandLinks = computed(() => makeLinks(product.value?.brands, b => b?.name || (b as any)?.title))

/* ---------------- Qty UI ---------------- */
const qty = ref(1)
const minQty = computed(() => Math.max(1, Number(product.value?.min_purchase_qty ?? 1)))
const canDecrement = computed(() => qty.value > minQty.value)
function dec() { if (qty.value > minQty.value) qty.value-- }
function inc() { qty.value++ }
const qtyInitialized = ref(false)
watch([() => product.value, () => minQty.value], ([p, min]) => {
  if (!p) return
  if (!qtyInitialized.value) {
    qty.value = Number(min)
    qtyInitialized.value = true
  } else if (qty.value < Number(min)) {
    qty.value = Number(min)
  }
}, { immediate: true })

/* ---------------- Live price ---------------- */
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

/* 🔸 Discount helpers for overlay */
const hasDiscountNow = computed(() => !!displayPrice.value.old && displayPrice.value.old > displayPrice.value.current)
const discountAmountNow = computed(() => hasDiscountNow.value ? (displayPrice.value.old! - displayPrice.value.current) : 0)

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
const inWish = computed(() => product.value ? wishlist.isInWishlist(String(product.value.id)) : false)

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
    stock: typeof p.quantity === 'number' ? p.quantity : null,
  })
}

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
      price: snapshotPrice,
      regular_price: toNum(p.regular_price) ?? toNum(p.price) ?? null,
      sale_price:    toNum(p.sale_price) ?? null,
      table_price:   Array.isArray(p.table_price) ? (p.table_price as any) : null,
      discount_type: p.discount_type ?? null,
      discount_value: toNum(p.discount_value) ?? null,
    })
  } finally {
    wishing.value = false
  }
}

/* ---------------- Tabs ---------------- */
const tabs = [
  { key: 'desc',    label: 'Description' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'faq',     label: 'FAQ' },
  { key: 'videos',  label: 'Videos' },
  { key: 'contact', label: 'Contact Us' }
] as const
type TabKey = typeof tabs[number]['key']
const activeTab = ref<TabKey>('desc')
function setTab(k: TabKey) { activeTab.value = k }

/* ---------------- Head ---------------- */
const absUrl = computed(() => {
  const origin = (requestURL && requestURL.origin) ? requestURL.origin : SITE_URL
  const pathname = requestURL?.pathname || ''
  return String(origin).replace(/\/+$/, '') + pathname
})

useHead(() => {
  const p = product.value
  const stripHtml = (html?: string | null) =>
    (html || '').toString().replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

  const title = p?.meta_title || (p?.title || '')
  const desc  = p?.meta_description || stripHtml(p?.description || '')

  const imgList = (p?.images || []).map(i => i?.src).filter(Boolean) as string[]
  const primaryImg = imgList[0] || p?.image || ''

  let aggregateRating: any = null
  const reviewsLd =
    Array.isArray(p?.reviews) && p!.reviews!.length
      ? p!.reviews!
          .filter(r => r && (r.content || Number.isFinite(Number(r.rating))))
          .map(r => ({
            '@type': 'Review',
            author: r.author_name || 'Customer',
            reviewBody: r.content ? stripHtml(r.content) : undefined,
            reviewRating: Number.isFinite(Number(r.rating))
              ? { '@type': 'Rating', ratingValue: Number(r.rating) }
              : undefined,
            datePublished: r.created_at || undefined
          }))
      : undefined

  if (Array.isArray(p?.reviews) && p!.reviews!.length) {
    const rated = p!.reviews!.map(r => Number(r?.rating)).filter(n => Number.isFinite(n))
    if (rated.length) {
      const avg = rated.reduce((a, b) => a + b, 0) / rated.length
      aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(avg.toFixed(2)),
        reviewCount: rated.length
      }
    }
  }

  const cur = currency.value || 'USD'
  const qtyNum = Number(p?.quantity ?? 0)
  const availability =
    qtyNum > 0 ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock'

  const priceNumber = p
    ? Number(
        (typeof p.sale_price === 'number' && p.sale_price > 0
          ? p.sale_price
          : typeof p.price === 'number' && p.price > 0
          ? p.price
          : p.regular_price) || 0
      )
    : 0

  const offers: any = p
    ? {
        '@type': 'Offer',
        url: absUrl.value,
        priceCurrency: cur,
        price: Math.max(0, Number(priceNumber || 0)).toFixed(2),
        availability,
        sku: p.sku || undefined,
        priceValidUntil: p?.discount_active && p?.discount_end ? p.discount_end : undefined
      }
    : undefined

  const brandName =
    (p?.brands && p.brands[0] && (p.brands[0].name || (p.brands[0] as any).title)) ||
    (p?.manufacturers && p.manufacturers[0] && (p.manufacturers[0].title || p.manufacturers[0].name)) ||
    undefined

  const productLd: any = p && {
    '@type': 'Product',
    '@id': absUrl.value + '#product',
    name: title,
    description: desc,
    image: imgList.length ? imgList : (primaryImg ? [primaryImg] : undefined),
    sku: p.sku || undefined,
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    category:
      (p?.categories && p.categories[0] && (p.categories[0].name || p.categories[0].title)) ||
      undefined,
    offers,
    aggregateRating,
    review: reviewsLd
  }

  const breadcrumbLd =
    breadcrumb.value && breadcrumb.value.length
      ? {
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumb.value.map((b, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: b.label,
            item: b.to ? (absUrl.value.replace(requestURL.pathname, '') + b.to) : absUrl.value
          }))
        }
      : undefined

  const faqs = Array.isArray(p?.faq)
    ? p!.faq!
        .filter(f => f && (f.q || f.a))
        .map(f => ({
          '@type': 'Question',
          name: stripHtml(f.q || ''),
          acceptedAnswer: {
            '@type': 'Answer',
            text: stripHtml(f.a || '')
          }
        }))
    : []

  const faqLd = faqs.length
    ? {
        '@type': 'FAQPage',
        '@id': absUrl.value + '#faq',
        mainEntity: faqs
      }
    : undefined

  const videosLd =
    Array.isArray(p?.videos) && p!.videos!.length
      ? p!.videos!
          .filter(v => v && v.url)
          .map(v => ({
            '@type': 'VideoObject',
            name: v.title || title,
            description: desc || undefined,
            thumbnailUrl: primaryImg ? [primaryImg] : undefined,
            contentUrl: v.url,
            embedUrl: v.url,
            url: v.url
          }))
      : undefined

  const graph = [productLd, breadcrumbLd, faqLd, ...(Array.isArray(videosLd) ? videosLd : videosLd ? [videosLd] : [])].filter(Boolean)

  return {
    title,
    meta: [
      { name: 'description', content: desc },
      { property: 'og:type', content: 'product' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: desc },
      ...(primaryImg ? [{ property: 'og:image', content: primaryImg }] : []),
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'og:url', content: absUrl.value },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: desc },
      ...(primaryImg ? [{ name: 'twitter:image', content: primaryImg }] : [])
    ],
    link: [{ rel: 'canonical', href: absUrl.value }],
    script: graph.length
      ? [{
          id: 'ld-json',
          type: 'application/ld+json',
          innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
        }]
      : []
  }
})

/* ---------------- Related products (lazy) ---------------- */
type GridProduct = {
  id: number | string
  name: string
  image: string
  price: number
  oldPrice?: number | null
  slug?: string
  href?: string
  sku?: string | null
  category?: string | null
}
const relatedProducts = ref<GridProduct[]>([])
const relatedLoading  = ref(false)
const relatedError    = ref<string | null>(null)
const relatedTriggered = ref(false)
const relatedSentinel = ref<HTMLElement | null>(null)
let relatedIO: IntersectionObserver | null = null

function normRelatedItem(x: any): GridProduct | null {
  if (!x) return null
  const id   = x.id ?? x.product_id
  const name = String(x.title ?? x.name ?? '')
  const img  = x.image || x.images?.[0]?.src || ''
  const price = Number(
    (typeof x.sale_price === 'number' && x.sale_price > 0 ? x.sale_price
      : typeof x.price === 'number' && x.price > 0 ? x.price
      : x.regular_price) ?? 0
  )
  const old = (x.regular_price && Number(x.regular_price) > price) ? Number(x.regular_price) : null
  return { id, name, image: img, price, oldPrice: old, slug: x.slug }
}

async function fetchRelatedOnce() {
  if (relatedTriggered.value || relatedLoading.value) return
  if (!product.value) return
  relatedTriggered.value = true
  relatedLoading.value = true
  relatedError.value = null
  try {
    const catIds   = (product.value.categories || []).map(c => c.id).filter(Boolean)
    const manuIds  = (product.value.manufacturers || []).map(m => m.id).filter(Boolean)
    const brandIds = (product.value.brands || []).map(b => b.id).filter(Boolean)

    if (!catIds.length && !manuIds.length && !brandIds.length) {
      relatedProducts.value = []
      return
    }

    const body = {
      exclude_id: product.value.id,
      categories: catIds,
      manufacturers: manuIds,
      brands: brandIds,
      limit: 24
    }

    const res = await $customApi(`${API_BASE_URL}/products/related`, { method: 'POST', body })
    const rows: any[] = (res?.data ?? res ?? []) as any[]
    relatedProducts.value = rows.map(normRelatedItem).filter(Boolean) as GridProduct[]
  } catch (e: any) {
    relatedError.value = e?.message || 'Failed to load related products'
  } finally {
    relatedLoading.value = false
  }
}

onMounted(() => {
  if (!process.client) return
  relatedIO = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) fetchRelatedOnce()
  }, { rootMargin: '0px 0px 200px 0px' })
  if (relatedSentinel.value) relatedIO.observe(relatedSentinel.value)
})

onUnmounted(() => {
  relatedIO?.disconnect()
  relatedIO = null
})

watch(() => product.value?.id, () => {
  relatedProducts.value = []
  relatedError.value = null
  relatedLoading.value = false
  relatedTriggered.value = false
  if (process.client && relatedSentinel.value && relatedIO) relatedIO.observe(relatedSentinel.value)
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 lg:py-10" :dir="dir">
    <!-- Breadcrumb -->
    <nav aria-label="Breadcrumb" class="mb-5">
      <ol class="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        <li v-for="(c, i) in breadcrumb" :key="i" class="flex items-center gap-1">
          <NuxtLink v-if="c.to" :to="c.to" class="text-gray-600 hover:text-gray-900 hover:underline transition">
            {{ c.label }}
          </NuxtLink>
          <span v-else class="text-gray-700 font-medium">{{ c.label }}</span>
          <span v-if="i < breadcrumb.length - 1" class="px-1 text-gray-300">/</span>
        </li>
      </ol>
    </nav>

    <!-- Loading / Error -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="h-7 w-2/3 bg-gray-200 rounded"></div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <div class="h-[520px] bg-gray-200 rounded-2xl"></div>
        <div class="space-y-4">
          <div class="h-6 w-2/3 bg-gray-200 rounded"></div>
          <div class="h-6 w-1/3 bg-gray-200 rounded"></div>
          <div class="h-28 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
      {{ (error as any)?.message || error }}
    </div>

    <div v-else-if="product" class="space-y-8">
      <!-- Two column layout -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <!-- Gallery with overlay + animated OFF pill -->
        <div class="lg:order-1">
          <ProductGallery
            :images="product.images"
            :maxWidth="680"
            :maxHeight="520"
            :discount-ends-at="product.discount_active ? product.discount_end : null"
            :discount-amount="hasDiscountNow ? discountAmountNow : 0"
          />
        </div>

        <!-- Details -->
        <div class="lg:order-2">
          <div class="lg:sticky lg:top-24 space-y-6">
            <!-- Title / meta -->
            <div class="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur p-6 shadow-sm">
              <h1 class="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
                {{ product.title }}
              </h1>
              <p v-if="product.summary_name" class="mt-1 text-base text-green-800 text-gray-600">
                {{ product.summary_name }}
              </p>
              <hr />
              <div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span v-if="product.sku" class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 border border-emerald-200">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> SKU: {{ product.sku }}
                </span>
              </div>

              <!-- chips -->
              <div class="mt-5 space-y-3 text-sm">
                <div v-if="categoryLinks.length">
                  <div class="mb-1 text-gray-500">Categories</div>
                  <div class="flex flex-wrap gap-2">
                    <NuxtLink v-for="c in categoryLinks" :key="c.to" :to="c.to"
                      class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 hover:bg-white hover:shadow-sm transition">
                      {{ c.label }}
                    </NuxtLink>
                  </div>
                </div>
                <div v-if="manufacturerLinks.length">
                  <div class="mb-1 text-gray-500">Manufacturers</div>
                  <div class="flex flex-wrap gap-2">
                    <NuxtLink v-for="m in manufacturerLinks" :key="m.to" :to="m.to"
                      class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 hover:bg-white hover:shadow-sm transition">
                      {{ m.label }}
                    </NuxtLink>
                  </div>
                </div>
                <div v-if="brandLinks.length">
                  <div class="mb-1 text-gray-500">Brands</div>
                  <div class="flex flex-wrap gap-2">
                    <NuxtLink v-for="b in brandLinks" :key="b.to" :to="b.to"
                      class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 hover:bg-white hover:shadow-sm transition">
                      {{ b.label }}
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>

            <!-- Price card -->
            <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div class="flex items-end gap-3">
                <span class="text-[28px] md:text-4xl text-red-600 font-bold tracking-tight text-gray-900">
                  {{ formatMoney(displayPrice.current) }}
                </span>
                <span v-if="displayPrice.old" class="text-lg text-gray-500 line-through">
                  {{ formatMoney(displayPrice.old) }}
                </span>
              </div>
              <!-- Quantity input -->
              <div class="mt-5 flex flex-wrap items-center gap-3" data-nosnippet>
                <div class="inline-flex items-stretch rounded-xl border border-gray-300 bg-white overflow-hidden">
                  <button type="button" class="px-3 py-2 hover:bg-gray-50 focus:outline-none focus-visible:ring focus-visible:ring-orange-200 disabled:opacity-40" :disabled="!canDecrement" @click="dec" aria-label="Decrease quantity">−</button>
                  <input class="w-16 text-center py-2 outline-none focus-visible:ring-0" type="number" :min="minQty" v-model.number="qty" inputmode="numeric" aria-label="Quantity" />
                  <button type="button" class="px-3 py-2 hover:bg-gray-50 focus:outline-none focus-visible:ring focus-visible:ring-orange-200" @click="inc" aria-label="Increase quantity">+</button>
                </div>
                <span class="text-sm text-gray-500">Min: {{ minQty }}</span>
              </div>

              <!-- Quantity pricing -->
              <div class="mt-5">
                <ProductPriceTable
                  v-if="product.table_price && product.table_price.length"
                  :rows="product.table_price"
                  :currency="currency.value"
                  :title="t('Quantity Pricing', 'Quantity Pricing')"
                />
              </div>

              <!-- Actions -->
              <div class="mt-5 flex flex-wrap items-center gap-3" data-nosnippet>
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-medium text-white shadow-sm ring-1 ring-orange-500/10 hover:bg-orange-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:opacity-60"
                  :disabled="adding"
                  @click="onAddToCart"
                >
                  <span v-if="!adding">Add to Cart</span>
                  <span v-else>Adding…</span>
                </button>

                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-200 disabled:opacity-60"
                  :disabled="wishing"
                  @click="onToggleWishlist"
                >
                  <span v-if="!wishing">
                    {{ inWish ? 'Remove from Wishlist' : 'Add to Wishlist' }}
                  </span>
                  <span v-else>Saving…</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Accessories -->
      <ProductRelatedGrid v-if="product?.accessories?.length" title="Accessories" :items="product!.accessories!" />

      <!-- Bundle products -->
      <ProductRelatedGrid v-if="product?.bundles?.length" class="mt-4" title="Bundle Products" :items="product!.bundles!" />

      <!-- Specifications -->
      <ProductAttributesTable v-if="product?.attributes?.length" :groups="product!.attributes!" />

      <!-- Compatibility -->
      <ProductCompatibilityTable v-if="product?.compatibility?.length" :rows="product!.compatibility!" title="Compatibility" />

      <!-- Tabs -->
      <section class="mt-6">
        <div class="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div class="flex flex-wrap gap-1 px-2 py-2 bg-gray-50/70">
            <button
              v-for="tItem in tabs" :key="tItem.key" type="button"
              class="px-4 py-2 text-sm font-medium rounded-xl border transition focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
              :class="activeTab === tItem.key
                ? 'bg-white border-gray-300 text-gray-900 shadow-sm'
                : 'bg-transparent border-transparent text-gray-600 hover:bg-white hover:border-gray-300'"
              @click="setTab(tItem.key as any)" :aria-pressed="activeTab === tItem.key"
            >
              {{ tItem.label }}
            </button>
          </div>

          <div class="p-5">
            <ProductTabDescription v-if="activeTab === 'desc'" :key="'desc'" :html="product.description || ''" />
            <ProductTabReviews     v-else-if="activeTab === 'reviews'" :key="'reviews'" :reviews="product.reviews || []" />
            <ProductTabFAQ         v-else-if="activeTab === 'faq'" :key="'faq'" :items="product.faq || []" />
            <ProductTabVideos      v-else-if="activeTab === 'videos'" :key="'videos'" :videos="product.videos || []" />
            <ProductTabContact     v-else :key="'contact'"
              :api-base-url="API_BASE_URL" :product-id="product.id" :product-slug="product.slug" :sku="product.sku"
              :whatsapp="`https://wa.me/971504429045?text=${encodeURIComponent('Hello, I want to inquire about the product with SKU: ' + (product.sku ?? ''))}`"
              data-nosnippet
            />
          </div>
        </div>
      </section>

      <!-- Related Products (lazy) -->
      <div ref="relatedSentinel"></div>
      <section class="mt-8">
        <div v-if="relatedLoading" class="mx-auto max-w-screen-2xl px-3 sm:px-4">
          <div class="h-6 w-40 bg-gray-200 rounded mb-3"></div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div v-for="i in 10" :key="i" class="h-44 bg-gray-100 rounded"></div>
          </div>
        </div>

        <div v-else-if="relatedError" class="mx-auto max-w-screen-2xl px-3 sm:px-4">
          <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            {{ relatedError }}
          </div>
        </div>

        <ProductCarousel
          v-else-if="relatedProducts.length"
          title="Related Products"
          :products="relatedProducts"
          :rowsBase="1" :rowsSm="1" :rowsMd="1" :rowsLg="1" :rowsXl="1"
          :perRowBase="2" :perRowSm="2" :perRowMd="3" :perRowLg="4" :perRowXl="5"
          :showArrows="true" :showDots="true"
          @add-to-cart="(p) => cart.add(p.id, 1, { title: p.name, image: p.image, slug: p.slug, price: p.price })"
        />
      </section>
    </div>
  </div>
</template>