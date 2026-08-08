<template>
  <main class="pincode-account-page">
    <nav aria-label="breadcrumb" class="border-b bg-gray-50">
      <div class="container mx-auto max-w-7xl px-4">
        <ol class="flex items-center gap-2 py-3 text-sm text-gray-600">
          <li>
            <NuxtLinkLocale :to="localePath('/')" class="hover:text-gray-900 underline-offset-2 hover:underline">
              {{ t('products.home') }}
            </NuxtLinkLocale>
          </li>
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li>
            <NuxtLinkLocale :to="localePath('/pin-code')" class="hover:text-gray-900 underline-offset-2 hover:underline">
              {{ t('pincode.pincode') }}
            </NuxtLinkLocale>
          </li>
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium">
            {{ t('pincode.pincodeonline') }}
          </li>
        </ol>
      </div>
    </nav>

    <!-- ONLINE PIN CODES -->
    <section class="container mx-auto max-w-7xl px-4 mt-6">
      <h1 class="text-center text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
        {{ t('pincode.pincodeonline') }}
      </h1>

      <div class="mx-auto mt-4 max-w-4xl rounded-xl overflow-hidden ring-1 ring-gray-200 bg-white">
        <iframe
          height="520"
          width="100%"
          src="https://vin.prokeytools.com/login"
          class="block"
          style="border: none;"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          title="Pro Key Tools — VIN Login"
        />
      </div>

      <h2 class="mt-4 text-center text-lg font-semibold text-gray-800">
        {{ t('pincode.togetpincode') }}
      </h2>
    </section>

    <!-- PRODUCT GRID (category_id = 4) -->
    <section ref="pinGridEl" class="container mx-auto max-w-7xl px-4 mt-10">
      <ProductGrid
        :key="gridKey"
        :title="t('labels.products')"
        :products="items"
        :rows="rowsForGrid"
        :products-per-row="PRODUCTS_PER_ROW"
        :show-rewards="true"
        :show-add="true"
        :show-qty="true"
        container-class="max-w-screen-2xl"
      />
      <div v-if="loadingItems" class="px-3 py-4 text-sm text-gray-500">{{ t('common.loading') }}</div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ProductGrid from '~/components/products/ProductGrid.vue'

/* i18n / routing */
const { t, locale } = useI18n()
const localePath = useLocalePath()

/* API */
const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp() as any

/* ---------------- helpers ---------------- */
function unwrapApi(res: any) {
  const body = (res && typeof res === 'object' && 'data' in res && !Array.isArray((res as any).data))
    ? (res as any).data
    : res
  const items = Array.isArray(body?.data) ? body.data
              : Array.isArray(body)       ? body
              : []
  const meta = (body && body.meta) ?? (res && (res as any).meta) ?? null
  return { items, meta }
}
function mapApiProduct(p: any) {
  const hasSale = p?.sale_price != null && p?.sale_price !== 0
  const categoryName =
    Array.isArray(p?.categories) && p.categories[0]?.name
      ? String(p.categories[0].name)
      : ''
  const categorySlug =
    Array.isArray(p?.categories) && p.categories[0]?.slug
      ? String(p.categories[0].slug).toLowerCase()
      : ''
  return {
    id: p.id,
    name: p.title ?? p.short_title ?? '',
    image: p.image,
    price: hasSale ? p.sale_price : p.price,
    oldPrice: hasSale ? p.price : null,
    stock: Number.isFinite(Number(p?.quantity ?? p?.stock ?? p?.available_quantity))
      ? Number(p?.quantity ?? p?.stock ?? p?.available_quantity)
      : null,
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
  const size  = Math.max(1, Number(meta?.page_size || 1))
  const calc  = Math.ceil(total / size)
  return calc > 0 ? calc : 1
}
function useLazySection(cb: () => void) {
  const el = ref<HTMLElement | null>(null)
  onMounted(() => {
    if (!el.value) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { cb(); io.disconnect() }
    }, { rootMargin: '200px' })
    io.observe(el.value)
  })
  return { el }
}

/* ---------------- PIN CODE products by category_id = 4 ---------------- */
const items           = ref<any[]>([])
const itemsMeta       = ref<any | null>(null)
const itemsPage       = ref(1)
const itemsLastRef    = ref(1)
const loadingItems    = ref(false)

const PRODUCTS_PER_ROW = 12
const rowsForGrid = 1
const gridKey = 'grid-pincode-account'

async function fetchPinCode(page = 1, rows = rowsForGrid, perRow = PRODUCTS_PER_ROW) {
  try {
    loadingItems.value = true
    const res = await $customApi(`${API_BASE_URL}/homepage-products/featured`, {
      method: 'GET',
      params: {
        page,
        rows,
        per_row: perRow,
        category_id: 4,     // PIN CODE category
        only_featured: 0,   // include all items in this category
        currency: 'USD',
      }
    })
    const { items: list, meta } = unwrapApi(res)
    items.value        = list.map(mapApiProduct)
    itemsMeta.value    = meta
    itemsPage.value    = Number(meta?.current_page || page || 1)
    itemsLastRef.value = lastFromMeta(meta)
  } catch (err) {
    console.error('[PINCODE ACCOUNT] fetch error:', err)
    items.value = []
  } finally {
    loadingItems.value = false
  }
}

/* Lazy-load the grid when it comes into view */
const { el: pinGridEl } = useLazySection(() => fetchPinCode(1, rowsForGrid, PRODUCTS_PER_ROW))

/* ---------------- SEO ---------------- */
const siteName  = 'Techno Lock Keys'
const baseUrl   = 'https://www.tlkeys.com'
const canonical = `${baseUrl}/pincode-account`
const ogImage   = 'https://www.tlkeys.com/images/og-image.jpg'
const logoUrl   = 'https://www.tlkeys.com/images/logo/techno-lock-desktop-logo.webp'

const metaTitle = 'Kia & Hyundai PIN Code Online — Instant VIN to PIN | Techno Lock Keys'
const metaDescription = 'Get Kia and Hyundai PIN codes online from your VIN in seconds. Covers models before 2017 and 2017 onwards. Buy tokens, run the calculation and receive the PIN code by email instantly.'

useSeoMeta({
  title: metaTitle,
  description: metaDescription,

  ogType: 'website',
  ogSiteName: siteName,
  ogTitle: metaTitle,
  ogDescription: metaDescription,
  ogUrl: canonical,
  ogImage,
  ogImageAlt: metaTitle,

  twitterCard: 'summary_large_image',
  twitterTitle: metaTitle,
  twitterDescription: metaDescription,
  twitterImage: ogImage,

  robots: 'index, follow, max-image-preview:large',
})

const sameAs = [
  'https://www.facebook.com/technolockkeys_world/',
  'https://twitter.com/techno_lock',
  'https://api.whatsapp.com/send?phone=971504429045'
]

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: `${baseUrl}/`,
  logo: logoUrl,
  image: logoUrl,
  description: metaDescription,
  sameAs,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Industrial No. 5, behind Maliha Road., shop No. 8',
    addressLocality: 'Sharjah',
    addressCountry: 'AE'
  },
  telephone: '+971504429045',
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'],
    opens: '08:00',
    closes: '18:00'
  }],
  priceRange: '$$',
  paymentAccepted: 'Cash, Credit Card, Paypal'
}

const webPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: metaTitle,
  url: canonical,
  description: metaDescription,
  inLanguage: locale.value,
  isPartOf: { '@type': 'WebSite', name: siteName, url: baseUrl }
}

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Kia & Hyundai PIN Code Online',
  serviceType: 'VIN to PIN code lookup',
  description: metaDescription,
  url: canonical,
  provider: { '@type': 'Organization', name: siteName, url: `${baseUrl}/` },
  areaServed: 'Worldwide',
  brand: [
    { '@type': 'Brand', name: 'Kia' },
    { '@type': 'Brand', name: 'Hyundai' }
  ],
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '15',
    highPrice: '55',
    availability: 'https://schema.org/InStock',
    url: canonical
  }
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I get a Kia or Hyundai PIN code online?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Buy a token for the model year you need, enter the 17-character VIN in the calculator and submit it. The PIN code is shown on screen and sent to your email.'
      }
    },
    {
      '@type': 'Question',
      name: 'Which model years are supported?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Both Kia and Hyundai vehicles built before 2017 and from 2017 onwards are supported. The model year is read automatically from character 10 of the VIN.'
      }
    },
    {
      '@type': 'Question',
      name: 'How long does it take to receive the PIN code?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The lookup runs instantly. The PIN code and key code appear within seconds and arrive by email at the same time.'
      }
    },
    {
      '@type': 'Question',
      name: 'What happens if no PIN code is found for my VIN?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your token is refunded automatically and you can contact our team on WhatsApp with the VIN so we can look it up for you.'
      }
    }
  ]
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: t('products.home'), item: `${baseUrl}/` },
    { '@type': 'ListItem', position: 2, name: t('pincode.pincode'), item: `${baseUrl}/pin-code` },
    { '@type': 'ListItem', position: 3, name: t('pincode.pincodeonline'), item: canonical }
  ]
}

useHead({
  htmlAttrs: { lang: locale.value },
  link: [{ rel: 'canonical', href: canonical }],
  meta: [{ 'http-equiv': 'content-language', content: locale.value }],
  script: [
    { key: 'org-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(orgJsonLd) },
    { key: 'webpage-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(webPageJsonLd) },
    { key: 'service-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(serviceJsonLd) },
    { key: 'faq-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(faqJsonLd) },
    { key: 'breadcrumb-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbJsonLd) }
  ]
})

/* Optional: expose for quick debugging */
if (process.client) (window as any).__pinAccount = { itemsMeta, itemsPage, itemsLastRef }
</script>

<style scoped>
.pincode-account-page { display: block; }
</style>