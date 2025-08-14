<script setup lang="ts">
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
const t = i18nApi?.t ?? ((s: string, _?: any) => s)
const localeProperties = i18nApi?.localeProperties ?? computed(() => ({ dir: 'ltr' }))

/* ---------- helpers ---------- */
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
  if (!raw) return 16
  if (raw === 'all') return 'all'
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 16
}
function scrollTop(smooth = true) {
  if (process.client) window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
}

/** merge URL query with initialFilters (for first load & SSR) */
const mergedFilters = computed(() => {
  const q = route.query
  return {
    brands:        q.brands ? parseCsv(q.brands) : (props.initialFilters?.brands ?? []),
    categories:    q.categories ? parseCsv(q.categories) : (props.initialFilters?.categories ?? []),
    manufacturers: q.manufacturers ? parseCsv(q.manufacturers) : (props.initialFilters?.manufacturers ?? []),
    models:        q.models ? parseCsv(q.models) : (props.initialFilters?.models ?? []), // NEW
    q:    (q.q as string) || '',
    sort: (q.sort as string) || 'newest',
    page: Number(q.page || 1),
    perPage: parsePerPage(q.per_page || q.page_size)
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
  models: [] as string[], // NEW
  q: '',
  sort: 'newest',
  page: 1,
  perPage: 16 as number | 'all'
})

/** collapsible + UI state per section */
type K = 'brands'|'models'|'categories'|'manufacturers'
const ui = reactive({
  open:    { brands: false, models: false, categories: false, manufacturers: false } as Record<K, boolean>,
  search:  { brands: '',    models: '',    categories: '',    manufacturers: ''    } as Record<K, string>,
  showAll: { brands: false, models: false, categories: false, manufacturers: false } as Record<K, boolean>,
  limit: 12
})

/** Initialize once from mergedFilters */
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

function updateRoute(replace = false) {
  const q: any = {
    brands:        sel.brands.length ? sel.brands.join(',') : undefined,
    categories:    sel.categories.length ? sel.categories.join(',') : undefined,
    manufacturers: sel.manufacturers.length ? sel.manufacturers.join(',') : undefined,
    models:        sel.models.length ? sel.models.join(',') : undefined, // NEW
    q: sel.q || undefined,
    sort: sel.sort || undefined,
    page: sel.page > 1 ? sel.page : undefined,
    per_page: sel.perPage === 'all' ? 'all' : sel.perPage || undefined
  }
  return router[replace ? 'replace' : 'push']({ query: { ...route.query, ...q } })
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
  else sel.models = [] // models
  applyAndResetPage()
}

/* ---------- API unwrap + mapping ---------- */
function unwrapApi(res: any) {
  const body = (res && typeof res === 'object' && 'data' in res && !Array.isArray(res.data)) ? res.data : res
  const items = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : [])
  const meta  = (body && body.meta) ?? (res && res.meta) ?? null
  return { items, meta, body }
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

/* ---------- SSR fetch ---------- */
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
      models: sel.models, // NEW
      q: sel.q,
      sort: sel.sort,
      page: sel.page,
      per_page: effectivePerPage
    })
    const res = await $customApi(`${API_BASE_URL}/catalog`, { method: 'GET', params })
    const { items: list, meta: m, body } = unwrapApi(res)

    const mapped = list.map(mapApiProduct)
    if (isInfinite.value && sel.page > 1) {
      items.value = items.value.concat(mapped)
    } else {
      items.value = mapped
    }
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

await useAsyncData(keyForSSR, () => fetchOnce(), { server: true, immediate: true })

/* ---------- react after mount ONLY ---------- */
onMounted(() => {
  watch(mergedFilters, v => {
    const prevPerPage = sel.perPage
    const prevSort = sel.sort
    const prevBrands = sel.brands.join(',')
    const prevModels = sel.models.join(',')
    const prevCats = sel.categories.join(',')
    const prevMans = sel.manufacturers.join(',')
    const prevQ = sel.q

    sel.brands = [...v.brands]
    sel.categories = [...v.categories]
    sel.manufacturers = [...v.manufacturers]
    sel.models = [...v.models]
    sel.q = v.q
    sel.sort = v.sort
    sel.page = v.page
    sel.perPage = v.perPage

    if (
      prevPerPage !== sel.perPage ||
      prevSort !== sel.sort ||
      prevBrands !== sel.brands.join(',') ||
      prevModels !== sel.models.join(',') ||
      prevCats !== sel.categories.join(',') ||
      prevMans !== sel.manufacturers.join(',') ||
      prevQ !== sel.q
    ) {
      items.value = []
    }
    fetchOnce()
  }, { deep: true, flush: 'post' })

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

/** Order: Brands → Models (only if brands selected) → Manufacturers → Categories */
/** Order of filters depends on where the user entered from */
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
    // category → manufacturers → brands → models (if brand selected)
    order.push('categories', 'manufacturers', 'brands')
    if (sel.brands.length) order.push('models')
  } 
  else if (entryType.value === 'manufacturer') {
    // manufacturers → categories → brands → models (if brand selected)
    order.push('manufacturers', 'categories', 'brands')
    if (sel.brands.length) order.push('models')
  } 
  else if (entryType.value === 'brand') {
    // brands → models → categories → manufacturers
    order.push('brands')
    if (sel.brands.length) order.push('models')
    order.push('categories', 'manufacturers')
  } 
  else {
    // fallback: brands → models → manufacturers → categories
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
  applyAndResetPage()
}

/* inline search + show more */
type FacetTList = FacetT[]
function filteredItems(items: FacetTList, key: K) {
  const q = (ui.search[key] || '').toLowerCase()
  let list = q ? items.filter(i => i.name.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q)) : items
  if (!ui.showAll[key] && list.length > ui.limit) list = list.slice(0, ui.limit)
  return list
}

/* ---------- ProductGrid config ---------- */
const PRODUCTS_PER_ROW: 3 | 4 | 5 | 6 = 6
const rowsForGrid = computed(() => {
  const count = items.value.length
  return Math.max(1, Math.ceil(count / PRODUCTS_PER_ROW))
})

/* ---------- Pagination model ---------- */
type PageItem = { type: 'page', value: number, active: boolean } | { type: 'ellipsis' }
const paginationItems = computed<PageItem[]>(() => {
  if (isInfinite.value) return []
  const m = meta.value
  if (!m) return []
  const current = Number(m?.current_page || sel.page || 1)
  const last    = Number(m?.last_page || lastFromMeta(m))
  const set = new Set<number>([1, last])
  for (let p = current - 3; p <= current + 3; p++) if (p >= 1 && p <= last) set.add(p)

  const sorted = Array.from(set).sort((a,b)=>a-b)
  const out: PageItem[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push({ type: 'ellipsis' })
    out.push({ type: 'page', value: p, active: p === current })
    prev = p
  }
  return out
})

/* ---------- RTL-aware ordering ---------- */
const isRTL = computed(() => localeProperties.value?.dir === 'rtl')
</script>

<template>
  <div class="container mx-auto px-4 py-6 grid grid-cols-12 gap-6">
    <!-- Sidebar -->
    <ClientOnly>
      <aside :class="['col-span-12 lg:col-span-3', isRTL ? 'lg:order-2' : 'lg:order-1']">
        <div class="lg:sticky lg:top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-auto pr-1">
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
            <button
              class="mt-3 text-xs text-red-600 hover:underline"
              @click="sel.brands=[]; sel.models=[]; sel.categories=[]; sel.manufacturers=[]; applyAndResetPage()"
            >
              {{ t('filters.clearAll') }}
            </button>
          </div>

          <!-- Facets -->
          <div v-if="facets" class="space-y-3">
            <div
              v-for="section in facetSections"
              :key="section.key"
              class="rounded-2xl border bg-white/80 backdrop-blur shadow-sm overflow-hidden"
            >
              <!-- Header -->
              <button
                class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
                @click="toggleSection(section.key)"
                :aria-expanded="ui.open[section.key]"
              >
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-800">{{ section.label }}</span>
                  <span v-if="section.list.length"
                        class="inline-flex items-center rounded-full text-[10px] px-1.5 py-0.5 bg-gray-100 border">
                    {{ section.list.length }} {{ t('filters.selectedSuffix') }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <button
                    v-if="section.list.length"
                    @click.stop="clearGroup(section.key)"
                    class="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2"
                  >
                    {{ t('filters.clear') }}
                  </button>
                  <svg :class="['w-4 h-4 text-gray-500 transition-transform', ui.open[section.key] ? 'rotate-180' : 'rotate-0']"
                       viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
                </div>
              </button>

              <!-- Body -->
              <div v-show="ui.open[section.key]" class="px-4 pb-4">
                <div class="relative mb-3">
                  <input
                    v-model="ui.search[section.key]"
                    type="search"
                    :placeholder="t('filters.searchPlaceholder', { label: (section.label || '').toString().toLowerCase() })"
                    class="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M12.9 14.32a7 7 0 111.414-1.414l3.387 3.387-1.414 1.414-3.387-3.387zM8 13a5 5 0 100-10 5 5 0 000 10z" clip-rule="evenodd"/>
                  </svg>
                </div>

                <div class="space-y-1.5 max-h-64 overflow-auto pr-1">
                  <div
                    v-for="f in filteredItems(section.items, section.key)"
                    :key="f.slug"
                    class="group flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                  >
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        :checked="section.list.includes(f.slug)"
                        @change="toggle(section.list, f.slug); applyAndResetPage()"
                        class="size-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300"
                      />
                      <span class="text-sm text-gray-800 line-clamp-1">{{ f.name }}</span>
                    </label>
                    <span class="text-[11px] text-gray-500">{{ f.count }}</span>
                  </div>
                </div>

                <div v-if="section.items.length > ui.limit" class="mt-3">
                  <button
                    class="text-xs text-gray-700 hover:text-gray-900 underline underline-offset-2"
                    @click="ui.showAll[section.key] = !ui.showAll[section.key]"
                  >
                    {{ ui.showAll[section.key] ? t('filters.showLess') : t('filters.showMore') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <template #fallback>
        <aside :class="['col-span-12 lg:col-span-3', isRTL ? 'lg:order-2' : 'lg:order-1']"></aside>
      </template>
    </ClientOnly>

    <!-- Products column -->
    <section :class="['col-span-12 lg:col-span-9', isRTL ? 'lg:order-1' : 'lg:order-2']">
      <!-- Top toolbar -->
      <div class="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm mb-4">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div class="md:col-span-5">
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

          <div class="md:col-span-4">
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

          <div class="md:col-span-3">
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
      <div v-if="errorMsg"
           class="mb-4 rounded-md border border-red-300/60 bg-red-50 text-red-700 px-4 py-2 text-sm">
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
          key="catalog-grid"
          :title="t('products')"
          :products="items"
          :rows="rowsForGrid"
          :products-per-row="4"
          :show-rewards="true"
          :show-add="true"
          :show-qty="true"
          container-class="max-w-screen-2xl"
        />

        <div v-if="meta && !isInfinite" class="mt-6 flex items-center justify-center gap-2 flex-wrap">
          <button class="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  :disabled="Number(meta?.current_page) <= 1"
                  @click="goPage(Number(meta?.current_page) - 1)">{{ t('pagination.prev') }}</button>

          <template v-for="(it, idx) in paginationItems" :key="idx">
            <button v-if="it.type==='page'"
                    class="px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                    :class="it.active ? 'bg-gray-900 text-white hover:bg-gray-900' : ''"
                    @click="!it.active && goPage(it.value)">
              {{ it.value }}
            </button>
            <span v-else class="px-2 text-gray-500">…</span>
          </template>

          <button class="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  :disabled="Number(meta?.current_page) >= Number(meta?.last_page || lastFromMeta(meta))"
                  @click="goPage(Number(meta?.current_page) + 1)">{{ t('pagination.next') }}</button>
        </div>

        <div v-if="isInfinite" class="mt-6 flex flex-col items-center gap-3">
          <div ref="infiniteSentinel" class="h-1 w-full"></div>
          <div v-if="pending" class="text-sm text-gray-500">{{ t('infinite.loading') }}</div>
          <button v-else-if="canLoadMore"
                  class="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  @click="sel.page += 1; updateRoute()">
            {{ t('infinite.loadMore') }}
          </button>
          <div v-else class="text-sm text-gray-500">{{ t('infinite.noMore') }}</div>
        </div>
      </template>
    </section>
  </div>
</template>

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
      "newToOld": "Newest → Oldest",
      "oldToNew": "Oldest → Newest"
    },
    "perPage": "Per page",
    "perPageAll": "All",
    "pagination": { "prev": "Prev", "next": "Next" },
    "filters": {
      "active": "Active filters",
      "clearAll": "Clear all",
      "clear": "Clear",
      "selectedSuffix": "selected",
      "remove": "Remove {label}",
      "searchPlaceholder": "Search {label}…",
      "showMore": "Show more",
      "showLess": "Show less"
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
      "newToOld": "Yeni → Eski",
      "oldToNew": "Eski → Yeni"
    },
    "perPage": "Sayfa başına",
    "perPageAll": "Tümü",
    "pagination": { "prev": "Önceki", "next": "Sonraki" },
    "filters": {
      "active": "Aktif filtreler",
      "clearAll": "Tümünü temizle",
      "clear": "Temizle",
      "selectedSuffix": "seçili",
      "remove": "{label} filtresini kaldır",
      "searchPlaceholder": "{label} ara…",
      "showMore": "Daha fazla",
      "showLess": "Daha az"
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