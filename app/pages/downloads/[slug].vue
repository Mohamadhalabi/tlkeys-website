<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRequestURL, useNuxtApp, useRuntimeConfig, useHead } from '#imports'

/* ---------- Types ---------- */
type MultiImg = { s?: { url: string }, m?: { url: string }, l?: { url: string } }
type Attr = { id: number; name: string; link?: string | null }
type Download = {
  slug: string
  title: string
  description?: string | null
  meta_title?: string | null
  meta_description?: string | null
  image?: MultiImg | null
  internal_image?: MultiImg | null
  meta_image?: MultiImg | null
  screen_shot?: { gallery?: MultiImg[] } | MultiImg[] | null
  gallery?: MultiImg[] | null
  attributes?: Record<string, Attr[]>
}

/* ---------- Data fetching (SSR-ready) ---------- */
const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { $customApi } = useNuxtApp()
const { public: { API_BASE_URL, SITE_NAME = 'Techno Lock Keys' } } = useRuntimeConfig()

const { data, pending, error, refresh } = await useAsyncData(
  () => `downloads:item:${slug.value}`,
  async () => {
    const res = await $customApi(`${API_BASE_URL}/downloads/${slug.value}`, { method: 'GET' })
    return res?.data?.data ?? res?.data ?? res
  },
  { watch: [slug] }
)

const item = computed<Download | null>(() => data.value?.download ?? null)

/* ---------- Helpers ---------- */
const imgUrl = (img?: MultiImg | null) => img?.l?.url || img?.m?.url || img?.s?.url || ''
const hasShots = computed(() => {
  const s = item.value?.screen_shot
  return Array.isArray(s) ? s.length > 0 : Boolean(s?.gallery?.length)
})

// Pull arrays of specific attribute groups (if present)
const softwareLinks = computed<string[]>(() =>
  (item.value?.attributes?.software ?? item.value?.attributes?.Software ?? [])
    .map(a => a.link).filter(Boolean) as string[]
)
const driverLinks = computed<string[]>(() =>
  (item.value?.attributes?.driver ?? item.value?.attributes?.drivers ?? item.value?.attributes?.Driver ?? [])
    .map(a => a.link).filter(Boolean) as string[]
)
const manualLinks = computed<string[]>(() =>
  (item.value?.attributes?.user_manual ?? item.value?.attributes?.manual ?? [])
    .map(a => a.link).filter(Boolean) as string[]
)
const configLinks = computed<string[]>(() =>
  (item.value?.attributes?.configuration ?? [])
    .map(a => a.link).filter(Boolean) as string[]
)

// Try to derive a version string from title or the first software item
const softwareVersion = computed<string | undefined>(() => {
  const candidates: string[] = []
  if (item.value?.title) candidates.push(item.value.title)
  const firstSoftwareName = (item.value?.attributes?.software ?? [])[0]?.name
  if (firstSoftwareName) candidates.push(firstSoftwareName)
  const joined = candidates.join(' ')
  const m = joined.match(/(\d+(?:\.\d+)+)/) // e.g., 7.5.1
  return m ? m[1] : undefined
})

/* ---------- SEO + Schema (using innerHTML) ---------- */
const reqUrl = useRequestURL()
const canonical = computed(() => `${reqUrl.protocol}//${reqUrl.host}/downloads/${slug.value}`)
const pageTitle = computed(() => item.value?.meta_title || item.value?.title || SITE_NAME)
const pageDesc = computed(() => item.value?.meta_description || '')
const metaImage = computed(() => imgUrl(item.value?.meta_image) || imgUrl(item.value?.image))

const breadcrumbSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${reqUrl.protocol}//${reqUrl.host}/` },
    { '@type': 'ListItem', position: 2, name: 'Downloads', item: `${reqUrl.protocol}//${reqUrl.host}/downloads` },
    { '@type': 'ListItem', position: 3, name: item.value?.title || slug.value, item: canonical.value }
  ]
}))

// SoftwareApplication schema (best fit for your download pages)
const softwareSchema = computed(() => {
  if (!item.value) return null

  // Images (hero, internal, gallery, screenshots)
  const images = [
    imgUrl(item.value.image),
    imgUrl(item.value.internal_image),
    ...(item.value.gallery?.map(g => imgUrl(g)) ?? []),
    ...(Array.isArray(item.value.screen_shot)
      ? item.value.screen_shot.map(s => imgUrl(s))
      : (item.value.screen_shot?.gallery?.map(s => imgUrl(s)) ?? []))
  ].filter(Boolean)

  // Primary downloadUrl: first software link if present; otherwise first available link
  const primaryDownload =
    softwareLinks.value[0] ||
    driverLinks.value[0] ||
    configLinks.value[0] ||
    manualLinks.value[0]

  const additionalDownloads = [
    ...softwareLinks.value.slice(1),
    ...driverLinks.value,
    ...configLinks.value,
    ...manualLinks.value
  ].filter(Boolean)

  // Attempt to guess OS (most are Windows .exe/.zip in your data)
  const operatingSystem = 'Windows'

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: item.value.title,
    description: pageDesc.value || undefined,
    applicationCategory: 'Utility',
    operatingSystem,
    url: canonical.value,
    image: images.length ? images : undefined,
    downloadUrl: primaryDownload || undefined,
    publisher: { '@type': 'Organization', name: SITE_NAME }
  }

  if (softwareVersion.value) schema.softwareVersion = softwareVersion.value
  if (additionalDownloads.length) {
    // Provide additional download options as workExample CreativeWorks
    schema.workExample = additionalDownloads.map((u) => ({
      '@type': 'CreativeWork',
      url: u
    }))
  }

  return schema
})

useHead(() => ({
  title: pageTitle.value,
  meta: [
    { name: 'description', content: pageDesc.value },
    { property: 'og:title', content: pageTitle.value },
    { property: 'og:description', content: pageDesc.value },
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: canonical.value },
    metaImage.value ? { property: 'og:image', content: metaImage.value } : {},
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: pageTitle.value },
    { name: 'twitter:description', content: pageDesc.value },
    metaImage.value ? { name: 'twitter:image', content: metaImage.value } : {}
  ].filter(Boolean),
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      key: 'ld-breadcrumb',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(breadcrumbSchema.value),
      tagPosition: 'head'
    },
    ...(softwareSchema.value ? [{
      key: 'ld-software',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(softwareSchema.value),
      tagPosition: 'head'
    }] : [])
  ]
}))
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Breadcrumb -->
    <nav aria-label="Breadcrumb" class="text-sm mb-5">
      <ol class="flex flex-wrap items-center gap-1 text-gray-500">
        <li><NuxtLink to="/" class="hover:text-gray-900 hover:underline">Home</NuxtLink></li>
        <li aria-hidden>›</li>
        <li><NuxtLink to="/downloads" class="hover:text-gray-900 hover:underline">Downloads</NuxtLink></li>
        <li aria-hidden>›</li>
        <li class="text-gray-900 font-medium line-clamp-1">{{ item?.title || slug }}</li>
      </ol>
    </nav>

    <div v-if="pending">Loading…</div>
    <div v-else-if="error" class="text-red-600">
      Failed to load — {{ (error as any)?.message || 'Request failed' }}
      <button class="underline ml-2" @click="refresh()">Try again</button>
    </div>

    <div v-else-if="item">
      <!-- HERO: left compact image + right download sections -->
      <section class="grid lg:grid-cols-12 gap-8 items-start mb-10">
        <!-- Image card (fixed height) -->
        <div class="lg:col-span-4">
          <div class="rounded-xl border bg-white shadow-sm p-6">
            <div class="h-[220px] w-full flex items-center justify-center">
              <NuxtImg
                :src="imgUrl(item.internal_image) || imgUrl(item.image)"
                :alt="item.title"
                class="max-h-full max-w-full object-contain"
                sizes="(min-width:1024px) 25vw, 60vw"
                format="webp"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <!-- Right: title + grouped links -->
        <div class="lg:col-span-8">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight mb-4">{{ item.title }}</h1>

          <div v-if="item.attributes" class="space-y-6">
            <div
              v-for="(attrs, type) in item.attributes"
              :key="type"
              class="rounded-xl bg-white border shadow-sm"
            >
              <div class="px-4 py-3 border-b font-semibold capitalize text-gray-800">
                {{ type.replace('_',' ') }}
              </div>
              <div class="p-4 grid sm:grid-cols-2 gap-3">
                <a
                  v-for="attr in attrs"
                  :key="attr.id"
                  :href="attr.link"
                  target="_blank"
                  rel="noopener"
                  class="flex items-center gap-2 rounded-lg border px-3 py-2 bg-gray-50 hover:bg-white hover:border-blue-400 hover:shadow-sm transition"
                >
                  <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                    <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                      <path d="M12 3a1 1 0 011 1v8.59l2.3-2.3a1 1 0 111.4 1.42l-4 4a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.42L11 12.59V4a1 1 0 011-1z"></path>
                      <path d="M5 20a1 1 0 100-2h14a1 1 0 100 2H5z"></path>
                    </svg>
                  </span>
                  <span class="text-blue-700 hover:underline leading-snug">{{ attr.name }}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Screenshots (larger responsive grid) -->
      <section v-if="hasShots" class="mb-10">
        <h2 class="text-lg font-semibold text-orange-600 mb-4">Screenshots</h2>
        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <NuxtImg
            v-for="(s,i) in (Array.isArray(item.screen_shot) ? item.screen_shot : item.screen_shot!.gallery)"
            :key="i"
            :src="imgUrl(s)"
            class="w-full h-48 sm:h-56 md:h-64 object-cover rounded-lg border hover:shadow-md transition"
            format="webp"
            loading="lazy"
          />
        </div>
      </section>

      <!-- Description -->
      <section v-if="item.description" class="rounded-xl border bg-white shadow-sm p-4 md:p-6">
        <div class="prose prose-sm max-w-none" v-html="item.description"></div>
      </section>
    </div>

    <div v-else>Not found.</div>
  </div>
</template>
