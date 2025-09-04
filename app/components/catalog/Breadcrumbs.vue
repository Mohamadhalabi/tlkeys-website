<!-- app/components/catalog/Breadcrumbs.vue -->
<script setup lang="ts">
defineProps<{ items: Array<{ label: string; to?: string }> }>()
</script>

<template>
  <nav aria-label="Breadcrumb">
    <ol class="flex items-center gap-2 text-sm text-gray-600">
      <li v-for="(item, i) in items" :key="i" class="flex items-center gap-2">
        <NuxtLink v-if="item.to" :to="item.to" class="hover:underline">{{ item.label }}</NuxtLink>
        <span v-else>{{ item.label }}</span>
        <span v-if="i < items.length - 1">/</span>
      </li>
    </ol>
  </nav>
</template>
