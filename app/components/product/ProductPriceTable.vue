<script setup lang="ts">
import { computed } from 'vue'

type PriceTableRow = {
  min_qty: number
  max_qty?: number | null
  price: number | string
  sale_price?: number | string | null
}

const props = defineProps<{ rows: PriceTableRow[]; currency?: string; title?: string }>()
const currency = computed(() => props.currency || 'USD')

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}
function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.value }).format(n)
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 font-medium">
      {{ title || 'Quantity Pricing' }}
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full border-collapse text-sm">
        <thead class="bg-white text-left text-gray-600">
          <tr>
            <th class="px-4 py-3">Min Qty</th>
            <th class="px-4 py-3">Max Qty</th>
            <th class="px-4 py-3">Price</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="row in rows"
            :key="row.min_qty + '-' + (row.max_qty ?? '∞')"
            class="text-gray-800"
          >
            <td class="px-4 py-3">{{ row.min_qty }}</td>
            <td class="px-4 py-3">{{ row.max_qty ?? '∞' }}</td>
            <td class="px-4 py-3">
              <template v-if="toNum(row.sale_price) && toNum(row.sale_price)! > 0 && toNum(row.sale_price)! < (toNum(row.price) ?? Infinity)">
                <span class="font-semibold text-gray-900">{{ fmt(toNum(row.sale_price)!) }}</span>
                <span class="ms-2 text-gray-500 line-through">{{ fmt(toNum(row.price) || 0) }}</span>
              </template>
              <template v-else>
                <span class="text-gray-900">{{ fmt(toNum(row.price) || 0) }}</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
