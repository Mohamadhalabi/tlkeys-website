<script setup lang="ts">
import {
  ref, reactive, computed, watch, watchEffect,
  onMounted, onBeforeUnmount, onUnmounted, nextTick
} from 'vue'
import ProductGrid from '~/components/products/ProductGrid.vue'
import { buildCatalogParams } from '~/composables/useCatalog'

const props = defineProps<{
  initialFilters?: {
    brands?: string[]
    categories?: string[]
    manufacturers?: string[]
    models?: string[]
  }
}>()

const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp()
const route = useRoute()
const router = useRouter()

// i18n (safe if auto-import is disabled)
const i18nApi = (useI18n?.() as any) || null
const t = i18nApi?.t ?? ((s: string) => s)
const localeProperties = i18nApi?.localeProperties ?? computed(() => ({ dir: 'ltr' }))

/* ---------- helpers ---------- */
const SHOP_PATH = '/shop'
const managedKeys = ['brands','categories','manufacturers','models','q','search','sort','page','per_page'] as const

// flags we forward to the API if present in the URL
const flagKeys = ['offers','promotion','free-shipping','bundled','new-arrival'] as const

// stable key that changes whenever path or query changes
const routeKey = computed(() => {
  const parts = Object.entries(route.query)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${Array.isArray(v)? v.join(',') : (v ?? '')}`)
    .join('&')
  return `${route.path}?${parts}`
})
const gridKey = computed(() => routeKey.value)

function parseCsv(v: unknown): string[] {
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean)
  return []
}
function prettify(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
}
function parsePerPage(v: unknown): number | 'all' {
  const raw = (Array.isArray(v) ? v[0] : v) as string | undefined
  if (!raw) return 32
  if (raw === 'all') return 'all'
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 32
}
function scrollTop(smooth = true) {
  if (process.client) window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
}

/** merge URL query with initialFilters (for first load & SSR) */
/** merge URL query with initialFilters (for first load & SSR) */
const mergedFilters = computed(() => {
  const qy = route.query
  return {
    brands:        qy.brands ? parseCsv(qy.brands) : (props.initialFilters?.brands ?? []),
    categories:    qy.categories ? parseCsv(qy.categories) : (props.initialFilters?.categories ?? []),
    manufacturers: qy.manufacturers ? parseCsv(qy.manufacturers) : (props.initialFilters?.manufacturers ?? []),
    models:        qy.models ? parseCsv(qy.models) : (props.initialFilters?.models ?? []),

    // 👇 read q OR search (alias coming from the header)
    q:    (qy.q as string) || (qy.search as string) || '',

    sort: (qy.sort as string) || 'newest',
    page: Number(qy.page || 1),
    perPage: parsePerPage(qy.per_page || qy.page_size)
  }
})

/** Where user "came from" (based on initialFilters) */
const entryType = computed<'brand'|'category'|'manufacturer'|'unknown'>(() => {
  const init = props.initialFilters || {}
  if (init.categories?.length) return 'category'
  if (init.manufacturers?.length) return 'manufacturer'
  if (init.brands?.length) return 'brand'
  return 'unknown'
})

/** local UI state (mirrors URL; URL is the source of truth) */
const sel = reactive({
  brands: [] as string[],
  categories: [] as string[],
  manufacturers: [] as string[],
  models: [] as string[],
  q: '',
  sort: 'newest',
  page: 1,
  perPage: 32 as number | 'all'
})

/** collapsible + UI state per section */
type K = 'brands'|'models'|'categories'|'manufacturers'
const ui = reactive({
  open:    { brands: false, models: false, categories: false, manufacturers: false } as Record<K, boolean>,
  search:  { brands: '',    models: '',    categories: '',    manufacturers: ''    } as Record<K, string>,
})

/** Initialize once from mergedFilters (first render) */
{
  const v = mergedFilters.value
  sel.brands = [...v.brands]
  sel.categories = [...v.categories]
  sel.manufacturers = [...v.manufacturers]
  sel.models = [...v.models]
  sel.q = v.q
  sel.sort = v.sort
  sel.page = v.page
  sel.perPage = v.perPage

  ui.open.brands = sel.brands.length > 0
  ui.open.models = sel.models.length > 0
  ui.open.categories = sel.categories.length > 0
  ui.open.manufacturers = sel.manufacturers.length > 0
}

function buildQueryFromSel() {
  const q: Record<string, string> = {}
  if (sel.brands.length)         q.brands         = sel.brands.join(',')
  if (sel.categories.length)     q.categories     = sel.categories.join(',')
  if (sel.manufacturers.length)  q.manufacturers  = sel.manufacturers.join(',')
  if (sel.models.length)         q.models         = sel.models.join(',')

  // 👇 use 'search' so /shop?search=... remains canonical
  if (sel.q)                     q.search         = sel.q

  if (sel.sort)                  q.sort           = sel.sort
  if (sel.page > 1)              q.page           = String(sel.page)
  q.per_page = sel.perPage === 'all' ? 'all' : String(sel.perPage || 32)

  // preserve unknown params
  const next: Record<string, any> = {}
  Object.keys(route.query).forEach(k => {
    if (!managedKeys.includes(k as any)) next[k] = (route.query as any)[k]
  })
  Object.assign(next, q)
  return next
}
const withoutPage = (q: Record<string, any>) => {
  const { page, ...rest } = q; return rest
}

/** Decide whether we should be on /shop after a chip removal */
function computeTargetPath() {
  const baseCat = (props.initialFilters?.categories?.[0] || '').toLowerCase()
  const baseMan = (props.initialFilters?.manufacturers?.[0] || '').toLowerCase()

  const hasAnyFilter =
    sel.brands.length || sel.categories.length || sel.manufacturers.length || sel.models.length || !!sel.q

  const hasBaseCat = sel.categories.map(s => s.toLowerCase()).includes(baseCat)
  const hasBaseMan = sel.manufacturers.map(s => s.toLowerCase()).includes(baseMan)

  if (!hasAnyFilter && (entryType.value === 'category' || entryType.value === 'manufacturer')) {
    return SHOP_PATH
  }
  if (entryType.value === 'category' && baseCat && !hasBaseCat) return SHOP_PATH
  if (entryType.value === 'manufacturer' && baseMan && !hasBaseMan) return SHOP_PATH
  return route.path
}

/** push clean URL every time (no stale params); reset page if path is changing */
function updateRoute(replace = false) {
  const path  = computeTargetPath()
  const query = (path !== route.path) ? withoutPage(buildQueryFromSel()) : buildQueryFromSel()
  return router[replace ? 'replace' : 'push']({ path, query })
}

function toggle(list: string[], slug: string) {
  const i = list.indexOf(slug)
  i >= 0 ? list.splice(i, 1) : list.push(slug)
}
function toggleSection(which: K) { ui.open[which] = !ui.open[which] }

function clearGroup(which: K) {
  if (which === 'brands') sel.brands = []
  else if (which === 'categories') sel.categories = []
  else if (which === 'manufacturers') sel.manufacturers = []
  else sel.models = []

  const totalAfter =
    sel.brands.length + sel.models.length + sel.categories.length + sel.manufacturers.length

  if (totalAfter === 0) { router.push({ path: SHOP_PATH }); return }
  if (which === entryType.value) {
    router.push({ path: SHOP_PATH, query: withoutPage(buildQueryFromSel()) })
    return
  }
  applyAndResetPage()
}

/* ---------- API unwrap + pricing helpers ---------- */
function unwrapApi(res: any) {
  const body = (res && typeof res === 'object' && 'data' in res && !Array.isArray(res.data)) ? res.data : res
  const items = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : [])
  const meta  = (body && body.meta) ?? (res && res.meta) ?? null
  return { items, meta, body }
}
function toNum(v: any): number | null { const n = Number(v); return Number.isFinite(n) ? n : null }
function isType(v: any): v is 'percent' | 'fixed' { return v === 'percent' || v === 'fixed' }
function normalizeDiscount(raw: any) {
  const d = raw?.data ?? raw ?? {}
  const type = isType(d?.type) ? d.type : null
  const value = toNum(d?.value)
  const now = Date.now()
  const okStart = d?.start_date ? now >= Date.parse(d.start_date) : true
  const okEnd   = d?.end_date   ? now <= Date.parse(d.end_date)   : true
  const active  = !!d?.active && type && value != null && okStart && okEnd
  return { discount_type: active ? (type as 'percent'|'fixed') : null, discount_value: active ? (value as number) : null }
}
function applyDiscount(base: number, disc: { discount_type: 'percent'|'fixed'|null, discount_value: number|null }) {
  if (!disc.discount_type || disc.discount_value == null) return base
  if (disc.discount_type === 'percent') return Math.max(0, Math.round((base * (1 - disc.discount_value / 100)) * 100) / 100)
  if (disc.discount_type === 'fixed')   return Math.max(0, Math.round((base - disc.discount_value) * 100) / 100)
  return base
}

/** Map API → card item with sale/discount awareness */
function mapApiProduct(p: any) {
  const discRaw = (p?.discount?.data ?? p?.discount) || null
  const discType  = (discRaw?.type === 'fixed' || discRaw?.type === 'percent') ? discRaw.type : null
  const discValue = typeof discRaw?.value === 'number' ? discRaw.value
                   : (discRaw?.value != null ? Number(discRaw.value) : null)
  const discStart = discRaw?.start_date ?? null
  const discEnd   = discRaw?.end_date ?? null
  const discActive = Boolean(discRaw?.active)
  const hasSale = p?.sale_price != null && p?.sale_price !== 0
  const categoryName = Array.isArray(p?.categories) && p.categories[0]?.name ? String(p.categories[0].name) : ''
  const categorySlug = Array.isArray(p?.categories) && p.categories[0]?.slug ? String(p.categories[0].slug).toLowerCase() : ''
  return {
    id: p.id,
    name: p.title ?? p.short_title ?? '',
    image: p.image,
    price: hasSale ? p.sale_price : p.price,
    oldPrice: hasSale ? p.price : null,
    regular_price: p.regular_price ?? null,
    sale_price: p.sale_price ?? null,
    table_price: Array.isArray(p?.table_price) ? p.table_price : null,
    discount_type: discType,
    discount_value: discValue,
    discount_start_date: discStart,
    discount_end_date: discEnd,
    discount_active: discActive,
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
  const size  = Math.max(1, Number(meta?.page_size || meta?.per_page || (sel.perPage === 'all' ? 32 : sel.perPage || 24)))
  const calc  = Math.ceil(total / size)
  return calc > 0 ? calc : 1
}

/* ---------- data ---------- */
const items   = ref<any[]>([])
const meta    = ref<any | null>(null)
type FacetT = { id?: number|string; slug: string; name: string; count: number }
const facets  = ref<{brands:FacetT[];models:FacetT[];categories:FacetT[];manufacturers:FacetT[]}|null>(null)
const pending = ref(false)
const errorMsg = ref('')

/* ---------- Infinite scroll ---------- */
const infiniteSentinel = ref<HTMLElement | null>(null)
const isInfinite = computed(() => sel.perPage === 'all')
const CHUNK = 32
const canLoadMore = computed(() => {
  if (!meta.value) return false
  const current = Number(meta.value.current_page || sel.page || 1)
  const last = Number(meta.value.last_page || lastFromMeta(meta.value))
  return current < last
})

/* ---------- SSR fetch (first load) ---------- */
const keyForSSR = computed(() => `catalog:${JSON.stringify({
  brands: sel.brands, categories: sel.categories, manufacturers: sel.manufacturers, models: sel.models,
  q: sel.q, sort: sel.sort, page: sel.page, per_page: sel.perPage
})}`)

async function fetchOnce() {
  pending.value = true
  errorMsg.value = ''
  try {
    const effectivePerPage = sel.perPage === 'all' ? CHUNK : sel.perPage
    const params = buildCatalogParams({
      brands: sel.brands,
      categories: sel.categories,
      manufacturers: sel.manufacturers,
      models: sel.models,
      q: sel.q,
      sort: sel.sort,
      page: sel.page,
      per_page: effectivePerPage
    })

    ;(params as any).search = sel.q
    delete (params as any).q

    // Forward flags from the current URL to the API
    flagKeys.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(route.query, k)) {
        ;(params as any)[k] = (route.query as any)[k] === '' ? 1 : (route.query as any)[k]
      }
    })

    ;(params as any).include = 'table_price,categories'

    const res = await $customApi(`${API_BASE_URL}/catalog`, { method: 'GET', params })
    const { items: list, meta: m, body } = unwrapApi(res)

    const mapped = list.map(mapApiProduct)
    if (isInfinite.value && sel.page > 1) items.value = items.value.concat(mapped)
    else items.value = mapped

    meta.value   = m

    const fix = (arr: any[] = []): FacetT[] =>
      arr.map((f: any) => ({
        id: f.id,
        slug: String(f.slug),
        name: (f.name ?? '').toString() || prettify(String(f.slug)),
        count: Number(f.count ?? 0)
      }))

    facets.value = body?.facets ? {
      brands:        fix(body.facets.brands),
      models:        fix(body.facets.models || []),
      categories:    fix(body.facets.categories),
      manufacturers: fix(body.facets.manufacturers),
    } : null
  } catch (e: any) {
    errorMsg.value = e?.data?.message || e?.message || 'Failed to load catalog'
  } finally {
    pending.value = false
  }
}

// SSR + first client render (Nuxt 4): avoid double re-fetch by not making the watcher immediate.
await useAsyncData(keyForSSR, () => fetchOnce(), { server: true, immediate: true })

/* ---------- robust URL → state resync (on every route change) ---------- */
async function resyncFromUrlAndFetch() {
  await nextTick()

  const v = mergedFilters.value

  // snapshot previous to decide if we should clear list
  const prev = {
    perPage: sel.perPage,
    sort: sel.sort,
    brands: sel.brands.join(','),
    models: sel.models.join(','),
    cats: sel.categories.join(','),
    mans: sel.manufacturers.join(','),
    q: sel.q,
  }

  // mirror URL → local state
  sel.brands        = [...v.brands]
  sel.categories    = [...v.categories]
  sel.manufacturers = [...v.manufacturers]
  sel.models        = [...v.models]
  sel.q             = v.q
  sel.sort          = v.sort
  sel.page          = v.page
  sel.perPage       = v.perPage

  // always reset facets/meta when route changes; clear items if material change
  items.value  = (prev.perPage !== sel.perPage ||
                  prev.sort    !== sel.sort ||
                  prev.brands  !== sel.brands.join(',') ||
                  prev.models  !== sel.models.join(',') ||
                  prev.cats    !== sel.categories.join(',') ||
                  prev.mans    !== sel.manufacturers.join(',') ||
                  prev.q       !== sel.q) ? [] : items.value
  meta.value   = null
  facets.value = null

  // open sections that have selections
  ui.open.brands        = sel.brands.length > 0
  ui.open.models        = sel.models.length > 0
  ui.open.categories    = sel.categories.length > 0
  ui.open.manufacturers = sel.manufacturers.length > 0

  await fetchOnce()
}
// Not immediate -> prevents double fetch after SSR
watch(routeKey, () => { resyncFromUrlAndFetch() }, { immediate: false })

/* ---------- mount-only: infinite scroll observer ---------- */
onMounted(() => {
  const io = new IntersectionObserver((entries) => {
    const [entry] = entries
    if (!entry?.isIntersecting) return
    if (!isInfinite.value) return
    if (!canLoadMore.value) return
    if (pending.value) return
    sel.page += 1
    updateRoute()
  }, { rootMargin: '300px 0px 300px 0px', threshold: 0 })

  watchEffect(() => {
    const el = infiniteSentinel.value
    if (el) io.observe(el)
    return () => { if (el) io.unobserve(el) }
  })

  onBeforeUnmount(() => io.disconnect())
})

function goPage(p: number) {
  sel.page = p
  updateRoute().then(() => scrollTop())
}
function applyAndResetPage() {
  sel.page = 1
  items.value = []
  updateRoute().then(() => scrollTop())
}

/* ---------- ORDER + Selected chips ---------- */
const facetMaps = computed(() => {
  const b = new Map<string,string>()
  const mdl = new Map<string,string>()
  const c = new Map<string,string>()
  const m = new Map<string,string>()
  if (facets.value) {
    facets.value.brands.forEach(f => b.set(f.slug, f.name))
    facets.value.models.forEach(f => mdl.set(f.slug, f.name))
    facets.value.categories.forEach(f => c.set(f.slug, f.name))
    facets.value.manufacturers.forEach(f => m.set(f.slug, f.name))
  }
  return { b, mdl, c, m }
})

/** Order: depends on entry type */
const facetSections = computed(() => {
  if (!facets.value) return []

  const sectionsMap = {
    brands:        { key: 'brands' as const,        label: t('facets.brands'),        items: facets.value.brands,        list: sel.brands },
    models:        { key: 'models' as const,        label: t('facets.models'),        items: facets.value.models,        list: sel.models },
    categories:    { key: 'categories' as const,    label: t('facets.categories'),    items: facets.value.categories,    list: sel.categories },
    manufacturers: { key: 'manufacturers' as const, label: t('facets.manufacturers'), items: facets.value.manufacturers, list: sel.manufacturers }
  }

  const order: (keyof typeof sectionsMap)[] = []

  if (entryType.value === 'category') {
    order.push('categories', 'manufacturers', 'brands')
    if (sel.brands.length) order.push('models')
  } else if (entryType.value === 'manufacturer') {
    order.push('manufacturers', 'categories', 'brands')
    if (sel.brands.length) order.push('models')
  } else if (entryType.value === 'brand') {
    order.push('brands')
    if (sel.brands.length) order.push('models')
    order.push('categories', 'manufacturers')
  } else {
    order.push('brands')
    if (sel.brands.length) order.push('models')
    order.push('manufacturers', 'categories')
  }

  return order.map(k => sectionsMap[k])
})

const selectedChips = computed(() => {
  const chips: { group: K; slug: string; label: string }[] = []
  const { b, mdl, c, m } = facetMaps.value
  sel.brands.forEach(s => chips.push({ group: 'brands', slug: s, label: b.get(s) || prettify(s) }))
  sel.models.forEach(s => chips.push({ group: 'models', slug: s, label: mdl.get(s) || prettify(s) }))
  sel.manufacturers.forEach(s => chips.push({ group: 'manufacturers', slug: s, label: m.get(s) || prettify(s) }))
  sel.categories.forEach(s => chips.push({ group: 'categories', slug: s, label: c.get(s) || prettify(s) }))
  return chips
})

function removeChip(group: K, slug: string) {
  const map = { brands: sel.brands, models: sel.models, categories: sel.categories, manufacturers: sel.manufacturers }[group]
  const i = map.indexOf(slug)
  if (i >= 0) map.splice(i, 1)

  const totalAfter =
    sel.brands.length + sel.models.length + sel.categories.length + sel.manufacturers.length

  if (totalAfter === 0) { router.push({ path: SHOP_PATH }); return }

  const init = props.initialFilters || {}
  const isEntryGroup = group === entryType.value
  const removedWasEntrySlug =
    isEntryGroup &&
    Array.isArray((init as any)[group]) &&
    (init as any)[group].includes(slug)

  if (removedWasEntrySlug) {
    router.push({ path: SHOP_PATH, query: withoutPage(buildQueryFromSel()) })
    return
  }

  applyAndResetPage()
}

/* inline search (no "show more" on purpose) */
type FacetTList = FacetT[]
function filteredItems(items: FacetTList, key: K) {
  const q = (ui.search[key] || '').toLowerCase()
  return q
    ? items.filter(i =>
        i.name.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q)
      )
    : items
}

/* ---------- ProductGrid config ---------- */
const PRODUCTS_PER_ROW: 3 | 4 | 5 | 6 = 4;
const rowsForGrid = computed(() =>
  Math.max(1, Math.ceil(items.value.length / PRODUCTS_PER_ROW))
);

/* ---------- Pagination (responsive, accessible) ---------- */
const vw = ref(1024)
if (process.client) {
  const set = () => { vw.value = window.innerWidth }
  set()
  window.addEventListener('resize', set)
  onUnmounted(() => window.removeEventListener('resize', set))
}
const pageRadius = computed(() => vw.value < 480 ? 1 : (vw.value < 768 ? 2 : 3))

const pageInfo = computed(() => {
  const m = meta.value || {}
  const current = Number(m.current_page || sel.page || 1)
  const size = sel.perPage === 'all'
    ? Number(m.page_size || m.per_page || CHUNK)
    : Number(sel.perPage || m.page_size || m.per_page || CHUNK)
  const total = Number(m.total || 0)
  const last  = Number(m.last_page || (total && size ? Math.ceil(total / size) : lastFromMeta(m)))
  const from  = total ? (current - 1) * size + 1 : 0
  const to    = total ? Math.min(current * size, total) : 0
  return { current, size, total, last, from, to }
})

type Chip = { type:'page'; value:number; active:boolean } | { type:'gap'; dir:'prev'|'next' }
const paginationItems = computed<Chip[]>(() => {
  if (isInfinite.value) return []
  const { current, last } = pageInfo.value
  const r = pageRadius.value
  const set = new Set<number>([1, last])
  for (let p = current - r; p <= current + r; p++) if (p >= 1 && p <= last) set.add(p)
  const sorted = Array.from(set).sort((a,b)=>a-b)

  const out: Chip[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push({ type:'gap', dir: p < current ? 'prev' : 'next' })
    out.push({ type:'page', value:p, active:p===current })
    prev = p
  }
  return out
})

function jumpGap(dir:'prev'|'next') {
  const { current, last } = pageInfo.value
  const step = pageRadius.value * 2 + 1
  const target = dir === 'prev' ? Math.max(1, current - step) : Math.min(last, current + step)
  goPage(target)
}
function goFirst(){ if (pageInfo.value.current > 1) goPage(1) }
function goLast(){  if (pageInfo.value.current < pageInfo.value.last) goPage(pageInfo.value.last) }

/* ---------- RTL-aware ordering ---------- */
const isRTL = computed(() => localeProperties.value?.dir === 'rtl')

/* ---------- Mobile modal state ---------- */
const activeMobileModal = ref<null | K>(null)
function openMobileModal(k: K) { activeMobileModal.value = k; ui.search[k] = '' }
function closeMobileModal() { activeMobileModal.value = null }
const modalSection = computed(() => {
  if (!activeMobileModal.value || !facets.value) return null
  return facetSections.value.find(s => s.key === activeMobileModal.value) || null
})
function applyMobileFilters() { applyAndResetPage(); closeMobileModal() }
function clearMobileGroup() {
  const k = activeMobileModal.value
  if (!k) return
  if (k === 'brands') sel.brands = []
  else if (k === 'categories') sel.categories = []
  else if (k === 'manufacturers') sel.manufacturers = []
  else sel.models = []
  applyMobileFilters()
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 grid grid-cols-12 gap-6">
    <!-- Mobile chip bar -->
    <div class="min-[993px]:hidden col-span-12">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm text-gray-600">
          <span v-if="meta?.total">{{ meta.total }}</span>
          <span v-else>{{ items.length }}</span>
          {{ t('products') }}
        </div>
        <button
          v-if="selectedChips.length"
          class="text-xs text-red-600 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50"
          @click="sel.brands=[]; sel.models=[]; sel.categories=[]; sel.manufacturers=[]; router.push({ path: SHOP_PATH })"
        >
          {{ t('filters.clearAll') }}
        </button>
      </div>

      <!-- Active filter chips -->
      <div v-if="selectedChips.length" class="mb-3 flex flex-wrap gap-2">
        <button
          v-for="chip in selectedChips"
          :key="chip.group + ':' + chip.slug"
          class="inline-flex items-center gap-1 rounded-full bg-gray-100 border px-2.5 py-1.5 text-xs"
          @click="removeChip(chip.group, chip.slug)"
        >
          <span>{{ chip.label }}</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 8.586l4.95-4.95 1.414 1.414L11.414 10l4.95 4.95-1.414 1.414L10 11.414l-4.95 4.95-1.414-1.414L8.586 10l-4.95-4.95L5.05 3.636 10 8.586z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <!-- Filter category chips (open modal) -->
      <div class="flex flex-wrap gap-2">
        <button class="px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 text-sm bg-orange-50" @click="openMobileModal('categories')">{{ t('facets.categories') }}</button>
        <button class="px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 text-sm bg-orange-50" @click="openMobileModal('manufacturers')">{{ t('facets.manufacturers') }}</button>
        <button class="px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 text-sm bg-orange-50" @click="openMobileModal('brands')">{{ t('facets.brands') }}</button>
        <button class="px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 text-sm bg-orange-50" @click="openMobileModal('models')">{{ t('facets.models') }}</button>
      </div>
    </div>

    <!-- Sidebar (desktop only) -->
    <ClientOnly>
      <aside class="hidden min-[993px]:block col-span-12 min-[993px]:col-span-3" :class="isRTL ? 'min-[993px]:order-2' : 'min-[993px]:order-1'">
        <div class="lg:sticky lg:top-32 space-y-4 max-h-[calc(100vh-6rem)] overflow-auto pr-1">
          <!-- Selected chips -->
          <div v-if="selectedChips.length" class="rounded-2xl border bg-white/80 backdrop-blur p-3 shadow-sm">
            <div class="mb-2 text-sm font-semibold text-gray-700">{{ t('filters.active') }}</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="chip in selectedChips"
                :key="chip.group + ':' + chip.slug"
                class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 shadow-sm"
                @click="removeChip(chip.group, chip.slug)"
                :title="t('filters.remove', { label: chip.label })"
              >
                <span class="font-medium line-clamp-1 max-w-[10rem]">{{ chip.label }}</span>
                <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 8.586l4.95-4.95 1.414 1.414L11.414 10l4.95 4.95-1.414 1.414L10 11.414l-4.95 4.95-1.414-1.414L8.586 10l-4.95-4.95L5.05 3.636 10 8.586z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
            <button class="mt-3 text-xs text-red-600 hover:underline"
                    @click="sel.brands=[]; sel.models=[]; sel.categories=[]; sel.manufacturers=[]; router.push({ path: SHOP_PATH })">
              {{ t('filters.clearAll') }}
            </button>
          </div>

          <!-- Facets (desktop sidebar) -->
          <div v-if="facets" class="space-y-3">
            <div v-for="section in facetSections" :key="section.key" class="rounded-2xl border bg-white/80 backdrop-blur shadow-sm overflow-hidden">
              <!-- Header -->
              <button class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                      @click="toggleSection(section.key)" :aria-expanded="ui.open[section.key]">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-800">{{ section.label }}</span>
                  <span v-if="section.list.length" class="inline-flex items-center rounded-full text-[10px] px-1.5 py-0.5 bg-gray-100 border">
                    {{ section.list.length }} {{ t('filters.selectedSuffix') }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <button v-if="section.list.length" @click.stop="clearGroup(section.key)" class="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2">
                    {{ t('filters.clear') }}
                  </button>
                  <svg :class="['w-4 h-4 text-gray-500 transition-transform', ui.open[section.key] ? 'rotate-180' : 'rotate-0']" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
                </div>
              </button>

              <!-- Body -->
              <div v-show="ui.open[section.key]" class="px-4 pb-4">
                <div class="relative mb-3">
                  <input v-model="ui.search[section.key]" type="search"
                         :placeholder="t('filters.searchPlaceholder', { label: (section.label || '').toString().toLowerCase() })"
                         class="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200" />
                  <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M12.9 14.32a7 7 0 111.414-1.414l3.387 3.387-1.414 1.414-3.387-3.387zM8 13a5 5 0 100-10 5 5 0 000 10z" clip-rule="evenodd"/>
                  </svg>
                </div>

                <div class="space-y-1.5 max-h-64 overflow-auto pr-1">
                  <div v-for="f in filteredItems(section.items, section.key)" :key="f.slug"
                       class="group flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" :checked="section.list.includes(f.slug)"
                             @change="toggle(section.list, f.slug); applyAndResetPage()"
                             class="size-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300" />
                      <span class="text-sm text-gray-800 line-clamp-1">{{ f.name }}</span>
                    </label>
                    <span class="text-[11px] text-gray-500">{{ f.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <template #fallback>
        <aside class="hidden min-[993px]:block col-span-12 min-[993px]:col-span-3" :class="isRTL ? 'min-[993px]:order-2' : 'min-[993px]:order-1'"></aside>
      </template>
    </ClientOnly>

    <!-- Products column -->
    <section :class="['col-span-12 min-[993px]:col-span-9', isRTL ? 'min-[993px]:order-1' : 'min-[993px]:order-2']">
      <!-- Top toolbar -->
      <div class="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm mb-4">
        <div class="grid grid-cols-1 min-[993px]:grid-cols-12 gap-3 items-center">
          <div class="min-[993px]:col-span-5">
            <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('search') }}</label>
            <input
              :value="sel.q"
              @input="(e:any)=>{ sel.q=e.target.value }"
              @keyup.enter="applyAndResetPage"
              @change="applyAndResetPage"
              type="search"
              :placeholder="t('searchPlaceholderProducts')"
              class="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div class="min-[993px]:col-span-4">
            <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('sortBy') }}</label>
            <select
              :value="sel.sort"
              @change="(e:any)=>{ sel.sort=e.target.value; applyAndResetPage() }"
              class="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="price_asc">{{ t('sort.priceLowHigh') }}</option>
              <option value="price_desc">{{ t('sort.priceHighLow') }}</option>
              <option value="newest">{{ t('sort.newToOld') }}</option>
              <option value="oldest">{{ t('sort.oldToNew') }}</option>
            </select>
          </div>

          <div class="min-[993px]:col-span-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('perPage') }}</label>
            <select
              :value="sel.perPage === 'all' ? 'all' : String(sel.perPage)"
              @change="(e:any)=>{ const v=e.target.value; sel.perPage = v==='all'? 'all' : Number(v); applyAndResetPage() }"
              class="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="16">16</option>
              <option value="32">32</option>
              <option value="all">{{ t('perPageAll') }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="errorMsg" class="mb-4 rounded-md border border-red-300/60 bg-red-50 text-red-700 px-4 py-2 text-sm">
        {{ errorMsg }}
      </div>

      <!-- Grid or skeleton -->
      <template v-if="pending && items.length === 0">
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <div v-for="i in 12" :key="i" class="h-44 bg-gray-200/70 animate-pulse rounded-xl" />
        </div>
      </template>

      <template v-else>
        <ProductGrid
          :key="gridKey"
          :title="t('products')"
          :products="items"
          :rows="rowsForGrid"
          :products-per-row="PRODUCTS_PER_ROW"
          :show-rewards="true"
          :show-add="true"
          :show-qty="true"
          container-class="max-w-screen-2xl"
        />

        <!-- Upgraded pagination -->
        <div v-if="meta && !isInfinite" class="mt-6 flex flex-col items-center gap-3">
          <div v-if="pageInfo.total" class="text-sm text-gray-600">
            {{ t('pagination.showing') }} {{ pageInfo.from }}–{{ pageInfo.to }} {{ t('pagination.of') }} {{ pageInfo.total }}
          </div>

          <nav class="flex items-center gap-1 flex-wrap" aria-label="Pagination">
            <button class="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-40"
                    :disabled="pageInfo.current <= 1" @click="goFirst" aria-label="First page">«</button>
            <button class="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-40"
                    :disabled="pageInfo.current <= 1" @click="goPage(pageInfo.current - 1)" aria-label="Previous page">‹</button>

            <template v-for="(it, idx) in paginationItems" :key="idx">
              <button v-if="it.type==='page'"
                      class="px-3 py-1.5 border rounded-lg bg-gray-50"
                      :class="it.active ? 'bg-gray-900 text-white hover:bg-gray-900' : ''"
                      :aria-current="it.active ? 'page' : undefined"
                      @click="!it.active && goPage(it.value)">
                {{ it.value }}
              </button>
              <button v-else
                      class="px-2 py-1.5 text-gray-500 hover:text-gray-900"
                      @click="jumpGap(it.dir)" aria-label="Jump pages">…</button>
            </template>

            <button class="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-40"
                    :disabled="pageInfo.current >= pageInfo.last" @click="goPage(pageInfo.current + 1)" aria-label="Next page">›</button>
            <button class="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-40"
                    :disabled="pageInfo.current >= pageInfo.last" @click="goLast" aria-label="Last page">»</button>
          </nav>

          <form class="flex items-center gap-2 text-sm" @submit.prevent="submitGoto">
            <label class="text-gray-600">{{ t('pagination.goTo') }}</label>
            <input v-model="gotoModel" inputmode="numeric" pattern="[0-9]*"
                   class="w-16 border rounded-lg px-2 py-1.5" :placeholder="String(pageInfo.current)" />
            <button class="px-3 py-1.5 border rounded-lg hover:bg-gray-50">{{ t('pagination.go') }}</button>
          </form>
        </div>

        <div v-if="isInfinite" class="mt-6 flex flex-col items-center gap-3">
          <div ref="infiniteSentinel" class="h-1 w-full"></div>
          <div v-if="pending" class="text-sm text-gray-500">{{ t('infinite.loading') }}</div>
          <button v-else-if="canLoadMore" class="px-4 py-2 border rounded-lg hover:bg-gray-50" @click="sel.page += 1; updateRoute()">
            {{ t('infinite.loadMore') }}
          </button>
          <div v-else class="text-sm text-gray-500">{{ t('infinite.noMore') }}</div>
        </div>
      </template>
    </section>

    <!-- Mobile modal -->
    <transition name="fade">
      <div v-if="activeMobileModal" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/40" @click="closeMobileModal"></div>
        <div class="absolute inset-x-0 bottom-0 max-h-[80vh] bg-white rounded-t-2xl shadow-2xl">
          <div class="p-4 border-b flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900">
              {{ modalSection?.label }}
            </h3>
            <button class="p-2 rounded hover:bg-gray-100" @click="closeMobileModal" aria-label="Close">
              <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 8.586l4.95-4.95 1.414 1.414L11.414 10l4.95 4.95-1.414 1.414L10 11.414l-4.95 4.95-1.414-1.414L8.586 10l-4.95-4.95L5.05 3.636 10 8.586z" clip-rule="evenodd"/></svg>
            </button>
          </div>

          <div class="p-4">
            <div class="relative mb-3">
              <input v-model="ui.search[activeMobileModal!]" type="search"
                     :placeholder="t('filters.searchPlaceholder', { label: (modalSection?.label || '').toString().toLowerCase() })"
                     class="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200" />
              <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.9 14.32a7 7 0 111.414-1.414l3.387 3.387-1.414 1.414-3.387-3.387zM8 13a5 5 0 100-10 5 5 0 000 10z" clip-rule="evenodd"/>
              </svg>
            </div>

            <div class="space-y-1.5 max-h-[45vh] overflow-auto pr-1">
              <div v-for="f in (modalSection ? filteredItems(modalSection.items, modalSection.key) : [])"
                   :key="f.slug" class="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" :checked="modalSection?.list.includes(f.slug)"
                         @change="toggle(modalSection!.list, f.slug)"
                         class="size-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300" />
                  <span class="text-sm text-gray-800 line-clamp-1">{{ f.name }}</span>
                </label>
                <span class="text-[11px] text-gray-500">{{ f.count }}</span>
              </div>
            </div>
          </div>

          <div class="p-4 border-t flex items-center justify-between gap-3">
            <button class="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50" @click="clearMobileGroup">
              {{ t('filters.clear') }}
            </button>

            <div class="ml-auto flex gap-3">
              <button class="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50" @click="closeMobileModal">Close</button>
              <button class="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600" @click="applyMobileFilters">
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

<i18n>
{
  "en": {
    "products": "Products",
    "search": "Search",
    "searchPlaceholderProducts": "Search products…",
    "sortBy": "Sort by",
    "sort": {
      "priceLowHigh": "Price: Low → High",
      "priceHighLow": "Price: High → Low",
      "newest": "Newest → Oldest",
      "oldest": "Oldest → Newest"
    },
    "perPage": "Per page",
    "perPageAll": "All",
    "pagination": {
      "prev": "Prev",
      "next": "Next",
      "showing": "Showing",
      "of": "of",
      "goTo": "Go to page",
      "go": "Go"
    },
    "filters": {
      "active": "Active filters",
      "clearAll": "Clear all",
      "clear": "Clear",
      "selectedSuffix": "selected",
      "remove": "Remove {label}",
      "searchPlaceholder": "Search {label}…"
    },
    "facets": {
      "brands": "Brands",
      "models": "Models",
      "categories": "Categories",
      "manufacturers": "Manufacturers"
    },
    "infinite": { "loading": "Loading…", "loadMore": "Load more", "noMore": "No more items" }
  },
  "tr": {
    "products": "Ürünler",
    "search": "Ara",
    "searchPlaceholderProducts": "Ürünlerde ara…",
    "sortBy": "Sırala",
    "sort": {
      "priceLowHigh": "Fiyat: Düşük → Yüksek",
      "priceHighLow": "Fiyat: Yüksek → Düşük",
      "newest": "Yeni → Eski",
      "oldest": "Eski → Yeni"
    },
    "perPage": "Sayfa başına",
    "perPageAll": "Tümü",
    "pagination": {
      "prev": "Önceki",
      "next": "Sonraki",
      "showing": "Gösterilen",
      "of": "toplam",
      "goTo": "Sayfaya git",
      "go": "Git"
    },
    "filters": {
      "active": "Aktif filtreler",
      "clearAll": "Tümünü temizle",
      "clear": "Temizle",
      "selectedSuffix": "seçili",
      "remove": "{label} filtresini kaldır",
      "searchPlaceholder": "{label} ara…"
    },
    "facets": {
      "brands": "Markalar",
      "models": "Modeller",
      "categories": "Kategoriler",
      "manufacturers": "Üreticiler"
    },
    "infinite": { "loading": "Yükleniyor…", "loadMore": "Daha fazla yükle", "noMore": "Hepsi bu kadar" }
  }
}
</i18n>
