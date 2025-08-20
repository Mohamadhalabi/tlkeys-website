<script setup lang="ts">
import { computed } from 'vue'

type AttrItem  = { id: number | string; slug?: string; name?: string; label?: string; value: string }
type AttrGroup = { id: number | string; slug?: string; name: string; items: AttrItem[] }

const props = defineProps<{ groups: AttrGroup[] }>()

/* Build flat rows, using each item's own label/name when available. */
const rows = computed(() => {
  const out: { label: string; value: string }[] = []
  for (const g of props.groups || []) {
    for (const it of g.items || []) {
      const val = (it?.value ?? '').toString().trim()
      if (!val) continue
      const label = (it?.label || it?.name || g.name || '').toString().trim()
      if (!label) continue
      out.push({ label, value: val })
    }
  }
  return out
})

/* Split evenly into two columns */
const mid = computed(() => Math.ceil(rows.value.length / 2))
const leftRows  = computed(() => rows.value.slice(0, mid.value))
const rightRows = computed(() => rows.value.slice(mid.value))
</script>

<template>
  <section class="mt-6">
    <!-- Optional section header; remove if you don't want it -->
    <h3 class="mb-3 text-base font-semibold text-gray-900">Specifications</h3>

    <div class="grid grid-cols-1 md:grid-cols-2 md:gap-6 gap-4">
      <!-- Left table -->
      <table
        class="w-full table-fixed border border-gray-200 rounded-md overflow-hidden border-collapse text-[13px] leading-5"
      >
        <tbody>
          <tr v-for="(r, i) in leftRows" :key="'l-' + i + r.label">
            <th
              class="w-1/2 px-3 py-2.5 text-left font-bold text-gray-900 bg-white
                     border-r border-b border-gray-200 align-top"
            >
              {{ r.label }}
            </th>
            <td
              class="w-1/2 px-3 py-2.5 text-gray-800 align-top border-b border-gray-200 bg-gray-50"
            >
              {{ r.value }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Right table -->
      <table
        v-if="rightRows.length"
        class="w-full table-fixed border border-gray-200 rounded-md overflow-hidden border-collapse text-[13px] leading-5"
      >
        <tbody>
          <tr v-for="(r, i) in rightRows" :key="'r-' + i + r.label">
            <th
              class="w-1/2 px-3 py-2.5 text-left font-bold text-gray-900 bg-white
                     border-r border-b border-gray-200 align-top"
            >
              {{ r.label }}
            </th>
            <td
              class="w-1/2 px-3 py-2.5 text-gray-800 align-top border-b border-gray-200 bg-gray-50"
            >
              {{ r.value }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
