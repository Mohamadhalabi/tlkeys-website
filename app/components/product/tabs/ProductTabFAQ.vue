<script setup lang="ts">
type FaqItem = { q: string; a: string }
defineProps<{ items: FaqItem[] }>()
</script>

<template>
  <div>
    <div v-if="items && items.length" class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <details v-for="(f, i) in items" :key="i" class="group border-b last:border-b-0 open:bg-gray-50/50">
        <summary
          class="flex cursor-pointer select-none items-center justify-between gap-3 px-5 py-3 text-gray-900 hover:bg-gray-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
        >
          <span class="font-medium">{{ f.q }}</span>
          <span class="text-gray-400 transition group-open:rotate-180">⌄</span>
        </summary>
        <div class="px-5 pb-5 pt-1 text-gray-700">
          <div class="prose prose-sm max-w-none" v-html="f.a"></div>
        </div>
      </details>
    </div>
    <div v-else class="text-gray-500">No FAQs yet.</div>
  </div>
</template>
