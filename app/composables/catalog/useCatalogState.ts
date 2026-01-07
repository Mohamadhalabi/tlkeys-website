import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter, useNuxtApp, useRuntimeConfig } from '#imports'

type AttrMap = Record<string, string[]>
type InitialFilters = {
  brands?: string[]
  categories?: string[]
  manufacturers?: string[]
  models?: string[]
}

const managedKeys = ['brands','categories','manufacturers','models','q','search','sort','page','per_page','attributes'] as const
const flagKeys = ['offers','promotion','free-shipping','bundled','new-arrival','lowest-price-guaranteed'] as const
const SHOP_PATH = '/shop'

function parseCsv(v: unknown): string[] {
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean)
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean)
  return []
}
function parsePerPage(v: unknown): number | 'all' {
  const raw = (Array.isArray(v) ? v[0] : v) as string | undefined
  if (!raw) return 25
  if (raw === 'all') return 'all'
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 25
}
function stableStringify(obj: Record<string, string[]>): string {
  const out: Record<string, string[]> = {}
  Object.keys(obj).sort().forEach(k => { out[k] = [...obj[k]].sort() })
  return JSON.stringify(out)
}
function parseAttributesParam(v: unknown): Record<string, string[]> {
  if (!v) return {}
  try {
    const raw = typeof v === 'string' ? JSON.parse(v) : v
    if (!raw || typeof raw !== 'object') return {}
    const out: Record<string, string[]> = {}
    Object.entries(raw as Record<string, any>).forEach(([k, list]) => {
      const arr = Array.isArray(list) ? list : [list]
      const cleaned = arr.map(String).map(s => s.trim().toLowerCase()).filter(Boolean)
      if (cleaned.length) out[k.toLowerCase()] = Array.from(new Set(cleaned)).sort()
    })
    return out
  } catch { return {} }
}

export function useCatalogState(initialFilters?: InitialFilters) {
  const route = useRoute()
  const router = useRouter()

  const mergedFilters = computed(() => {
    const qy = route.query
    return {
      brands:        qy.brands ? parseCsv(qy.brands) : (initialFilters?.brands ?? []),
      categories:    qy.categories ? parseCsv(qy.categories) : (initialFilters?.categories ?? []),
      manufacturers: qy.manufacturers ? parseCsv(qy.manufacturers) : (initialFilters?.manufacturers ?? []),
      models:        qy.models ? parseCsv(qy.models) : (initialFilters?.models ?? []),
      attributes:    parseAttributesParam(qy.attributes),
      q:    (qy.q as string) || (qy.search as string) || '',
      sort: (qy.sort as string) || 'price_desc',
      page: Number(qy.page || 1),
      perPage: parsePerPage(qy.per_page || (qy as any).page_size),
    }
  })

  const entryType = computed<'brand'|'category'|'manufacturer'|'unknown'>(() => {
    if (initialFilters?.categories?.length) return 'category'
    if (initialFilters?.manufacturers?.length) return 'manufacturer'
    if (initialFilters?.brands?.length) return 'brand'
    return 'unknown'
  })

  const sel = reactive({
    brands: [] as string[],
    categories: [] as string[],
    manufacturers: [] as string[],
    models: [] as string[],
    attributes: {} as AttrMap,
    q: '',
    sort: 'price_desc',
    page: 1,
    perPage: 25 as number | 'all'
  })

  const ui = reactive({
    open:   { brands: false, models: false, categories: false, manufacturers: false } as Record<string, boolean>,
    search: { brands: '',    models: '',    categories: '',    manufacturers: ''    } as Record<string, string>,
  })

  // initial hydrate
  {
    const v = mergedFilters.value
    sel.brands = [...v.brands]
    sel.categories = [...v.categories]
    sel.manufacturers = [...v.manufacturers]
    sel.models = [...v.models]
    sel.attributes = { ...v.attributes }
    sel.q = v.q; sel.sort = v.sort; sel.page = v.page; sel.perPage = v.perPage

    ui.open.brands = !!sel.brands.length
    ui.open.models = !!sel.models.length
    ui.open.categories = !!sel.categories.length
    ui.open.manufacturers = !!sel.manufacturers.length
  }

  const routeKey = computed(() => {
    const parts = Object.entries(route.query)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([k,v]) => `${k}=${Array.isArray(v)? v.join(',') : (v ?? '')}`)
      .join('&')
    return `${route.path}?${parts}`
  })
  const gridKey = computed(() => routeKey.value)

  function buildQueryFromSel() {
    const q: Record<string, string> = {}
    if (sel.brands.length)         q.brands         = sel.brands.join(',')
    if (sel.categories.length)     q.categories     = sel.categories.join(',')
    if (sel.manufacturers.length)  q.manufacturers  = sel.manufacturers.join(',')
    if (sel.models.length)         q.models         = sel.models.join(',')

    const hasAttrs = Object.values(sel.attributes || {}).some(arr => (arr?.length ?? 0) > 0)
    if (hasAttrs) q.attributes = stableStringify(sel.attributes)
    if (sel.q)    q.search     = sel.q
    if (sel.sort) q.sort       = sel.sort
    if (sel.page > 1) q.page   = String(sel.page)
    q.per_page = sel.perPage === 'all' ? 'all' : String(sel.perPage || 25)

    const next: Record<string, any> = {}
    Object.keys(route.query).forEach(k => {
      if (!(managedKeys as unknown as string[]).includes(k)) next[k] = (route.query as any)[k]
    })
    Object.assign(next, q)
    return next
  }
  const withoutPage = (q: Record<string, any>) => { const { page, ...rest } = q; return rest }

  function computeTargetPath() {
    const baseCat = (initialFilters?.categories?.[0] || '').toLowerCase()
    const baseMan = (initialFilters?.manufacturers?.[0] || '').toLowerCase()
    const hasAny =
      sel.brands.length || sel.categories.length || sel.manufacturers.length || sel.models.length ||
      Object.values(sel.attributes).some(a => a.length) || !!sel.q
    const hasBaseCat = sel.categories.map(s => s.toLowerCase()).includes(baseCat)
    const hasBaseMan = sel.manufacturers.map(s => s.toLowerCase()).includes(baseMan)

    if (!hasAny && (entryType.value === 'category' || entryType.value === 'manufacturer')) return SHOP_PATH
    if (entryType.value === 'category'     && baseCat && !hasBaseCat) return SHOP_PATH
    if (entryType.value === 'manufacturer' && baseMan && !hasBaseMan) return SHOP_PATH
    return route.path
  }

  function updateRoute(replace = false) {
    const path  = computeTargetPath()
    const query = (path !== route.path) ? withoutPage(buildQueryFromSel()) : buildQueryFromSel()
    return router[replace ? 'replace' : 'push']({ path, query })
  }

  function toggle(list: string[], slug: string) {
    const i = list.indexOf(slug); i >= 0 ? list.splice(i, 1) : list.push(slug)
  }
  function clearGroup(which: 'brands'|'categories'|'manufacturers'|'models') {
    if (which === 'brands') sel.brands = []
    else if (which === 'categories') sel.categories = []
    else if (which === 'manufacturers') sel.manufacturers = []
    else sel.models = []

    const totalAfter =
      sel.brands.length + sel.models.length + sel.categories.length + sel.manufacturers.length +
      Object.values(sel.attributes).reduce((n, a) => n + a.length, 0)

  if (totalAfter === 0) { 
    router.replace({ path: SHOP_PATH })
    return
  }
    applyAndResetPage()
  }
  function toggleAttr(attrSlug: string, subSlug: string) {
    const k = attrSlug.toLowerCase()
    const list = sel.attributes[k] || []
    const i = list.indexOf(subSlug)
    if (i >= 0) list.splice(i, 1)
    else list.push(subSlug)
    if (list.length) sel.attributes[k] = list
    else delete sel.attributes[k]
  }
  function clearAttr(attrSlug: string) {
    const k = attrSlug.toLowerCase()
    if (sel.attributes[k]) delete sel.attributes[k]
  }

  function applyAndResetPage() {
    sel.page = 1
    updateRoute().then(() => {
      if (process.client) window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  return {
    SHOP_PATH, flagKeys, managedKeys,
    routeKey, gridKey,
    entryType, sel, ui,
    mergedFilters, updateRoute,
    toggle, clearGroup, toggleAttr, clearAttr,
    applyAndResetPage,
  }
}
