<script setup lang="ts">
const props = defineProps<{ sort:string; perPage:number|'all'; t:(k:string)=>string }>()
const emit = defineEmits<{ (e:'update:sort', v:string):void; (e:'update:perPage', v:number|'all'):void }>()
</script>

<template>
  <div class="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm mb-4">
    <div class="grid grid-cols-1 min-[993px]:grid-cols-12 gap-3 items-center">
      <div class="min-[993px]:col-span-4">
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('sortBy') }}</label>
        <select :value="sort" @change="e=>emit('update:sort',(e.target as HTMLSelectElement).value)"
                class="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-200">
          <option value="price_asc">{{ t('sort.priceLowHigh') }}</option>
          <option value="price_desc">{{ t('sort.priceHighLow') }}</option>
          <option value="newest">{{ t('sort.newToOld') }}</option>
          <option value="oldest">{{ t('sort.oldToNew') }}</option>
        </select>
      </div>

      <div class="min-[993px]:col-span-3">
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('perPage') }}</label>
        <select :value="perPage === 'all' ? 'all' : String(perPage)"
                @change="e=>{ const v=(e.target as HTMLSelectElement).value; emit('update:perPage', v==='all'?'all':Number(v)) }"
                class="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-200">
          <option value="16">16</option>
          <option value="25">25</option>
          <option value="all">{{ t('perPageAll') }}</option>
        </select>
      </div>
    </div>
  </div>
</template>
