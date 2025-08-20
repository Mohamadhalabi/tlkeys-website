<script setup lang="ts">
type PriceTableRow = { min_qty: number; max_qty?: number | null; price: number; sale_price?: number | null }
const props = defineProps<{ rows: PriceTableRow[]; currency?: string; title?: string }>()
const currency = computed(() => props.currency || 'TRY')
</script>

<template>
  <div class="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
    <div class="px-4 py-3 bg-gray-50 font-medium">{{ title || 'Quantity Pricing' }}</div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-white">
          <tr class="text-left text-sm text-gray-600">
            <th class="px-4 py-3">Min Qty</th>
            <th class="px-4 py-3">Max Qty</th>
            <th class="px-4 py-3">Price</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="row in rows" :key="row.min_qty + '-' + (row.max_qty ?? '∞')" class="text-sm">
            <td class="px-4 py-3">{{ row.min_qty }}</td>
            <td class="px-4 py-3">{{ row.max_qty ?? '∞' }}</td>
            <td class="px-4 py-3">
              <span v-if="row.sale_price && row.sale_price < row.price" class="font-semibold">
                {{ new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(row.sale_price) }}
                <span class="ms-2 text-gray-500 line-through">
                  {{ new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(row.price) }}
                </span>
              </span>
              <span v-else>
                {{ new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(row.price) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
