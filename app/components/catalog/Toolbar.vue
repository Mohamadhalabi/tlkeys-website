<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ sort:string; perPage:number|'all'; t:(k:string)=>string }>()
const emit = defineEmits<{ (e:'update:sort', v:string):void; (e:'update:perPage', v:number|'all'):void }>()

// local controlled state to avoid SSR → CSR mismatch
const localSort = ref(props.sort)
watch(() => props.sort, v => { if (v !== localSort.value) localSort.value = v })
watch(localSort, v => emit('update:sort', v))

const localPerPage = ref(props.perPage === 'all' ? 'all' : String(props.perPage))
watch(() => props.perPage, v => {
  const s = v === 'all' ? 'all' : String(v)
  if (s !== localPerPage.value) localPerPage.value = s
})
watch(localPerPage, v => emit('update:perPage', v === 'all' ? 'all' : Number(v)))
</script>

<template>
  <div class="rounded-2xl border bg-white/80 backdrop-blur p-4 shadow-sm mb-4">
    <div class="grid grid-cols-1 min-[993px]:grid-cols-12 gap-3 items-center">
      <div class="min-[993px]:col-span-4">
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('sortBy') }}</label>

        <!-- Use v-model so the selected label always matches the actual value -->
        <select v-model="localSort"
                class="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-200">
          <!-- order of options doesn’t matter; selected is driven by v-model -->
          <option value="price_desc">{{ t('sort.priceHighLow') }}</option>
          <option value="price_asc">{{ t('sort.priceLowHigh') }}</option>
          <option value="newest">{{ t('sort.newToOld') }}</option>
          <option value="oldest">{{ t('sort.oldToNew') }}</option>
        </select>
      </div>

      <div class="min-[993px]:col-span-3">
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('perPage') }}</label>
        <select v-model="localPerPage"
                class="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-200">
          <option value="16">16</option>
          <option value="25">25</option>
          <option value="all">{{ t('All') }}</option>
        </select>
      </div>
    </div>
  </div>
</template>
