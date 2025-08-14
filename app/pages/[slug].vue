<script setup lang="ts">
const route = useRoute()
const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp()

// Resolve slug -> { type, id, slug, name }
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

useHead(() => ({
  title: `${resolved.value?.name ?? route.params.slug} | Shop`
}))
</script>

<template>
  <!-- Pre-applies the filter based on slug; still allows extra URL filters -->
  <CatalogView :initial-filters="initialFilters" />
</template>