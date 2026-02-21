// composables/catalog/useCatalogSeo.ts
import { computed } from 'vue'
import { useSeoMeta, useHead, useRuntimeConfig, useRequestURL } from '#imports'
import { useI18n } from 'vue-i18n'
import { useRoute } from '#imports'

declare function useSwitchLocalePath(): (code: string) => string

export function useCatalogSeo(opts: {
  entryType: ReturnType<typeof import('./useCatalogState').useCatalogState>['entryType'],
  sel: ReturnType<typeof import('./useCatalogState').useCatalogState>['sel'],
  facets: any,
  breadcrumbs: () => { label: string; to?: string }[],
  t: (k: string, p?: any) => string,
  siteNameFromI18n: () => string,
  overrideTitle?: import('vue').ComputedRef<string | undefined>,
  overrideDescription?: import('vue').ComputedRef<string | undefined>,
  lastPage?: import('vue').ComputedRef<number>   // ✅ NEW
}) {
  const { public: pub } = useRuntimeConfig()
  const { locale, locales, localeProperties } = useI18n()
  const switchLocalePath = (globalThis as any).useSwitchLocalePath?.() ?? useSwitchLocalePath?.()
  const reqURL = useRequestURL()

  const configuredSite = (pub?.SITE_URL || pub?.siteUrl || '')
    .toString()
    .trim()
    .replace(/\/+$/, '')

  const reqOrigin =
    (reqURL?.origin && reqURL.origin !== 'null')
      ? reqURL.origin
      : (typeof window !== 'undefined' ? window.location.origin : '')

  const origin = (configuredSite || reqOrigin || '').replace(/\/+$/, '')

  const currentPath = computed(() =>
    reqURL?.pathname ||
    (typeof window !== 'undefined'
      ? new URL(window.location.href).pathname
      : '/')
  )

  const currentSearch = computed(() =>
    reqURL?.search ||
    (typeof window !== 'undefined'
      ? new URL(window.location.href).search
      : '')
  )

  // =============================
  // CANONICAL
  // =============================
  const canonicalUrl = computed(() => {
    if (!origin) return undefined

    const params = new URLSearchParams(currentSearch.value)
    const page = Number(params.get('page') || '1')

    let url = `${origin}${currentPath.value}`

    if (page > 1) {
      url += `?page=${page}`
    }

    return url
  })

  // =============================
  // TITLE + DESCRIPTION
  // =============================
  const humanContext = computed(() => opts.t('breadcrumbs.shop'))
  const siteName = computed(() => opts.siteNameFromI18n() || 'Store')

  const titleBase = computed(() =>
    opts.sel.q?.trim()
      ? `${humanContext.value}: ${opts.sel.q}`
      : humanContext.value
  )

  const dynamicTitle = computed(() =>
    `${titleBase.value} | ${siteName.value}`
  )

  const dynamicDescription = computed(() => {
    const parts: string[] = []

    if (opts.sel.q?.trim())
      parts.push(`Searching for “${opts.sel.q}”`)

    if (opts.sel.brands.length)
      parts.push(`Brands: ${opts.sel.brands.join(', ')}`)

    if (opts.sel.categories.length)
      parts.push(`Categories: ${opts.sel.categories.join(', ')}`)

    const body = parts.length
      ? parts.join(' • ')
      : 'Browse products and filter to find what you need.'

    return body.slice(0, 300)
  })

  const finalTitle = computed(() =>
    opts.overrideTitle?.value || dynamicTitle.value
  )

  const finalDescription = computed(() =>
    opts.overrideDescription?.value || dynamicDescription.value
  )

  useSeoMeta({
    title: finalTitle,
    description: finalDescription,
    ogTitle: finalTitle,
    ogDescription: finalDescription,
    ogType: 'website',
    ogUrl: canonicalUrl,
    ogSiteName: siteName.value,
    twitterCard: 'summary_large_image',
  })

  // =============================
  // PAGINATION (prev / next)
  // =============================
  const route = useRoute()

  useHead(() => {
    const pageParam = Number(route.query.page || 1)

    if (pageParam <= 1) return {}

    const links: any[] = []

    // 🔥 Remove auto alternates by replacing them
    links.push(
      { rel: 'canonical', href: `${origin}${route.path}?page=${pageParam}` }
    )

    if (switchLocalePath && locales?.value?.length) {
      for (const l of locales.value) {
        const basePath = switchLocalePath(l.code).split('?')[0]

        links.push({
          rel: 'alternate',
          hreflang: l.code,
          href: `${origin}${basePath}?page=${pageParam}`
        })
      }

      const defaultBase = switchLocalePath('en').split('?')[0]

      links.push({
        rel: 'alternate',
        hreflang: 'x-default',
        href: `${origin}${defaultBase}?page=${pageParam}`
      })
    }

    return {
      link: links
    }
  })
}