<!-- app/components/catalog/Breadcrumbs.vue -->
<script setup lang="ts">
defineProps<{ items: Array<{ label: string; to?: string }> }>()
</script>

<template>
  <nav aria-label="Breadcrumb">
    <ol class="flex items-center gap-2 text-sm text-gray-600">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="flex items-center gap-2"
      >
        <!-- Last item as H1 for SEO -->
        <template v-if="i === items.length - 1">
          <h1 class="text-base font-semibold text-gray-900">
            {{ item.label }}
          </h1>
        </template>
        <template v-else>
          <NuxtLinkLocale v-if="item.to" :to="item.to" class="hover:underline">
            {{ item.label }}
          </NuxtLinkLocale>
          <span v-else>{{ item.label }}</span>
          <span>/</span>
        </template>
      </li>
    </ol>
  </nav>
</template>
