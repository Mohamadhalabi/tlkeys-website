<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue'
import { useI18n, useHead, useRoute, useRuntimeConfig, useNuxtApp, createError, navigateTo, useAsyncData, useLocalePath } from '#imports'
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
import ProductCompatibilityTable from '~/components/product/ProductCompatibilityTable.vue'
import ProductRelatedGrid from '~/components/product/ProductRelatedGrid.vue'
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
  hide_price?: boolean | number | null
  regular_price?: number | string | null
  sale_price?: number | string | null
  images: ProductImage[]
  table_price?: PriceTableRow[]
  reviews?: Review[]
  categories?: SimpleItem[]
  display_euro_price?: boolean | number | null
  euro_price?: number | string | null
  manufacturers?: SimpleItem[]
  brands?: SimpleItem[]
  sku?: string | null
  mpn?: string | null
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
  requires_serial?: boolean | null
  canonical_slug?: string | null
  related_versions?: MiniProduct[]
}

/* ---------------- Base setup ---------------- */
const route = useRoute()
const { t: _t, localeProperties } = useI18n()
const t = (key: string, fallback?: string) => {
  const out = _t(key) as string
  return out === key ? (fallback ?? key) : out
}
const dir = computed(() => localeProperties.value.dir || 'ltr')
const localePath = useLocalePath()

const runtime = useRuntimeConfig()
const API_BASE_URL = runtime.public.API_BASE_URL as string
const PUBLIC_BASE = (runtime.public.SITE_URL as string) || 'https://www.tlkeys.com'
const baseSiteUrl = computed(() => PUBLIC_BASE.replace(/\/+$/, ''))
const absUrl = computed(() => baseSiteUrl.value + route.path)

const { $customApi } = useNuxtApp()

const { currency, formatMoney } = useCurrency()
const cart = useCart()
const wishlist = useWishlist()
const alerts = useAlertStore()
const slug = computed(() => route.params.slug as string)

/* WhatsApp helper */
const WHATSAPP_NUMBER: string = (runtime.public.WHATSAPP_NUMBER as string) || '971504429045'
function waLinkForProduct(p?: Product | null) {
  const title = (p?.title || '').trim()
  const sku = (p?.sku || '').toString().trim()
  const tpl = _t('search.askAboutProduct','Can I get more information and price for "{title}{sku}"?') as string
  const titleWithSku = sku ? `${title} (SKU: ${sku})` : title
  let msg: string
  if (tpl.includes('{title}') || tpl.includes('{sku}')) {
    if (tpl.includes('{title}') && !tpl.includes('{sku}')) msg = tpl.replace('{title}', titleWithSku)
    else msg = tpl.replace('{title}', title).replace('{sku}', sku ? ` (SKU: ${sku})` : '')
  } else {
    msg = titleWithSku ? `${tpl} ${titleWithSku}` : tpl
  }
  return `https://api.whatsapp.com/send?phone=${encodeURIComponent(WHATSAPP_NUMBER)}&text=${encodeURIComponent(msg)}`
}

const abs = (u?: string | null) => {
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  const clean = u.startsWith('/') ? u : `/${u}`
  return `${baseSiteUrl.value}${clean}`
}

const primaryImageAbs = computed(() => {
  const p = product.value
  const rawImgs = (p?.images || []).map(i => i?.src).filter(Boolean) as string[]
  return abs(rawImgs[0] || p?.image || '')
})

const showBuyNow = computed(() => showAddToCartUI.value)
const buying = ref(false)

async function onBuyNow() {
  if (!product.value || !showBuyNow.value) return
  if (requiresSerial.value && serial.value.trim() === '') {
    alerts.showAlert({
      type: 'error',
      title: t('product.serialRequiredTitle','Serial number required'),
      message: t('product.serialRequiredMsg','Please enter a valid serial number before continuing.')
    })
    return
  }

  /* --- INP FIX START --- */
  buying.value = true
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
  /* --- INP FIX END --- */

  try {
    const p = product.value
    const query: Record<string, string> = {
      mode: 'buy-now',
      pid: String(p.id),
      pslug: String(p.slug || ''),
      qty: String(Math.max(1, Number(qty.value || 1))),
    }
    if (requiresSerial.value) query.serial = serial.value.trim()
    await navigateTo({ path: localePath('/custom-checkout'), query })
  } catch (e) {
    console.error(e)
  } finally {
    buying.value = false
  }
}

/* ---------------- URL / PATH HELPERS ---------------- */
const slugToPath = (s?: string | null) => {
  if (!s) return '/products/'
  const cleaned = String(s).trim().replace(/^\/+/, '')
  return `/products/${encodeURIComponent(cleaned)}`
}

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
const toNum = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null }
const isPercentOrFixed = (t: any): t is 'percent' | 'fixed' => t === 'percent' || t === 'fixed'
const nameToPath = (s?: string | null) => {
  if (!s) return '/'
  const cleaned = s.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, '')
  return `/${encodeURIComponent(cleaned)}`
}

const now = ref(Date.now())

/* ---------------- SSR fetch & normalize ---------------- */
const { data: ssr, pending: loading, error } = await useAsyncData(
  () => `product:${slug.value}`,
  async () => {
    const endpoint =
      `${API_BASE_URL}/products/slug/${encodeURIComponent(slug.value)}` +
      `?include=images,table_price,description,reviews,categories,manufacturers,brands,meta_title,meta_description,discount,accessories,bundles,attributes,faq,videos,compatibility,related_versions`

    try {
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

      const basePrice = toNum(data.price) ?? toNum(data.regular_price) ?? 0
      const faqRaw    = (data?.faq?.data ?? data?.faq) || []
      const videosRaw = (data?.videos?.data ?? data?.videos) || []

      // PERFORMANCE: markRaw for heavy static lists to avoid deep reactivity overhead
      const compatibilityList = Array.isArray(data.compatibility) ? data.compatibility : []
      const attributesList = Array.isArray(data.attributes) ? data.attributes : []
      
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
        display_euro_price: Number(data.display_euro_price ?? 0) === 1,
        euro_price: toNum(data.euro_price),
        canonical_slug: data.canonical_slug ?? data.slug,
        hide_price: Number(data.hide_price ?? 0) === 1,
        requires_serial: Boolean(data.requires_serial ?? false),
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
        mpn: data.mpn ?? null,
        min_purchase_qty: Number(data.min_purchase_qty ?? 1),
        quantity: data.quantity ?? null,
        discount_type:  active ? discType : null,
        discount_value: active ? discValue : null,
        discount_start: startISO,
        discount_end:   endISO,
        discount_active: active,
        accessories: Array.isArray(data.accessories) ? data.accessories : [],
        bundles: Array.isArray(data.bundles) ? data.bundles : [],
        
        attributes: markRaw(attributesList),     // Shallow Reactivity Fix
        compatibility: markRaw(compatibilityList), // Shallow Reactivity Fix
        
        faq: Array.isArray(faqRaw)
          ? faqRaw.map((x: any) => ({ q: String(x.q ?? x.question ?? ''), a: String(x.a ?? x.answer ?? '') }))
          : [],
        videos: Array.isArray(videosRaw)
          ? videosRaw.map((x: any) => ({ title: x.title ?? null, url: String(x.url ?? x.link ?? '') }))
          : [],
        related_versions: Array.isArray(data.related_versions) ? data.related_versions : []
      }
      return product
    } catch (err: any) {
      const status  = err?.response?.status ?? err?.status ?? 500
      const message =
        err?.response?._data?.message ||
        err?.message ||
        (status === 404
          ? t('errors.productNotFound','Product not found')
          : status === 410
          ? t('errors.productGone','This product is no longer available.')
          : t('errors.generic','Error'))
      throw createError({ statusCode: status, statusMessage: message, fatal: true })
    }
  },
  { server: true, default: () => null, watch: [() => slug.value] }
)

if (process.server && error.value) {
  const statusCode    = (error.value as any)?.statusCode ?? (error.value as any)?.status ?? 500
  const statusMessage = (error.value as any)?.statusMessage ?? (error.value as any)?.message ?? t('errors.generic','Error')
  throw createError({ statusCode, statusMessage })
}

const product = computed<Product | null>(() => ssr.value)

const hidePrice = computed(() => Boolean(product.value?.hide_price))
const isPinCodeOffline = computed(() =>
  (product.value?.categories || []).some(c =>
    String(c?.name || (c as any)?.title || '').trim().toLowerCase() === 'pin code offline'
  )
)
const showPriceBlock   = computed(() => isPinCodeOffline.value || !hidePrice.value)
const showQtyUI        = computed(() => !hidePrice.value && !isPinCodeOffline.value)
const showAddToCartUI  = computed(() => !hidePrice.value && !isPinCodeOffline.value)
const hideCart         = computed(() => hidePrice.value || isPinCodeOffline.value)
const showWishlistUI   = computed(() => showAddToCartUI.value)
const requiresSerial = computed(() => Boolean(product.value?.requires_serial))
const serial = ref('')
const canAddToCart = computed(() => !requiresSerial.value || serial.value.trim().length > 0)

/* ---------------- OPTIMIZED SEO BREADCRUMB ---------------- */
const breadcrumb = computed(() => {
  const items: { label: string; to?: string }[] = [{ label: t('breadcrumbs.home','Home'), to: '/' }]
  
  const cat = (product.value?.categories || [])[0]
  if (cat) {
    const label = (cat.name || (cat as any).title || '').trim()
    if (label) {
       items.push({ 
         label, 
         to: cat.slug ? `/${cat.slug}` : nameToPath(label) 
       })
    }
  }

  items.push({ 
    label: product.value?.short_title || product.value?.title || t('product.product','Product'),
    to: undefined 
  })

  return items
})

function makeLinks<T extends { slug?: string; name?: string; title?: string }>(
  src: T[] | undefined | null
) {
  const out: { label: string; to: string }[] = []
  const seen = new Set<string>()

  for (const row of src || []) {
    const label = (row.name ?? (row as any)?.title ?? '').trim()
    if (!label) continue
    const to = row.slug ? `/${encodeURIComponent(row.slug)}` : nameToPath(label)
    const key = to.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ label, to })
  }
  return out
}
const categoryLinks     = computed(() => makeLinks(product.value?.categories))
const manufacturerLinks = computed(() => makeLinks(product.value?.manufacturers))
const brandLinks        = computed(() => makeLinks(product.value?.brands))

/* qty */
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

/* live price */
const rawFallback = computed(() => {
  const p = product.value as any
  return p ? (toNum(p.sale_price) ?? toNum(p.price) ?? toNum(p.regular_price) ?? 0) : 0
})
const unitPrice = computed(() => {
  if (!product.value) return 0
  if (useEuro.value) {
    const base = toNum(product.value!.euro_price) ?? 0
    const dtype = product.value!.discount_type
    const dval  = toNum(product.value!.discount_value)
    const hasActive = !!product.value!.discount_active && (dtype === 'fixed' || dtype === 'percent') && (dval ?? 0) > 0
    if (!hasActive) return base
    if (dtype === 'fixed') return Math.max(0, base - (dval as number))
    if (dtype === 'percent') return Math.max(0, base * (1 - (dval as number) / 100))
    return base
  }
  const base = computeUnitPrice(product.value as any, qty.value).unit
  let unit = base > 0 ? base : (rawFallback.value || 0)
  const noPromo = unitWithoutDiscount.value
  const dtype = product.value.discount_type
  const dval  = toNum(product.value.discount_value)
  const hasActive = !!product.value.discount_active && (dtype === 'fixed' || dtype === 'percent') && (dval ?? 0) > 0
  const helperMissedIt = unit >= noPromo - 1e-9
  if (hasActive && helperMissedIt) {
    if (dtype === 'fixed')   unit = Math.max(0, unit - (dval as number))
    if (dtype === 'percent') unit = Math.max(0, unit * (1 - (dval as number) / 100))
  }
  return unit
})

const unitWithoutDiscount = computed(() => {
  if (!product.value) return 0
  if (useEuro.value) return 0 
  const forcedBase = (typeof product.value.regular_price === 'number' && product.value.regular_price > 0) ? product.value.regular_price : Number(product.value.price || 0)
  const p: any = {
    ...(product.value as any),
    discount_type: null, discount_value: null, sale_price: null, price: forcedBase,
    table_price: Array.isArray(product.value.table_price) ? product.value.table_price.map(r => ({ ...r, sale_price: null })) : null,
  }
  return computeUnitPrice(p, qty.value).unit
})

const displayPrice = computed(() => {
  if (!product.value) return { current: 0, old: null as number | null }
  if (useEuro.value) {
    const base = toNum(product.value!.euro_price) ?? 0
    const dtype = product.value!.discount_type
    const dval  = toNum(product.value!.discount_value)
    const hasActive = !!product.value!.discount_active && (dtype === 'fixed' || dtype === 'percent') && (dval ?? 0) > 0
    let current = base
    let old: number | null = null
    if (hasActive && base > 0) {
      if (dtype === 'fixed') current = Math.max(0, base - (dval as number))
      else if (dtype === 'percent') current = Math.max(0, base * (1 - (dval as number) / 100))
      old = base
    }
    return { current, old }
  }
  const current = unitPrice.value
  const old = current < unitWithoutDiscount.value ? unitWithoutDiscount.value : null
  return { current, old }
})

const hasDiscountNow    = computed(() => !!displayPrice.value.old && displayPrice.value.old > displayPrice.value.current)
const discountAmountNow = computed(() => hasDiscountNow.value ? (displayPrice.value.old! - displayPrice.value.current) : 0)
const hasTablePrice     = computed(() => Array.isArray(product.value?.table_price) && product.value!.table_price!.length > 0)

/* countdown */
let timer: any = null
onMounted(() => { timer = setInterval(() => (now.value = Date.now()), 1000) })
onUnmounted(() => { if (timer) clearInterval(timer) })

/* actions */
const adding = ref(false)
const wishing = ref(false)
const inWish = computed(() => product.value ? wishlist.isInWishlist(String(product.value.id)) : false)
const useEuro = computed(() => !!product.value?.display_euro_price && toNum(product.value?.euro_price) != null)

const formatDisplayMoney = (amount: number | null | undefined) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: useEuro.value ? 'EUR' : (currency.value || 'USD') }).format(Number(amount || 0))

async function onAddToCart() {
  if (!product.value) return
  if (hideCart.value) return
  if (requiresSerial.value && serial.value.trim() === '') {
    alerts.showAlert({
      type: 'error',
      title: t('product.serialRequiredTitle','Serial number required'),
      message: t('product.serialRequiredMsg','Please enter a valid serial number before adding to cart.')
    })
    return
  }

  /* --- INP FIX START --- */
  adding.value = true
  await nextTick() 
  await new Promise(resolve => setTimeout(resolve, 0))
  /* --- INP FIX END --- */

  try {
    const p = product.value
    const unit = unitPrice.value
    const euroToSend = useEuro.value ? unit : (toNum(p.euro_price) ?? null)
    
    await cart.add(p.id, qty.value, {
      title: p.title,
      image: p.image || p.images?.[0]?.src,
      sku: p.sku || undefined,
      slug: p.slug,
      price: unit,
      regular_price: toNum(p.regular_price),
      sale_price: toNum(p.sale_price),
      table_price: Array.isArray(p.table_price) ? p.table_price : null,
      euro_price: euroToSend,
      display_euro_price: p.display_euro_price,
      discount_type: p.discount_type ?? null,
      discount_value: toNum(p.discount_value),
      priceSnapshot: unit,
      stock: typeof p.quantity === 'number' ? p.quantity : null,
      serial_number: requiresSerial.value ? [serial.value.trim()] : null,
    })
  } catch (e) {
    console.error(e)
  } finally {
    adding.value = false
  }
}

async function onToggleWishlist() {
  if (!product.value || !showWishlistUI.value) return
  try {
    wishing.value = true
    const p = product.value
    const { unit } = computeUnitPrice(p as any, Math.max(1, Number(qty.value || 1)))
    const snapshotPrice = unit > 0 ? unit : (toNum(p.sale_price) ?? toNum(p.price) ?? toNum(p.regular_price) ?? 0)
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
  } finally { wishing.value = false }
}

/* tabs */
const TAB_DEFS = [
  { key: 'desc',    k: 'tabs.description', fb: 'Description' },
  { key: 'reviews', k: 'tabs.reviews',     fb: 'Reviews' },
  { key: 'faq',     k: 'tabs.faq',         fb: 'FAQ' },
  { key: 'videos',  k: 'tabs.videos',      fb: 'Videos' },
  { key: 'contact', k: 'tabs.contact',     fb: 'Contact' }
] as const
type TabKey = typeof TAB_DEFS[number]['key']
const tabs = computed(() => TAB_DEFS.map(d => ({ key: d.key, label: t(d.k, d.fb) })))
const activeTab = ref<TabKey>('desc')
function setTab(k: TabKey) { activeTab.value = k }

// --- Canonical helpers ---
const canonicalSlug = computed(() => product.value?.canonical_slug || product.value?.slug || slug.value)
const canonicalPath = computed(() => {
  const want = String(canonicalSlug.value || '').trim()
  const rawPath = want ? `/products/${encodeURIComponent(want)}` : route.path
  return localePath(rawPath)
})
const canonicalAbsUrl = computed(() => baseSiteUrl.value + canonicalPath.value)

/* head/meta */
useHead(() => {
  const p = product.value
  const stripHtml = (html?: string | null) => (html || '').toString().replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const title = p?.meta_title || (p?.title || '')
  const desc  = p?.meta_description || stripHtml(p?.description || '')
  const primary = primaryImageAbs.value || ''
  const gallery = primary ? [primary, ...((p?.images || []).slice(1).map(i => abs(i.src)))] : []

  let aggregateRating: any = null
  const reviewsLd = Array.isArray(p?.reviews) && p!.reviews!.length
      ? p!.reviews!.filter(r => r && (r.content || Number.isFinite(Number(r.rating)))).map(r => ({
            '@type': 'Review',
            author: r.author_name || 'Customer',
            reviewBody: r.content ? stripHtml(r.content) : undefined,
            reviewRating: Number.isFinite(Number(r.rating)) ? { '@type': 'Rating', ratingValue: Number(r.rating) } : undefined,
            datePublished: r.created_at || undefined
          }))
      : undefined
  if (Array.isArray(p?.reviews) && p!.reviews!.length) {
    const rated = p!.reviews!.map(r => Number(r?.rating)).filter(n => Number.isFinite(n))
    if (rated.length) {
      const avg = rated.reduce((a, b) => a + b, 0) / rated.length
      aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(avg.toFixed(2)), reviewCount: rated.length }
    }
  }

  const cur = currency.value || 'USD'
  const qtyNum = Number(p?.quantity ?? 0)
  const availability = qtyNum > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  const regularPrice = Number(p?.regular_price || p?.price || 0)
  const effectivePrice = Number((typeof p?.sale_price === 'number' && p.sale_price > 0 ? p.sale_price : regularPrice) || 0)
  const tp = p?.table_price || []
  let offersSchema: any

  if (tp.length > 0) {
    const prices = tp.map(r => Number(r.sale_price || r.price)).filter(n => n > 0)
    prices.push(effectivePrice)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    offersSchema = {
      '@type': 'AggregateOffer', priceCurrency: cur, lowPrice: minPrice.toFixed(2), highPrice: maxPrice.toFixed(2), offerCount: tp.length, availability
    }
  } else {
    offersSchema = {
      '@type': 'Offer', url: absUrl.value, priceCurrency: cur, price: Math.max(0, effectivePrice).toFixed(2), availability, sku: p?.sku || undefined,
      priceValidUntil: p?.discount_active && p?.discount_end ? p.discount_end : undefined
    }
  }

  const brandName = (p?.brands && p.brands[0] && (p.brands[0].name || (p.brands[0] as any).title)) || (p?.manufacturers && p.manufacturers[0] && (p.manufacturers[0].title || p.manufacturers[0].name)) || undefined

  const productLd: any = p && {
    '@type': 'Product', '@id': absUrl.value + '#product', name: title, description: desc, image: gallery.length ? gallery : undefined,
    sku: p.sku || undefined, mpn: p.mpn || undefined, brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
    category: (p?.categories && p.categories[0] && (p.categories[0].name || p.categories[0].title)) || undefined,
    offers: offersSchema, aggregateRating, review: reviewsLd
  }

  const breadcrumbLd = breadcrumb.value && breadcrumb.value.length ? {
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumb.value.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.label,
      item: b.to ? (baseSiteUrl.value + localePath(b.to)) : absUrl.value
    }))
  } : undefined

  const faqs = Array.isArray(p?.faq) ? p!.faq!.filter(f => f && (f.q || f.a)).map(f => ({ '@type': 'Question', name: stripHtml(f.q || ''), acceptedAnswer: { '@type': 'Answer', text: stripHtml(f.a || '') } })) : []
  const faqLd = faqs.length ? { '@type': 'FAQPage', '@id': absUrl.value + '#faq', mainEntity: faqs } : undefined
  const graph = [productLd, breadcrumbLd, faqLd].filter(Boolean)

  return {
    title,
    meta: [
      { name: 'description', content: desc },
      { property: 'og:type', content: 'product' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: desc },
      ...(primary ? [{ property: 'og:image', content: primary }] : []),
      { property: 'og:url', content: absUrl.value },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: desc },
      ...(primary ? [{ name: 'twitter:image', content: primary }] : []),
      { name: 'robots', content: 'index,follow,max-image-preview:large' }
    ],
    link: [
      { rel: 'canonical', href: canonicalAbsUrl },
      ...(primary ? [{
          rel: 'preload',
          as: 'image',
          href: primary,
          imagesrcset: `${primary}?w=400 400w, ${primary}?w=800 800w, ${primary} 1200w`,
          imagesizes: '(max-width: 640px) 100vw, 50vw',
          fetchpriority: 'high'
      } as any] : [])
    ],
    script: graph.length ? [{ id: 'ld-json', type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }] : []
  }
})

/* ---------------- Related products (lazy) ---------------- */
type GridProduct = { id: number | string; name: string; image: string; price: number; oldPrice?: number | null; slug?: string; href?: string; sku?: string | null; category?: string | null; hide_price?: boolean | number | null; display_euro_price?: boolean | number | null; euro_price?: number | null }
const relatedProducts   = ref<GridProduct[]>([])
const relatedLoading    = ref(false)
const relatedError      = ref<string | null>(null)
const relatedTriggered  = ref(false)
const relatedSentinel   = ref<HTMLElement | null>(null)
let relatedIO: IntersectionObserver | null = null

function normRelatedItem(x: any): GridProduct | null {
  if (!x) return null
  const id   = x.id ?? x.product_id
  const name = String(x.title ?? x.name ?? '')
  const img  = x.image || x.images?.[0]?.src || ''
  const price = Number((typeof x.sale_price === 'number' && x.sale_price > 0 ? x.sale_price : typeof x.price === 'number' && x.price > 0 ? x.price : x.regular_price) ?? 0)
  const old = (x.regular_price && Number(x.regular_price) > price) ? Number(x.regular_price) : null
  return { id, name, image: img, price, oldPrice: old, slug: x.slug, sku: x.sku, hide_price: x.hide_price ?? null }
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
    if (!catIds.length && !manuIds.length && !brandIds.length) { relatedProducts.value = []; return }
    const body = { exclude_id: product.value.id, categories: catIds, manufacturers: manuIds, brands: brandIds, limit: 24 }
    const res = await $customApi(`${API_BASE_URL}/products/related`, { method: 'POST', body })
    const rows: any[] = (res?.data ?? res ?? []) as any[]
    relatedProducts.value = rows.map(normRelatedItem).filter(Boolean) as GridProduct[]
  } catch (e: any) { relatedError.value = t('product.failedToLoadRelated','Failed to load related products') } finally { relatedLoading.value = false }
}

onMounted(() => {
  if (!process.client) return
  relatedIO = new IntersectionObserver((entries) => { if (entries.some(e => e.isIntersecting)) fetchRelatedOnce() }, { rootMargin: '0px 0px 200px 0px' })
  if (relatedSentinel.value) relatedIO.observe(relatedSentinel.value)
})
onUnmounted(() => { relatedIO?.disconnect(); relatedIO = null })
watch(() => product.value?.id, () => {
  relatedProducts.value = []; relatedError.value = null; relatedLoading.value = false; relatedTriggered.value = false
  if (process.client && relatedSentinel.value && relatedIO) relatedIO.observe(relatedSentinel.value)
})
</script>

<template>
  <div class="container mx-auto px-4 py-8 lg:py-10" :dir="dir">
    <nav aria-label="Breadcrumb" class="mb-5">
      <ol class="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        <li v-for="(c, i) in breadcrumb" :key="i" class="flex items-center gap-1">
          <NuxtLinkLocale v-if="c.to" :to="c.to" class="text-gray-600 hover:text-gray-900 hover:underline transition">
            {{ c.label }}
          </NuxtLinkLocale>
          <span v-else class="text-gray-700 font-medium">{{ c.label }}</span>
          <span v-if="i < breadcrumb.length - 1" class="px-1 text-gray-300">/</span>
        </li>
      </ol>
    </nav>

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

    <div v-else-if="product" class="space-y-8">
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <div class="lg:order-1">
          <ProductGallery
            :images="product.images"
            :maxWidth="680"
            :maxHeight="520"
            :sku="product.sku"
            :discount-ends-at="product.discount_active ? product.discount_end : null"
            :discount-amount="hasDiscountNow ? discountAmountNow : 0"
            :hero-canonical="primaryImageAbs"
          />
        </div>

        <div class="lg:order-2">
          <div class="lg:sticky lg:top-24 space-y-6">
            <div class="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur p-6 shadow-sm">
              <h1 class="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
                {{ product.title }}
              </h1>
              <p v-if="product.summary_name" class="mt-5 mb-2 text-base text-green-800 text-gray-600">
                <span v-html="product.summary_name"></span>
              </p>
              <hr />
              <div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span v-if="product.sku" class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 border border-emerald-200">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> {{ t('labels.sku','SKU') }}: {{ product.sku }}
                </span>

                <h2 v-if="product.mpn" class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700 border border-blue-200">
                  <span class="h-1.5 w-1.5 rounded-full bg-blue-500"></span> {{ t('labels.mpn','MPN') }}: {{ product.mpn }}
                </h2>
              </div>

              <div class="mt-5 space-y-3 text-sm">
                <div v-if="categoryLinks.length">
                  <div class="mb-1 text-gray-500">{{ t('labels.categories','Categories') }}</div>
                  <div class="flex flex-wrap gap-2">
                    <NuxtLinkLocale v-for="c in categoryLinks" :key="c.to" :to="c.to"
                      class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 hover:bg-white hover:shadow-sm transition">
                      {{ c.label }}
                    </NuxtLinkLocale>
                  </div>
                </div>
                <div v-if="manufacturerLinks.length">
                  <div class="mb-1 text-gray-500">{{ t('labels.manufacturers','Manufacturers') }}</div>
                  <div class="flex flex-wrap gap-2">
                    <NuxtLinkLocale v-for="m in manufacturerLinks" :key="m.to" :to="m.to"
                      class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 hover:bg-white hover:shadow-sm transition">
                      {{ m.label }}
                    </NuxtLinkLocale>
                  </div>
                </div>
                <div v-if="brandLinks.length">
                  <div class="mb-1 text-gray-500">{{ t('labels.brands','Brands') }}</div>
                  <div class="flex flex-wrap gap-2">
                    <NuxtLinkLocale v-for="b in brandLinks" :key="b.to" :to="b.to"
                      class="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 hover:bg-white hover:shadow-sm transition">
                      {{ b.label }}
                    </NuxtLinkLocale>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div :class="hasTablePrice ? '' : 'lg:col-span-2'">
                  <div v-if="showPriceBlock && displayPrice.current > 0" class="flex items-end gap-3">
                    <span class="text-[28px] md:text-4xl text-red-600 font-bold tracking-tight">
                      {{ formatDisplayMoney(displayPrice.current) }}
                    </span>
                    <span v-if="displayPrice.old" class="text-lg text-gray-500 line-through">
                      {{ formatDisplayMoney(displayPrice.old) }}
                    </span>
                  </div>

                  <div v-if="product.related_versions && product.related_versions.length > 0" class="mt-6 mb-6">
                    <p class="mb-3 text-sm font-medium text-gray-700">
                      {{ t('product.availableVersions', 'Available Versions:') }}
                    </p>
                    
                    <div class="flex flex-wrap gap-3">
                      <div class="relative w-full sm:w-auto min-w-[160px] max-w-[240px] rounded-xl border-2 border-orange-500 bg-orange-50 p-4 cursor-default transition-all shadow-sm ring-1 ring-orange-200">
                        <div class="absolute -top-2.5 left-3 bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white rounded">
                          {{ t('product.selected', 'Selected') }}
                        </div>
                        
                        <div class="flex items-center gap-4">
                          <NuxtImg 
                            :src="product.images?.[0]?.src || '/images/placeholder.webp'" 
                            width="64"
                            height="64"
                            format="webp"
                            class="h-16 w-16 rounded-lg object-contain border border-orange-200 bg-white p-1" 
                            alt=""
                          />
                          <div class="flex flex-col">
                            <span class="text-xs font-bold text-orange-900 line-clamp-4 leading-tight">
                              {{ product.short_title || product.title }}
                            </span>
                            <span v-if="displayPrice.current > 0" class="mt-1 text-sm font-bold text-orange-700">
                              {{ formatDisplayMoney(displayPrice.current) }}
                            </span>
                          </div>
                        </div>
                      </div>

                      <NuxtLinkLocale
                        v-for="ver in product.related_versions"
                        :key="ver.id"
                        :to="slugToPath(ver.slug)"
                        class="group relative w-full sm:w-auto min-w-[160px] max-w-[240px] rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-400 hover:shadow-md transition-all"
                      >
                        <div class="flex items-center gap-4">
                           <NuxtImg 
                            :src="ver.image || '/images/placeholder.webp'" 
                            width="64"
                            height="64"
                            format="webp"
                            loading="lazy"
                            class="h-16 w-16 rounded-lg object-contain border border-gray-100 bg-gray-50 p-1 group-hover:opacity-80 transition" 
                            :alt="ver.title"
                          />
                          <div class="flex flex-col">
                            <span class="text-xs font-medium text-gray-700 group-hover:text-blue-600 line-clamp-4 leading-tight transition">
                              {{ ver.title }}
                            </span>
                            <div class="mt-1 flex gap-2 text-xs">
                                <span v-if="(ver.sale_price || ver.price || ver.regular_price) > 0" class="text-sm font-semibold text-gray-900">
                                  {{ formatDisplayMoney(ver.sale_price || ver.price || ver.regular_price) }}
                                </span>
                            </div>
                          </div>
                        </div>
                      </NuxtLinkLocale>
                    </div>
                  </div>
                  <a
                    v-if="hidePrice || isPinCodeOffline"
                    :href="waLinkForProduct(product)"
                    target="_blank"
                    rel="noopener"
                    class="mt-3 inline-flex items-center gap-2 rounded-lg border border-green-600 bg-green-700 text-white hover:text-white hover:bg-green-800 px-3 py-3 font-semibold"
                    :aria-label="_t('search.contactOnWhatsApp','Contact on WhatsApp')"
                  >
                    <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20.52 3.48A11.94 11.94 0 0 0 12 0C5.39 0 0 5.39 0 12c0 2.11.55 4.1 1.61 5.89L0 24l6.26-1.64A11.96 11.96 0 0 0 12 24c6.61 0 12-5.39 12-12 0-3.2-1.25-6.21-3.48-8.52zM12 22a9.93 9.93 0 0 1-5.07-1.39l-.36-.21-3.71.97.99-3.62-.23-.37A9.93 9.93 0 0 1 2 12C2 6.49 6.49 2 12 2s10 4.49 10 10-4.49 10-10 10zm5.55-7.46c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.23-.65.08a8.2 8.2 0 0 1-2.41-1.49 9.05 9.05 0 0 1-1.68-2.08c-.17-.3 0-.46.13-.61.13-.13.3-.35.46-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.62-.93-2.22-.25-.6-.5-.51-.68-.51h-.58c-.2 0-.53.08-.83.38-.3.3-1.08 1.05-1.08 2.56 0 1.51 1.1 2.97 1.25 3.18.15.2 2.17 3.31 5.26 4.63.74.32 1.32.51 1.77.65.74.24 1.41.2 1.94.12.59-.09 1.78-.73 2.03-1.45.25-.73.25-1.35.18-1.48-.07-.13-.27-.2-.57-.35z"/>
                    </svg>
                    {{ _t('search.contactOnWhatsApp','Contact on WhatsApp') }}
                  </a>

                  <div v-if="showQtyUI" class="mt-5 flex flex-wrap items-center gap-3" data-nosnippet>
                    <div class="inline-flex items-stretch rounded-xl border border-gray-300 bg-white overflow-hidden">
                      <button
                        type="button"
                        class="px-3 py-2 hover:bg-gray-50 disabled:opacity-40"
                        :disabled="!canDecrement"
                        @click="dec"
                        :aria-label="_t('a11y.decreaseQty','Decrease quantity')"
                      >−</button>

                      <input
                        class="w-16 text-center py-2 outline-none"
                        type="number"
                        :min="minQty"
                        v-model.number="qty"
                        inputmode="numeric"
                        :aria-label="_t('a11y.quantity','Quantity')"
                      />

                      <button
                        type="button"
                        class="px-3 py-2 hover:bg-gray-50"
                        @click="inc"
                        :aria-label="_t('a11y.increaseQty','Increase quantity')"
                      >+</button>
                    </div>
                    <span class="text-sm text-gray-500">{{ _t('product.min','Min:') }} {{ minQty }}</span>
                  </div>

                  <div v-if="requiresSerial && showQtyUI" class="mt-3">
                    <label class="block text-sm font-medium text-gray-700 mb-1">{{ _t('product.serial','Serial Number') }}</label>
                    <input
                      v-model.trim="serial"
                      type="text"
                      class="w-full max-w-md rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-4 focus:ring-orange-200"
                      :placeholder="_t('product.serialPlaceholder','Enter your serial number')"
                    />
                    <p v-if="!serial" class="mt-1 text-xs text-gray-500">{{ _t('product.serialRequired','Required for this product.') }}</p>
                  </div>

                  <div class="mt-5 flex flex-wrap items-center gap-3" data-nosnippet>
                    <button
                      v-if="showAddToCartUI"
                      type="button"
                      class="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-medium text-white shadow-sm hover:bg-orange-600 focus-visible:ring-4 focus-visible:ring-orange-200 disabled:opacity-60"
                      :disabled="adding || !canAddToCart"
                      @click="onAddToCart"
                    >
                      <span v-if="!adding">{{ _t('product.addToCart','Add to Cart') }}</span>
                      <span v-else>{{ _t('product.adding','Adding…') }}</span>
                    </button>

                    <button
                      v-if="showWishlistUI"
                      type="button"
                      class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus-visible:ring-4 focus-visible:ring-gray-200 disabled:opacity-60"
                      :disabled="wishing"
                      @click="onToggleWishlist"
                    >
                      <span v-if="!wishing">
                        {{ inWish ? _t('product.removeFromWishlist','Remove from Wishlist') : _t('product.addToWishlist','Add to Wishlist') }}
                      </span>
                      <span v-else>{{ _t('product.saving','Saving…') }}</span>
                    </button>

                    <button
                      v-if="showBuyNow"
                      type="button"
                      class="inline-flex items-center justify-center gap-2 rounded-xl border border-[#FFC439] bg-[#FFC439] px-6 py-3 font-semibold text-[#003087] shadow-sm hover:bg-[#FFB300] focus-visible:ring-4 focus-visible:ring-[#FFDD00]/40 disabled:opacity-60"
                      :disabled="buying || !canAddToCart"
                      @click="onBuyNow"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" class="h-5 w-5">
                        <path fill="#003087" d="M25.6 6H13.8c-.9 0-1.6.6-1.8 1.4L9 27.8c-.1.5.3.9.8.9h5.1l.6-4.1c.1-.8.9-1.4 1.8-1.4h3.8c7.1 0 11.2-3.4 12.3-10.1.5-3.1-.1-5.5-1.9-7.1C30.2 6.6 28.1 6 25.6 6z"/>
                        <path fill="#009CDE" d="M26.4 9.4c-.5 2.9-2.8 4.6-6.2 4.6h-3.8c-.9 0-1.6.6-1.8 1.4l-1.6 11.2-.3 2.1c-.1.5.3.9.8.9h4.4c.9 0 1.6-.6 1.8-1.4l.5-3.4h3.8c5.3 0 8.8-2.7 9.8-7.9.9-4.5-.7-7.5-4.4-8.9-.9-.3-2.3-.6-3-.6z"/>
                      </svg>
                      <span v-if="!buying">{{ _t('product.buyNow','Buy now') }}</span>
                      <span v-else>{{ _t('product.processing','Processing…') }}</span>
                    </button>

                  </div>
                </div>

                <div v-if="hasTablePrice" class="lg:pl-6 lg:border-l border-gray-100">
                  <ProductPriceTable
                    :rows="product!.table_price!"
                    :currency="currency.value"
                    :compact="true"
                    :title="_t('product.quantityPricing','Quantity Pricing')"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <ProductRelatedGrid v-if="product?.accessories?.length" :title="t('product.accessories','Accessories')" :items="product!.accessories!" />

      <ProductRelatedGrid v-if="product?.bundles?.length" class="mt-4" :title="t('product.bundleProducts','Bundle Products')" :items="product!.bundles!" />

      <ProductAttributesTable v-if="product?.attributes?.length" :groups="product!.attributes!" />

      <ProductCompatibilityTable v-if="product?.compatibility?.length" :rows="product!.compatibility!" :title="t('product.compatibility','Compatibility')" />

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
              :api-base-url="API_BASE_URL"
              :product-id="product.id"
              :product-slug="product.slug"
              :sku="product.sku"
              :whatsapp="`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(_t('contact.whatsappPrefill','Hello, I want to inquire about the product with SKU: {sku}').replace('{sku}', product.sku ?? ''))}`"
              data-nosnippet
            />
          </div>
        </div>
      </section>

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
          :title="t('product.relatedProducts','Related Products')"
          :products="relatedProducts"
          :rowsBase="1" :rowsSm="1" :rowsMd="1" :rowsLg="1" :rowsXl="1"
          :perRowBase="2" :perRowSm="2" :perRowMd="3" :perRowLg="4" :perRowXl="6"
          :showArrows="true" :showDots="true"
          @add-to-cart="(p) => { if (!p.hide_price) cart.add(p.id, 1, { title: p.name, image: p.image, slug: p.slug, price: p.price }) }"
        />
      </section>
    </div>

    <div v-else>
      <ClientOnly>
        <div v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {{ (error as any)?.message || t('errors.generic','Error') }}
        </div>
      </ClientOnly>
    </div>
  </div>
</template>