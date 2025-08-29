<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRequestURL, useNuxtApp, useRuntimeConfig, useHead } from '#imports'

type MultiImg = { s?: { url: string }, m?: { url: string }, l?: { url: string } }
type DownloadItem = {
  slug: string
  title?: string | null // for SEO/schema only (not rendered)
  image?: MultiImg | null
}
type DownloadsResponse = {
  total: number
  page: number
  total_pages: number
  result: DownloadItem[]
}

const route = useRoute()
const reqUrl = useRequestURL()
const { $customApi } = useNuxtApp()
const { public: { API_BASE_URL, SITE_NAME = 'Techno Lock Keys' } } = useRuntimeConfig()

/* ---------------- Pagination & State ---------------- */
const perPage = computed(() => {
  const l = Number(route.query.length ?? 12)
  return Number.isFinite(l) && l > 0 ? l : 12
})

const items = ref<DownloadItem[]>([])
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const firstLoad = ref(true)
const sentinel = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null
const seen = new Set<string>()

function imgUrl(img?: MultiImg | null) {
  return img?.l?.url || img?.m?.url || img?.s?.url || ''
}

async function fetchPage(p: number) {
  if (loading.value || (p > totalPages.value && !firstLoad.value)) return
  loading.value = true
  errorMsg.value = null
  try {
    const res = await $customApi(
      `${API_BASE_URL}/downloads?page=${p}&length=${perPage.value}`,
      { method: 'GET' }
    )
    const payload = (res?.data?.data ?? res?.data ?? res) as DownloadsResponse

    total.value = payload.total ?? total.value
    totalPages.value = payload.total_pages ?? totalPages.value

    for (const it of payload.result ?? []) {
      if (!seen.has(it.slug)) { items.value.push(it); seen.add(it.slug) }
    }
    page.value = p + 1
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message || e?.data?.message || e?.message || 'Request failed'
  } finally {
    loading.value = false
    firstLoad.value = false
  }
}

function onIntersect(entries: IntersectionObserverEntry[]) {
  for (const e of entries) {
    if (e.isIntersecting && !loading.value && page.value <= totalPages.value) fetchPage(page.value)
  }
}

onMounted(async () => {
  await fetchPage(1)
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(onIntersect, { rootMargin: '400px 0px 0px 0px' })
    if (sentinel.value) observer.observe(sentinel.value)
  }
})
onBeforeUnmount(() => { observer?.disconnect(); observer = null })

/* ---------------- SEO + Schema ---------------- */
const canonical = computed(() => {
  const base = `${reqUrl.protocol}//${reqUrl.host}`
  const path = '/downloads'
  const q = new URLSearchParams()
  if (perPage.value !== 12) q.set('length', String(perPage.value))
  // Infinite list: canonical should be the base list without page
  return q.toString() ? `${base}${path}?${q.toString()}` : `${base}${path}`
})

const pageTitle = computed(() => `Downloads (${total.value || 0}) – ${SITE_NAME}`)
const pageDesc = 'Browse and download software, drivers, and manuals for locksmith devices and tools.'

const itemListSchema = computed(() => {
  const base = `${reqUrl.protocol}//${reqUrl.host}`
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Downloads',
    numberOfItems: items.value.length,
    itemListElement: items.value.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${base}/downloads/${it.slug}`,
      item: {
        '@type': 'CreativeWork',
        name: it.title || it.slug,
        url: `${base}/downloads/${it.slug}`,
        image: imgUrl(it.image) || undefined
      }
    }))
  }
})

const breadcrumbSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${reqUrl.protocol}//${reqUrl.host}/` },
    { '@type': 'ListItem', position: 2, name: 'Downloads', item: canonical.value }
  ]
}))

useHead(() => ({
  title: pageTitle.value,
  meta: [
    { name: 'description', content: pageDesc },
    { name: 'robots', content: 'index,follow' },
    { property: 'og:title', content: pageTitle.value },
    { property: 'og:description', content: pageDesc },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonical.value },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: pageTitle.value },
    { name: 'twitter:description', content: pageDesc }
  ],
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      key: 'ld-breadcrumb-downloads',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(breadcrumbSchema.value),
      tagPosition: 'head'
    },
    {
      key: 'ld-itemlist-downloads',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(itemListSchema.value),
      tagPosition: 'head'
    }
  ]
}))
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <nav aria-label="Breadcrumb" class="text-sm mb-3">
      <ol class="flex flex-wrap items-center gap-1 text-gray-500">
        <li>
          <NuxtLinkLocale to="/" class="hover:text-gray-900 hover:underline">Home</NuxtLinkLocale>
        </li>
        <li aria-hidden>›</li>
        <li class="text-gray-900 font-medium">Downloads</li>
      </ol>
    </nav>

    <!-- Visible H1 -->
    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Downloads</h1>

    <!-- Error -->
    <div v-if="errorMsg" class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 mb-6">
      Failed to load downloads — {{ errorMsg }}
      <button class="underline ml-1" @click="fetchPage(Math.max(1, page-1))">Try again</button>
    </div>

    <!-- 4 per row on lg+ (1/2/3/4) -->
    <div
      class="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      :class="{'opacity-50 pointer-events-none': firstLoad && loading}"
    >
      <NuxtLinkLocale
        v-for="it in items"
        :key="it.slug"
        :to="`/downloads/${it.slug}`"
        :aria-label="(it.title || it.slug)"
        class="group block rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden
               transition duration-300 ease-out hover:shadow-lg hover:border-orange-300 will-change-transform"
      >
        <!-- IMAGE ONLY, with subtle zoom on hover -->
        <NuxtImg
          :src="imgUrl(it.image)"
          alt=""
          class="w-full aspect-[4/3] object-contain bg-white
                 transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, 100vw"
          format="webp"
          loading="lazy"
        />
      </NuxtLinkLocale>

      <!-- Skeletons while fetching next pages -->
      <template v-if="loading && !firstLoad">
        <div
          v-for="i in 4" :key="'sk-' + i"
          class="rounded-2xl border border-gray-200 bg-white p-0 animate-pulse overflow-hidden"
        >
          <div class="w-full aspect-[4/3] bg-gray-200"></div>
        </div>
      </template>
    </div>

    <!-- Infinite-scroll sentinel -->
    <div ref="sentinel" class="h-2"></div>
  </div>
</template>
