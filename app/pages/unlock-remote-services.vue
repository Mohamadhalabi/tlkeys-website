<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n, useNuxtApp, useRoute, useRuntimeConfig, useSeoMeta, useHead } from '#imports'
import { NuxtImg } from '#components'

/* ---------------- i18n / runtime ---------------- */
const { t, locale, localeProperties } = useI18n()
const isRTL = computed(() => (localeProperties.value?.dir || 'ltr') === 'rtl')
const route = useRoute()
const runtime = useRuntimeConfig()
const { $customApi } = useNuxtApp()

/* ---------------- Data types ---------------- */
type Localized = Record<string, string>
type Row = {
  id: number | string
  image?: string | null
  make: Localized | string
  model: Localized | string
  description: Localized | string
  from?: number | string | null
  to?: number | string | null
}

/* ---------------- Fetch (SSR-friendly) ---------------- */
function unwrapApi(res: any) {
  return (res && typeof res === 'object' && 'data' in res) ? res.data : res
}

const { data, status, error } = await useAsyncData('unlock-remote', async () => {
  const res = await $customApi('/unlock-remote', { method: 'GET' })
  return unwrapApi(res) as Row[]
}, { server: true, default: () => [] })

/* ---------------- Table state ---------------- */
const items = computed<Row[]>(() => Array.isArray(data.value) ? data.value : [])
const searchTerm = ref('')
const perPage = ref(10)
const currentPage = ref(1)

watch(searchTerm, () => { currentPage.value = 1 })
watch(perPage, () => { currentPage.value = 1 })

/* helpers */
const loc = computed(() => String(locale.value || 'en'))
const asText = (v: any): string => {
  if (!v) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    return v[loc.value] || v.en || Object.values(v)[0] || ''
  }
  return String(v)
}
const yearRange = (r: Row) => {
  const from = r.from ?? ''
  const to = r.to ?? ''
  if (!from && !to) return ''
  return `${from || ''}${from && to ? ' - ' : ''}${to || ''}`
}

/* filter + paginate */
const filtered = computed(() => {
  const q = searchTerm.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((r) => {
    const hay = [
      String(r.id ?? ''),
      asText(r.make),
      asText(r.model),
      asText(r.description),
      String(r.from ?? ''),
      String(r.to ?? '')
    ].join(' ').toLowerCase()
    return hay.includes(q)
  })
})

const pageCount = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / (perPage.value || 10)))
)

const pageRows = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filtered.value.slice(start, start + perPage.value)
})

function go(p: number) {
  if (p < 1 || p > pageCount.value) return
  currentPage.value = p
}

/* ---------------- SEO ---------------- */
const siteName = runtime.public.siteName || 'Techno Lock Keys'
const siteUrl  = (runtime.public.siteUrl || runtime.public.SITE_URL || '').replace(/\/+$/, '')
const canonicalUrl = computed(() => siteUrl ? `${siteUrl}${route.path}` : undefined)

const pageTitle = computed(() => `${t('services.unlockServices') || 'Unlock Services'} | ${siteName}`)
const pageDesc  = computed(() =>
  t('services.unlockServicesDesc') ||
  'Unlock / Remote services supported by Techno Lock Keys.'
)

useSeoMeta({
  title: pageTitle,
  description: pageDesc,
  ogTitle: pageTitle,
  ogDescription: pageDesc,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  robots: 'index,follow',
  language: computed(() => String(locale.value || 'en'))
})

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
    { '@type': 'ListItem', position: 1, name: t('products.home') || 'Home', item: `${siteUrl}/` },
    { '@type': 'ListItem', position: 2, name: t('services.unlockServices') || 'Unlock Services', item: `${siteUrl}/unlock-remote-services` }
  ]
}))

useHead(() => ({
  link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(ldWebPage.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(ldBreadcrumbs.value) }
  ]
}))

/* ---------------- UI actions ---------------- */
function downloadPDF() {
  window.open('/pdf/Techno-lock-keys-unlock-service-list.pdf', '_blank')
}
</script>

<template>
  <main class="container mx-auto px-4 py-6" :dir="isRTL ? 'rtl' : 'ltr'">
    <!-- Header / PDF -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <h1 class="text-2xl md:text-3xl font-semibold text-center sm:text-left">
        {{ $t('services.unlockServices') }}
      </h1>
      <button type="button"
              class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 bg-white hover:bg-gray-50 shadow-sm"
              @click="downloadPDF">
        <img src="https://www.tlkeys.com/static/images/pdf-logo.png" alt="PDF" class="h-6 w-6" />
        <span class="text-sm font-medium">PDF</span>
      </button>
    </div>

    <!-- Search + page size -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center mb-4">
      <input
        v-model="searchTerm"
        type="search"
        :placeholder="$t('common.search') || 'Type to search'"
        class="w-full sm:flex-1 rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
      />
      <label class="inline-flex items-center gap-2 text-sm text-gray-600">
        <span>{{ $t('pagination.perPage') || 'Per page' }}</span>
        <select v-model.number="perPage"
                class="rounded-lg border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </label>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto rounded-2xl border bg-white/80 backdrop-blur shadow-sm">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-50 text-gray-700">
          <tr class="[&>th]:py-3 [&>th]:px-3">
            <th class="text-left w-20">#</th>
            <th class="text-left">{{ $t('common.image') || 'Image' }}</th>
            <th class="text-left">{{ $t('common.make') || 'Make' }}</th>
            <th class="text-left">{{ $t('common.model') || 'Model' }}</th>
            <th class="text-left">{{ $t('common.description') || 'Description' }}</th>
            <th class="text-left">{{ $t('common.yearRange') || 'From - To' }}</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading -->
          <tr v-if="status === 'pending'">
            <td colspan="6" class="px-3 py-8 text-center text-gray-500">
              {{ $t('loading') || 'Loading…' }}
            </td>
          </tr>

          <!-- Error -->
          <tr v-else-if="error">
            <td colspan="6" class="px-3 py-8 text-center text-red-600">
              {{ $t('errors.generic') || 'Failed to load data.' }}
            </td>
          </tr>

          <!-- Rows -->
          <tr v-else v-for="row in pageRows" :key="row.id" class="border-t align-top">
            <td class="px-3 py-3 text-gray-700">{{ row.id }}</td>
            <td class="px-3 py-3">
              <div class="w-28 h-20 rounded-lg border bg-white overflow-hidden">
                <NuxtImg v-if="row.image" :src="row.image" alt="thumb" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full grid place-items-center text-xs text-gray-400">—</div>
              </div>
            </td>
            <td class="px-3 py-3 text-gray-800">
              {{ typeof row.make === 'string' ? row.make : (row.make[$i18n.locale] || row.make.en || Object.values(row.make)[0]) }}
            </td>
            <td class="px-3 py-3 text-gray-800">
              {{ typeof row.model === 'string' ? row.model : (row.model[$i18n.locale] || row.model.en || Object.values(row.model)[0]) }}
            </td>
            <td class="px-3 py-3 text-gray-700">
              {{ typeof row.description === 'string'
                   ? row.description
                   : (row.description[$i18n.locale] || row.description.en || Object.values(row.description)[0]) }}
            </td>
            <td class="px-3 py-3 text-gray-800">
              {{ (row.from || row.to) ? `${row.from || ''}${row.from && row.to ? ' - ' : ''}${row.to || ''}` : '' }}
            </td>
          </tr>

          <!-- Empty -->
          <tr v-if="status !== 'pending' && !error && pageRows.length === 0">
            <td colspan="6" class="px-3 py-8 text-center text-gray-500">
              {{ $t('common.nothingFound') || 'No results.' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pageCount > 1" class="mt-4 flex flex-wrap items-center justify-center gap-2">
      <button class="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40"
              :disabled="currentPage <= 1"
              @click="go(currentPage - 1)">
        ‹ {{ $t('pagination.prev') || 'Prev' }}
      </button>

      <button v-for="p in pageCount" :key="p"
              class="px-3 py-1.5 rounded-lg border"
              :class="p === currentPage ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'"
              @click="go(p)">
        {{ p }}
      </button>

      <button class="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40"
              :disabled="currentPage >= pageCount"
              @click="go(currentPage + 1)">
        {{ $t('pagination.next') || 'Next' }} ›
      </button>
    </div>
  </main>
</template>

<style scoped>
/* minimal extras; Tailwind covers layout */
</style>
