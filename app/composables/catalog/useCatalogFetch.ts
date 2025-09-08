import { ref, computed, watch, nextTick } from 'vue'
import { useAsyncData, useNuxtApp, useRoute, useRuntimeConfig } from '#imports'

export type FacetItem = { id?: number|string; slug: string; name: string; count: number }
export type AttrFacet  = { slug: string; name: string; priority: number; items: FacetItem[] }

export function useCatalogFetch(state: ReturnType<typeof import('./useCatalogState').useCatalogState>) {
  const { $customApi } = useNuxtApp()
  const route = useRoute()
  const { public: { API_BASE_URL } } = useRuntimeConfig()

  const items    = ref<any[]>([])
  const meta     = ref<any | null>(null)
  const facets   = ref<{ brands: FacetItem[]; models: FacetItem[]; categories: FacetItem[]; manufacturers: FacetItem[]; attributes?: AttrFacet[] } | null>(null)
  const pending  = ref(false)
  const errorMsg = ref('')
  const isInfinite = computed(() => state.sel.perPage === 'all')
  const CHUNK = 25

  const keyForSSR = computed(() => `catalog:${JSON.stringify({
    brands: state.sel.brands,
    categories: state.sel.categories,
    manufacturers: state.sel.manufacturers,
    models: state.sel.models,
    attributes: state.sel.attributes,
    q: state.sel.q,
    sort: state.sel.sort,
    page: state.sel.page,
    per_page: state.sel.perPage
  })}`)

  function stableStringify(obj: Record<string, string[]>): string {
    const out: Record<string, string[]> = {}
    Object.keys(obj || {}).sort().forEach(k => { out[k] = [...obj[k]].sort() })
    return JSON.stringify(out)
  }

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

  // --- de-dupe: skip if params key didn’t change
  const lastFetchKey = ref<string>('')

  async function fetchOnce() {
    const currentKey = keyForSSR.value
    if (currentKey === lastFetchKey.value) return
    lastFetchKey.value = currentKey

    pending.value = true
    errorMsg.value = ''
    const effectivePerPage = state.sel.perPage === 'all' ? CHUNK : state.sel.perPage

    try {
      const params: any = {
        brands:        state.sel.brands,
        categories:    state.sel.categories,
        manufacturers: state.sel.manufacturers,
        models:        state.sel.models,
        attributes:    stableStringify(state.sel.attributes),
        search:        state.sel.q,
        sort:          state.sel.sort,
        page:          state.sel.page,
        per_page:      effectivePerPage,
        include:       'table_price,categories',
        attr_facets:   showAttrFilters.value ? 1 : 0,
      }
      state.flagKeys.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(route.query, k)) {
          params[k] = (route.query as any)[k] === '' ? 1 : (route.query as any)[k]
        }
      })

      const res = await $customApi(`${API_BASE_URL}/catalog`, { method: 'GET', params })
      const { items: list, meta: m, body } = unwrapApi(res)

      const mapped = list.map(mapApiProduct)
      // append only when infinite + page>1; otherwise replace
      if (isInfinite.value && Number(state.sel.page || 1) > 1) items.value = items.value.concat(mapped)
      else items.value = mapped

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
    } catch (e: any) {
      errorMsg.value = e?.data?.message || e?.message || 'Failed to load catalog'
    } finally {
      pending.value = false
    }
  }

  // ===== Initial load (SSR on server; hydrated on client)
  useAsyncData(keyForSSR, () => fetchOnce(), { server: true, immediate: true })

  // ===== Route-driven refetch (keep old items when ONLY page++ in infinite mode)
  const num = (v:any) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : 1 // default to page 1 when missing/invalid
  }
  function equalExceptPage(a:Record<string,any> = {}, b:Record<string,any> = {}) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) {
      if (k === 'page') continue
      if (a[k] !== b[k]) return false
    }
    return true
  }

  watch(
    () => [route.path, route.query],
    async (cur, prev) => {
      const [curPath, curQ]   = cur
      const [prevPath, prevQ] = prev || []

      const onlyPageIncrement =
        isInfinite.value &&
        !!prev &&
        curPath === prevPath &&
        equalExceptPage(curQ as any, prevQ as any) &&
        num((curQ as any)?.page) === num((prevQ as any)?.page) + 1

      await nextTick()

      if (!onlyPageIncrement) {
        items.value = []
        meta.value = null
        facets.value = null
      }
      await fetchOnce()
    },
    { deep: true, flush: 'post', immediate: false } // SSR already did the first fetch
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
