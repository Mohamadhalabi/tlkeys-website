<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, useRoute, useRuntimeConfig, useSeoMeta, useHead, useCookie, useNuxtApp } from '#imports'
import ProductGrid from '~/components/products/ProductGrid.vue'

/* ---------------- i18n / runtime ---------------- */
const { t, locale } = useI18n()
const route = useRoute()
const runtime = useRuntimeConfig()
const { $customApi } = useNuxtApp()

/* ---------------- Fetch data (SSR-friendly) ---------------- */
type ApiProduct = Record<string, any>
type ApiCategory = { meta_title?: string; meta_description?: string; description?: string } | null

function unwrapApi(res: any) {
  // supports { data: {...} } or plain object
  return (res && typeof res === 'object' && 'data' in res) ? res.data : res
}

/** Small mapper → shape ProductGrid understands */
function mapProduct(p: ApiProduct) {
  const firstImg =
    p?.image ||
    p?.gallery?.[0]?.l?.url ||
    p?.gallery?.[0]?.url ||
    null

  const priceObj = p?.price?.value != null ? p.price : p?.price
  const saleObj  = p?.sale_price?.value != null ? p.sale_price : p?.sale_price

  return {
    id: p.id,
    name: p.title || p.short_title || '',
    image: firstImg,
    price: Number(priceObj?.value ?? priceObj ?? 0),
    regular_price: Number(p?.regular_price ?? 0) || null,
    sale_price: saleObj ? Number(saleObj?.value ?? saleObj) : null,
    sku: p?.sku || '',
    slug: p?.slug,
    href: p?.slug ? `/products/${p.slug}` : (p?.id ? `/products/${p.id}` : '#'),
    category: Array.isArray(p?.categories) && p.categories[0]?.name ? String(p.categories[0].name) : '',
    freeShipping: p?.is_free_shipping === 1 || p?.is_free_shipping === '1' || p?.is_free_shipping === true,
    // optional extras ProductGrid can ignore if not used:
    table_price: Array.isArray(p?.table_price) ? p.table_price : null,
    hide_price: Number(p?.hide_price ?? 0) === 1
  }
}

const currencyCookie = useCookie<string | null>('currency')

const { data, status, error } = await useAsyncData('online-services', async () => {
  const res = await $customApi('/search/online-services-products', {
    method: 'GET',
    headers: {
      currency: currencyCookie.value || 'USD',
      'Accept-Language': String(locale.value || 'en')
    }
  })
  const body = unwrapApi(res)
  return {
    products: Array.isArray(body?.products) ? body.products as ApiProduct[] : [],
    category: (body?.category || null) as ApiCategory
  }
}, { server: true })

const products = computed(() => (data.value?.products || []).map(mapProduct))
const category = computed<ApiCategory>(() => data.value?.category ?? null)

/* ---------------- SEO ---------------- */
const siteName  = runtime.public.siteName || 'Techno Lock Keys'
const siteUrl   = (runtime.public.siteUrl || runtime.public.SITE_URL || '').replace(/\/+$/, '')
const ogImage   = runtime.public.defaultOgImage || '/images/og-image.jpg'

const pageTitle = computed(() =>
  category.value?.meta_title
    ? `${category.value.meta_title}`
    : `${t('online.onlineServices', 'Online Services')} | ${siteName}`
)

const pageDesc = computed(() =>
  category.value?.meta_description ||
  t('seo.onlineServicesDesc', 'Online services from Techno Lock Keys.')
)

const hasQuery = computed(() => Object.keys(route.query || {}).length > 0)
/** For cleanliness we canonicalize to the path only (no query).
 * If you ever add query params to this page, we’ll automatically noindex those.
 */
const canonicalUrl = computed(() =>
  siteUrl ? `${siteUrl}${route.path || '/online-services'}` : undefined
)

useSeoMeta({
  title: pageTitle,
  description: pageDesc,
  ogTitle: pageTitle,
  ogDescription: pageDesc,
  ogType: 'website',
  ogUrl: canonicalUrl,
  ogImage: ogImage,
  twitterCard: 'summary_large_image',
  // If future query params appear on this page, avoid duplicate indexing but allow crawling.
  robots: computed(() => (hasQuery.value ? 'noindex,follow' : 'index,follow')),
  language: computed(() => String(locale.value || 'en'))
})

/* JSON-LD: WebPage + Breadcrumbs + lightweight ItemList of products */
const ldWebPage = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: pageTitle.value,
  description: pageDesc.value,
  url: canonicalUrl.value || ''
}))

const ldBreadcrumbs = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: t('products.home', 'Home'), item: `${siteUrl}/` },
    { '@type': 'ListItem', position: 2, name: t('online.onlineServices', 'Online Services'), item: `${siteUrl}/online-services` }
  ]
}))

const ldItemList = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: products.value.slice(0, 12).map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: siteUrl ? `${siteUrl}${p.href}` : p.href,
    item: {
      '@type': 'Product',
      name: p.name,
      sku: p.sku || undefined,
      image: p.image || undefined,
      offers: (p.price || p.sale_price) ? {
        '@type': 'Offer',
        price: String(p.sale_price ?? p.price ?? ''),
        priceCurrency: currencyCookie.value || 'USD',
        url: siteUrl ? `${siteUrl}${p.href}` : p.href,
        availability: 'https://schema.org/InStock'
      } : undefined
    }
  }))
}))

useHead(() => ({
  link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(ldWebPage.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(ldBreadcrumbs.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(ldItemList.value) }
  ]
}))
</script>

<template>
  <main class="container mx-auto px-4 py-6">
    <!-- Breadcrumbs -->
    <nav aria-label="Breadcrumb" class="mb-4">
      <ol class="flex flex-wrap items-center gap-1 text-sm text-gray-600">
        <li>
          <NuxtLink to="/" class="hover:text-gray-900">
            {{ $t('products.home') }}
          </NuxtLink>
        </li>
        <li class="mx-2 text-gray-400">/</li>
        <li class="text-gray-900 font-medium">
          {{ $t('online.onlineServices') }}
        </li>
      </ol>
    </nav>

    <h1 class="text-center text-2xl md:text-3xl font-semibold mb-6">
      {{ $t('online.onlineServices') }}
    </h1>

    <!-- Products -->
    <section>
      <div v-if="status === 'pending'" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="i in 12" :key="i" class="h-44 bg-gray-200/70 animate-pulse rounded-xl" />
      </div>

      <template v-else>
        <ProductGrid
          v-if="products.length"
          :products="products"
          :rows="Math.max(1, Math.ceil(products.length / 5))"
          :productsPerRow="5"
          :show-rewards="true"
          :show-add="true"
          :show-qty="true"
          container-class="max-w-screen-2xl"
        />

        <div v-else class="text-center text-gray-500 py-10">
          {{ $t('common.nothingFound') || 'No products to show.' }}
        </div>
      </template>
    </section>

    <!-- Category description -->
    <section v-if="category?.description" class="prose max-w-none mt-8 prose-p:leading-7"
             v-html="category.description" />
  </main>
</template>

<style scoped>
/* keep it minimal; Tailwind handles the rest */
</style>
