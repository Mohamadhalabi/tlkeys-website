// composables/catalog/useCatalogSeo.ts
import { computed } from 'vue'
import { useSeoMeta, useHead, useRuntimeConfig, useRequestURL } from '#imports'
import { useI18n } from 'vue-i18n'
// If you use @nuxtjs/i18n, these are auto-imported:
declare function useSwitchLocalePath(): (code: string) => string

export function useCatalogSeo(opts: {
  entryType: ReturnType<typeof import('./useCatalogState').useCatalogState>['entryType'],
  sel: ReturnType<typeof import('./useCatalogState').useCatalogState>['sel'],
  facets: any,
  breadcrumbs: () => { label: string; to?: string }[],
  t: (k:string, p?:any)=>string,
  siteNameFromI18n: () => string,
  overrideTitle?: import('vue').ComputedRef<string | undefined>,
  overrideDescription?: import('vue').ComputedRef<string | undefined>,
}) {
  const { public: pub } = useRuntimeConfig()
  const { locale, locales, localeProperties } = useI18n()
  const switchLocalePath = (globalThis as any).useSwitchLocalePath?.() ?? useSwitchLocalePath?.()
  const reqURL = useRequestURL()

  // ---- Resolve site origin (supports SITE_URL or siteUrl)
  const configuredSite = (pub?.SITE_URL || pub?.siteUrl || '').toString().trim().replace(/\/+$/, '')
  const reqOrigin = (reqURL?.origin && reqURL.origin !== 'null')
    ? reqURL.origin
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const origin = (configuredSite || reqOrigin || '').replace(/\/+$/, '')

  // ---- Current path & search
  const currentPath = computed(() =>
    reqURL?.pathname || (typeof window !== 'undefined' ? new URL(window.location.href).pathname : '/')
  )
  const currentSearch = computed(() =>
    reqURL?.search || (typeof window !== 'undefined' ? new URL(window.location.href).search : '')
  )

  // ---- Canonical + robots
  const hasQuery = computed(() => (currentSearch.value || '').replace('?', '').length > 0)
  const isShopRoot = computed(() => currentPath.value === '/shop')           // ✅ /shop root
  const shouldNoindex = computed(() => hasQuery.value || isShopRoot.value)   // ✅ /shop and /shop?... => noindex

  const canonicalUrl = computed(() => {
    if (!origin) return undefined
    // If query params exist, canonicalize to clean path (no query)
    return `${origin}${currentPath.value}${hasQuery.value ? '' : currentSearch.value}`
  })

  // ---- Human context for title/desc
  const humanContext = computed(() => opts.t('breadcrumbs.shop'))
  const siteName = computed(() => opts.siteNameFromI18n() || 'Store')
  const titleBase = computed(() =>
    opts.sel.q?.trim() ? `${humanContext.value}: ${opts.sel.q}` : humanContext.value
  )
  const dynamicTitle = computed(() => `${titleBase.value} | ${siteName.value}`)

  const dynamicDescription = computed(() => {
    const parts: string[] = []
    if (opts.sel.q?.trim()) parts.push(opts.t('seo.searchingFor', { q: opts.sel.q }) || `Searching for “${opts.sel.q}”`)
    if (opts.sel.brands.length)        parts.push(`${opts.t('facets.brands')}: ${opts.sel.brands.join(', ')}`)
    if (opts.sel.categories.length)    parts.push(`${opts.t('facets.categories')}: ${opts.sel.categories.join(', ')}`)
    if (opts.sel.manufacturers.length) parts.push(`${opts.t('facets.manufacturers')}: ${opts.sel.manufacturers.join(', ')}`)
    if (opts.sel.models.length)        parts.push(`${opts.t('facets.models')}: ${opts.sel.models.join(', ')}`)
    const body = parts.length ? parts.join(' • ') : (opts.t('seo.defaultDesc') || 'Browse products, filter and sort to find what you need.')
    return body.slice(0, 300)
  })

  const finalTitle = computed(() => opts.overrideTitle?.value || dynamicTitle.value)
  const finalDescription = computed(() => opts.overrideDescription?.value || dynamicDescription.value)

  // ---- JSON-LD Breadcrumbs
  const breadcrumbLd = computed(() => {
    try {
      const items = (opts.breadcrumbs?.() || [])
        .map((b, i, arr) => {
          const itemUrl = b.to && origin ? `${origin}${b.to}` : undefined
          return {
            '@type': 'ListItem',
            position: i + 1,
            name: b.label,
            ...(i < arr.length - 1 && itemUrl ? { item: itemUrl } : {}),
          }
        })
        .filter(Boolean)
      if (!items || items.length < 2) return null
      return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items }
    } catch { return null }
  })

  // ---- hreflang for ALL locales (+ x-default)
  const allLocales = computed(() => {
    const arr = Array.isArray(locales.value) ? locales.value : []
    return arr
      .map((l: any) => ({ code: l.code || l, iso: l.iso || l.code || l }))
      .filter((l: any) => !!l.code)
  })

  const altLinks = computed(() => {
    if (!origin) return []
    const links: Array<{ hreflang: string; href: string }> = []
    for (const l of allLocales.value as any[]) {
      let localizedPath = currentPath.value
      if (typeof switchLocalePath === 'function') {
        // Build the localized path that mirrors the CURRENT route in each locale
        localizedPath = switchLocalePath(l.code) || currentPath.value
      }
      const href = `${origin}${localizedPath}`
      const hreflang = (l.iso || l.code).toString()
      links.push({ hreflang, href })
      if (hreflang.includes('_')) {
        links.push({ hreflang: hreflang.replace('_', '-'), href })
      }
    }
    return links
  })

  const ogLocale = computed(() => {
    const lp: any = localeProperties?.value || {}
    return (lp.iso || lp.code || locale.value || 'en').toString().replace('_', '-')
  })
  const ogLocaleAlternates = computed(() =>
    (allLocales.value as any[])
      .map((l:any) => (l.iso || l.code).toString().replace('_', '-'))
      .filter((c:string) => c !== ogLocale.value)
  )

  // ---- SEO meta
  useSeoMeta({
    title: finalTitle,
    description: finalDescription,
    ogTitle: finalTitle,
    ogDescription: finalDescription,
    ogType: 'website',
    ogUrl: canonicalUrl,                 // ✅ og:url
    ogSiteName: siteName.value,
    twitterCard: 'summary_large_image',
  })

  // ---- Head links + robots + JSON-LD + OG locale alternates
  useHead(() => {
    const link: any[] = []
    if (canonicalUrl.value) link.push({ rel: 'canonical', href: canonicalUrl.value }) // ✅ canonical

    // (Optional) hreflang alternates — keep commented if you manage hreflang elsewhere
    // for (const a of altLinks.value) link.push({ rel: 'alternate', hreflang: a.hreflang, href: a.href })

    const meta: any[] = [
      { name: 'robots', content: shouldNoindex.value ? 'noindex,follow' : 'index,follow' },              // ✅ robots
      { 'http-equiv': 'X-Robots-Tag', content: shouldNoindex.value ? 'noindex, follow' : 'index, follow' }, // ✅ header-equivalent
      { property: 'og:locale', content: ogLocale.value },
      ...ogLocaleAlternates.value.map(l => ({ property: 'og:locale:alternate', content: l })),
    ]

    const script: any[] = []
    if (breadcrumbLd.value) {
      script.push({
        key: 'ld-breadcrumbs',
        type: 'application/ld+json',
        innerHTML: JSON.stringify(breadcrumbLd.value),
      })
    }

    return { link, meta, script }
  })
}
