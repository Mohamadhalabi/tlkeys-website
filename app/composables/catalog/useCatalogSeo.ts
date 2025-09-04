import { computed } from 'vue'
import { useSeoMeta, useHead, useRuntimeConfig } from '#imports'

export function useCatalogSeo(opts: {
  entryType: ReturnType<typeof import('./useCatalogState').useCatalogState>['entryType'],
  sel: ReturnType<typeof import('./useCatalogState').useCatalogState>['sel'],
  facets: any,
  breadcrumbs: () => { label: string; to?: string }[],
  t: (k:string, p?:any)=>string,
  siteNameFromI18n: () => string,
  // ✅ NEW (optional)
  overrideTitle?: import('vue').ComputedRef<string | undefined>,
  overrideDescription?: import('vue').ComputedRef<string | undefined>,
}) {
  const { public: { SITE_URL } } = useRuntimeConfig()

  const hasQuery = computed(() => typeof window !== 'undefined'
    ? new URL(window.location.href).search.replace('?','').length > 0
    : true // SSR assume true; Nuxt will replace once mounted
  )
  const shouldNoindex = hasQuery
  const canonicalUrl = computed(() => {
    const base = (SITE_URL || '').replace(/\/+$/, '')
    if (!base) return undefined
    if (typeof window !== 'undefined') {
      const u = new URL(window.location.href)
      return shouldNoindex.value ? `${base}${u.pathname}` : `${base}${u.pathname}${u.search}`
    }
    return undefined
  })

  const humanContext = computed(() => {
    if (opts.entryType.value === 'category') return opts.t('breadcrumbs.shop')
    if (opts.entryType.value === 'manufacturer') return opts.t('breadcrumbs.shop')
    if (opts.entryType.value === 'brand') return opts.t('breadcrumbs.shop')
    return opts.t('breadcrumbs.shop')
  })

  const siteName = computed(() => opts.siteNameFromI18n() || 'Store')
  const titleBase = computed(() =>
    opts.sel.q?.trim()
      ? `${humanContext.value}: ${opts.sel.q}`
      : humanContext.value
  )
  const dynamicTitle = computed(() => `${titleBase.value} | ${siteName.value}`)

  const dynamicDescription = computed(() => {
    const parts: string[] = []
    if (opts.sel.q?.trim()) parts.push(opts.t('seo.searchingFor', { q: opts.sel.q }) || `Searching for “${opts.sel.q}”`)
    if (opts.sel.brands.length)        parts.push(`${opts.t('facets.brands')}: ${opts.sel.brands.join(', ')}`)
    if (opts.sel.categories.length)    parts.push(`${opts.t('facets.categories')}: ${opts.sel.categories.join(', ')}`)
    if (opts.sel.manufacturers.length) parts.push(`${opts.t('facets.manufacturers')}: ${opts.sel.manufacturers.join(', ')}`)
    if (opts.sel.models.length)        parts.push(`${opts.t('facets.models')}: ${opts.sel.models.join(', ')}`)
    const body = parts.length ? parts.join(' • ') : opts.t('seo.defaultDesc') || 'Browse products, filter and sort to find what you need.'
    return body.slice(0, 300)
  })

  // ✅ Prefer overrides from parent (slug page). If not provided, use dynamic values.
  const finalTitle = computed(() => opts.overrideTitle?.value || dynamicTitle.value)
  const finalDescription = computed(() => opts.overrideDescription?.value || dynamicDescription.value)

  useSeoMeta({
    title: finalTitle,
    description: finalDescription,
    ogTitle: finalTitle,
    ogDescription: finalDescription,
    ogType: 'website',
    ogUrl: canonicalUrl,
    twitterCard: 'summary_large_image',
  })

  useHead(() => ({
    link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
  }))
}
