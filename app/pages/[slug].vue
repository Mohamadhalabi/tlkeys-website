<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRuntimeConfig, useNuxtApp, useSeoMeta, createError } from '#imports'

const route = useRoute()
const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp()

// Resolve slug -> { type, id, slug, name, meta_title?, meta_description? }
const { data, error } = await useAsyncData(
  () => `slug:${route.params.slug}`,
  async () => {
    return await $customApi(`${API_BASE_URL}/slug/${route.params.slug}`, { method: 'GET' })
  },
  { server: true, default: () => null, dedupe: 'defer' }
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
}

const resolved = computed(() => (data.value?.data ?? data.value) as any)

// Build initial filters for the CatalogView
const initialFilters = computed(() => {
  const r = resolved.value
  if (!r) return {}
  switch (r.type) {
    case 'brand':        return { brands: [r.slug] }
    case 'category':     return { categories: [r.slug] }
    case 'manufacturer': return { manufacturers: [r.slug] }
    default:             return {}
  }
})

// Nice fallbacks per entry type if meta is missing
function fallbackDescription(r: any) {
  const n = r?.name || route.params.slug
  if (r?.type === 'brand')        return `Shop ${n} car remotes, key fobs, and locksmith tools.`
  if (r?.type === 'category')     return `Browse ${n} products, filter and sort to find what you need.`
  if (r?.type === 'manufacturer') return `Explore ${n} compatible keys, remotes, and programming tools.`
  return `Browse products, filter and sort to find what you need.`
}

// Prefer API meta; fallback to name-based title + type-based description
const seoTitle = computed(() => {
  const r = resolved.value
  const t = r?.meta_title?.toString().trim()
  return (t && t.length) ? `${t} | Techno Lock Keys` : `${r?.name ?? route.params.slug} | Techno Lock Keys`
})
const seoDescription = computed(() => {
  const r = resolved.value
  const d = r?.meta_description?.toString().trim()
  return (d && d.length) ? d : fallbackDescription(r)
})

// Apply page-level SEO now (so crawlers have it even if children are lazy)
useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <!-- Pass initial filters + SEO overrides down to CatalogView -->
  <CatalogView
    :initial-filters="initialFilters"
    :seo-title="seoTitle"
    :seo-description="seoDescription"
  />
</template>
