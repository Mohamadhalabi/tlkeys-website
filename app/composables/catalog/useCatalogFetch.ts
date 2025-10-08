import { ref, computed, watch, nextTick, onMounted, onServerPrefetch } from 'vue'
import { useNuxtApp, useRoute, useRouter, useRuntimeConfig } from '#imports'

export type FacetItem = { id?: number|string; slug: string; name: string; count: number }
export type AttrFacet  = { slug: string; name: string; priority: number; items: FacetItem[] }

export function useCatalogFetch(state: ReturnType<typeof import('./useCatalogState').useCatalogState>) {
  const { $customApi } = useNuxtApp()
  const route   = useRoute()
  const router  = useRouter()
  const { public: { API_BASE_URL } } = useRuntimeConfig()

  const items    = ref<any[]>([])
  const meta     = ref<any | null>(null)
  const facets   = ref<{ brands: FacetItem[]; models: FacetItem[]; categories: FacetItem[]; manufacturers: FacetItem[]; attributes?: AttrFacet[] } | null>(null)
  const pending  = ref(false)
  const errorMsg = ref('')
  const isInfinite = computed(() => state.sel.perPage === 'all')
  const CHUNK = 25

  // ---------- helpers ----------
  const parseQ = (fp?: string): Record<string, any> => {
    if (!fp) return {}
    const qs = fp.split('?')[1] || ''
    return Object.fromEntries(new URLSearchParams(qs))
  }
  const num = (v:any) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : 1
  }
  const equalExceptPage = (a:Record<string,any>={}, b:Record<string,any>={}) => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) {
      if (k === 'page') continue
      if (a[k] !== b[k]) return false
    }
    return true
  }
  function stableStringify(obj: Record<string, any>): string {
    const sorted: Record<string, any> = {}
    Object.keys(obj || {}).sort().forEach(k => {
      const v = (obj as any)[k]
      if (Array.isArray(v)) sorted[k] = [...v].sort()
      else if (v && typeof v === 'object') sorted[k] = JSON.parse(stableStringify(v))
      else sorted[k] = v
    })
    return JSON.stringify(sorted)
  }
  const hasKeys = (o:any) => o && typeof o === 'object' && Object.keys(o).length > 0

  // Include active boolean/flag query params (promotion, free-shipping, etc.)
  const activeFlags = computed(() => {
    const out: Record<string, any> = {}
    state.flagKeys.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(route.query, k)) {
        const qv = (route.query as any)[k]
        out[k] = qv === '' ? 1 : qv
      }
    })
    return out
  })

  function unwrapApi(res: any) {
    const body  = (res && typeof res === 'object' && 'data' in res && !Array.isArray(res.data)) ? res.data : res
    const items = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : [])
    const meta  = (body && body.meta) ?? (res && res.meta) ?? null
    return { items, meta, body }
  }

  function prettify(slug: string) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
  }

  function mapApiProduct(p: any) {
    const discRaw = (p?.discount?.data ?? p?.discount) || null
    const toNum = (v:any)=> Number.isFinite(Number(v)) ? Number(v) : null
    const type  = discRaw?.type === 'percent' || discRaw?.type === 'fixed' ? discRaw?.type : null
    const value = toNum(discRaw?.value)
    const now   = Date.now()
    const active = !!discRaw?.active &&
      type && value != null &&
      (discRaw?.start_date ? now >= Date.parse(discRaw.start_date) : true) &&
      (discRaw?.end_date   ? now <= Date.parse(discRaw.end_date)   : true)

    const stockRaw =
      p?.quantity ?? p?.stock ?? p?.available_quantity ?? p?.inventory?.quantity ?? null
    const stock = stockRaw == null ? null : (Number.isFinite(Number(stockRaw)) ? Number(stockRaw) : null)

    return {
      id: p.id,
      name: p.title ?? p.short_title ?? '',
      image: p.image,
      price: p.price,
      regular_price: p.regular_price ?? null,
      sale_price:    p.sale_price ?? null,
      table_price:   Array.isArray(p?.table_price) ? p.table_price : null,
      discount_type:  active ? type : null,
      discount_value: active ? value : null,
      discount_start_date: discRaw?.start_date ?? null,
      discount_end_date:   discRaw?.end_date   ?? null,
      display_euro_price: p.display_euro_price,
      euro_price: p.euro_price,
      stock,
      sku: p.sku ?? '',
      category: (Array.isArray(p?.categories) && p.categories[0]?.name) ? String(p.categories[0].name) : '',
      categorySlug: (Array.isArray(p?.categories) && p.categories[0]?.slug) ? String(p.categories[0].slug).toLowerCase() : '',
      slug: p.slug,
      href: p.slug ? `/products/${p.slug}` : `/products/${p.id}`,
      freeShipping: p?.is_free_shipping === 1 || p?.is_free_shipping === '1' || p?.is_free_shipping === true,
      hide_price: Number(p?.hide_price ?? 0) === 1,
      requires_serial: (Array.isArray(p?.categories) ? p.categories : []).some((c:any) => Number(c?.id) === 47 || Number(c?.id) === 48),
    }
  }

  const showAttrFilters = computed(() => !(state.entryType.value === 'manufacturer' && state.sel.categories.length === 0))

  // -------- in-flight guard + abort (only the latest fetch may update state)
  let fetchToken = 0
  let controller: AbortController | null = null

  async function fetchOnce() {
    const myToken = ++fetchToken
    // abort any previous request to prevent "<no response> Failed to fetch"
    try { controller?.abort() } catch {}
    controller = typeof AbortController !== 'undefined' ? new AbortController() : null

    pending.value = true
    errorMsg.value = ''

    const effectivePerPage = state.sel.perPage === 'all' ? CHUNK : state.sel.perPage

    // build params
    const baseParams: any = {
      brands:        state.sel.brands,
      categories:    state.sel.categories,
      manufacturers: state.sel.manufacturers,
      models:        state.sel.models,
      // only send attributes if non-empty
      ...(hasKeys(state.sel.attributes) ? { attributes: stableStringify(state.sel.attributes) } : {}),
      search:        state.sel.q,
      sort:          state.sel.sort,
      page:          state.sel.page,
      per_page:      effectivePerPage,
      include:       'table_price,categories',
      attr_facets:   showAttrFilters.value ? 1 : 0,
      ...activeFlags.value,
    }

    // small helper: retry once on transient failures
    const attempt = async (retry=false) => {
      const res = await $customApi(`${API_BASE_URL}/catalog`, {
        method: 'GET',
        params: baseParams,
        // if your $customApi uses fetch under the hood, this will work;
        // if it uses axios, it will be ignored safely.
        signal: controller?.signal,
      })
      return res
    }

    try {
      let res
      try {
        res = await attempt(false)
      } catch (e:any) {
        // ignore aborts silently
        if (e?.name === 'AbortError') return
        // retry once for transient network issues
        if (/(Failed to fetch|NetworkError|ECONNRESET|ETIMEDOUT|Network Error)/i.test(String(e?.message || ''))) {
          await new Promise(r => setTimeout(r, 300))
          res = await attempt(true)
        } else {
          throw e
        }
      }
      if (myToken !== fetchToken) return // a newer fetch started, discard

      const { items: list, meta: m, body } = unwrapApi(res)
      const mapped = list.map(mapApiProduct)

      // append only in infinite mode when page > 1; dedupe by id
      if (isInfinite.value && Number(state.sel.page || 1) > 1) {
        const seen = new Set(items.value.map(p => p.id))
        const toAppend = mapped.filter(p => !seen.has(p.id))
        items.value = items.value.concat(toAppend)
      } else {
        items.value = mapped
      }

      meta.value = m

      const fix = (arr: any[] = []): FacetItem[] =>
        arr.map((f: any) => ({
          id: f.id,
          slug: String(f.slug),
          name: (f.name ?? '').toString() || prettify(String(f.slug)),
          count: Number(f.count ?? 0),
        }))

      const baseFacets = body?.facets
        ? {
            brands:        fix(body.facets.brands || []),
            models:        fix(body.facets.models || []),
            categories:    fix(body.facets.categories || []),
            manufacturers: fix(body.facets.manufacturers || []),
          }
        : null

      const attrFacets: AttrFacet[] =
        (showAttrFilters.value && body?.facets?.attributes?.length)
          ? body.facets.attributes
              .map((a: any) => ({
                slug: String(a.slug),
                name: (a.name ?? '').toString() || prettify(String(a.slug)),
                priority: Number(a.priority ?? 0),
                items: fix(a.items || []),
              }))
              .filter((a: AttrFacet) => a.items.length > 0)
              .sort((x:AttrFacet, y:AttrFacet) => y.priority - x.priority || x.name.localeCompare(y.name))
          : []

      const onlyNonEmpty = (o: any) => {
        const out: any = {}
        if (o.brands?.length)        out.brands = o.brands
        if (o.models?.length)        out.models = o.models
        if (o.categories?.length)    out.categories = o.categories
        if (o.manufacturers?.length) out.manufacturers = o.manufacturers
        if (attrFacets.length)       out.attributes = attrFacets
        return Object.keys(out).length ? out : null
      }

      facets.value = baseFacets ? onlyNonEmpty(baseFacets) : null
    } catch (e:any) {
      if (myToken !== fetchToken) return
      // swallow aborts
      if (e?.name === 'AbortError') return
      errorMsg.value = e?.data?.message || e?.message || 'Failed to load catalog'
    } finally {
      if (myToken === fetchToken) pending.value = false
    }
  }

  // ===== First fetch =====
  onServerPrefetch(async () => {
    await fetchOnce()
  })
  onMounted(async () => {
    items.value = []
    meta.value = null
    facets.value = null
    await fetchOnce()
  })

  // ===== Route-driven refetch; normalize URL to page=1 when non-page params change =====
  watch(
    () => route.fullPath,
    async (cur, prev) => {
      const curQ  = parseQ(cur)
      const prevQ = parseQ(prev)

      const onlyPageIncrement =
        isInfinite.value &&
        !!prev &&
        equalExceptPage(curQ, prevQ) &&
        num(curQ.page) === num(prevQ.page) + 1

      if (!equalExceptPage(curQ, prevQ)) {
        if (curQ.page && curQ.page !== '1') {
          const { page, ...newQ } = curQ
          await router.replace({ path: route.path, query: newQ })
          return
        }
        state.sel.page = 1
      }

      await nextTick()

      if (!onlyPageIncrement) {
        items.value = []
        meta.value = null
        facets.value = null
      }

      await fetchOnce()
    },
    { flush: 'post' }
  )

  const canLoadMore = computed(() => {
    const m = meta.value
    if (!m) return false
    const current = Number(m.current_page || state.sel.page || 1)
    const last    = Number(m.last_page || 1)
    return current < last
  })

  return { items, meta, facets, pending, errorMsg, isInfinite, CHUNK, fetchOnce, canLoadMore }
}
