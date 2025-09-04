<script setup lang="ts">
import CatalogView from '~/components/catalog/CatalogView.vue'
import { useRoute } from '#imports'

// Remount the page whenever its fullPath changes (path or query)
definePageMeta({
  name: 'shop',
  key: (route) => route.fullPath,
})

const route = useRoute()
const initialFilters = { brands: [], categories: [], manufacturers: [], models: [] }
</script>

<template>
  <!-- Also key the child to guarantee a fresh CatalogView instance -->
  <CatalogView :key="route.fullPath" :initial-filters="initialFilters" />
</template>
