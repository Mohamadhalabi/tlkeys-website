<script setup lang="ts">
defineProps<{
  chips: Array<{ group: 'brands'|'models'|'categories'|'manufacturers'|'attr'; slug: string; label: string; attrSlug?: string }>
}>()
const emit = defineEmits<{ (e:'remove', payload:{ group:string; slug:string; attrSlug?:string }): void }>()
</script>

<template>
  <div v-if="chips.length" class="flex flex-wrap gap-2">
    <button
      v-for="c in chips"
      :key="(c.group==='attr' ? 'attr:'+c.attrSlug+':' : c.group + ':') + c.slug"
      class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 shadow-sm"
      @click="emit('remove', { group: c.group, slug: c.slug, attrSlug: c.attrSlug })"
    >
      <span class="font-medium line-clamp-1 max-w-[10rem]">{{ c.label }}</span>
      <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 8.586l4.95-4.95 1.414 1.414L11.414 10l4.95 4.95-1.414 1.414L10 11.414l-4.95 4.95-1.414-1.414L8.586 10l-4.95-4.95L5.05 3.636 10 8.586z" clip-rule="evenodd"/>
      </svg>
    </button>
  </div>
</template>
