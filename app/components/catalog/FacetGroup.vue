<script setup lang="ts">
const props = defineProps<{
  label: string
  keyName: string
  items: Array<{ slug:string; name:string; count:number }>
  selected: string[]
  open: boolean
  searchQ: string
}>()
const emit = defineEmits<{
  (e:'toggleOpen', key:string): void
  (e:'clear'): void
  (e:'pick', slug:string): void
  (e:'search', v:string): void
}>()
const filtered = computed(() => {
  const q = (props.searchQ || '').toLowerCase()
  return q ? props.items.filter(i => i.name.toLowerCase().includes(q) || i.slug.includes(q)) : props.items
})
</script>

<template>
  <div v-if="items?.length" class="rounded-2xl border bg-white/80 backdrop-blur shadow-sm overflow-hidden">
    <button class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            @click="emit('toggleOpen', keyName)">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-gray-800">{{ label }}</span>
        <span v-if="selected.length" class="inline-flex items-center rounded-full text-[10px] px-1.5 py-0.5 bg-gray-100 border">
          {{ selected.length }}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <button v-if="selected.length" @click.stop="emit('clear')" class="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2">
          Clear
        </button>
        <svg :class="['w-4 h-4 text-gray-500 transition-transform', open ? 'rotate-180' : 'rotate-0']" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
      </div>
    </button>

    <div v-show="open" class="px-4 pb-4">
      <div class="relative mb-3">
        <input :value="searchQ" @input="emit('search', ($event.target as HTMLInputElement).value)"
               type="search" placeholder="Search…"
               class="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200" />
        <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.9 14.32a7 7 0 111.414-1.414l3.387 3.387-1.414 1.414-3.387-3.387zM8 13a5 5 0 100-10 5 5 0 000 10z" clip-rule="evenodd"/>
        </svg>
      </div>

      <div class="space-y-1.5 max-h-64 overflow-auto pr-1">
        <div v-for="f in filtered" :key="f.slug" class="group flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="selected.includes(f.slug)"
                   @change="emit('pick', f.slug)" class="size-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300" />
            <span class="text-sm text-gray-800 line-clamp-1">{{ f.name }}</span>
          </label>
          <span class="text-[11px] text-gray-500">{{ f.count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
