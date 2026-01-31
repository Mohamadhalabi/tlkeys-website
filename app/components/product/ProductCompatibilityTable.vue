<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '#imports'

type Row = { brand: string; model: string; from: number | null; to: number | null }

const props = defineProps<{
  rows: Row[]
  title?: string
}>()

const { t } = useI18n()

/* --- State for Performance --- */
const INITIAL_LIMIT = 12
const isExpanded = ref(false)

const heading = computed(() => props.title ?? t('product.compatibility', 'Compatibility'))

/* ---------------- Format year range ---------------- */
const fmtRange = (r: Row) => {
  if (r.from === null && r.to === null) return '----'
  if (r.from !== null && r.to !== null) return r.from === r.to ? String(r.from) : `${r.from}–${r.to}`
  if (r.from !== null) return `${r.from}+`
  return `≤${r.to}`
}

/* ---------------- Normalize model names ------------- */
const normalizeModel = (m?: string | null) => {
  const s = (m || '').trim()
  if (!s) return '----'
  if (/^all(\s+models?)?$/i.test(s) || s === '*') return '----'
  return s
}

/* ---------------- Build normalized rows ------------- */
const allNormalizedRows = computed(() =>
  (props.rows || []).map(r => ({
    brand: (r.brand || '').trim() || '----',
    model: normalizeModel(r.model),
    year: fmtRange(r),
  }))
)

const visibleRows = computed(() => {
  if (isExpanded.value) return allNormalizedRows.value
  return allNormalizedRows.value.slice(0, INITIAL_LIMIT)
})

const remainingCount = computed(() => Math.max(0, allNormalizedRows.value.length - INITIAL_LIMIT))
const hasMore = computed(() => remainingCount.value > 0)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <section v-if="allNormalizedRows.length" class="mt-6" style="content-visibility: auto; contain-intrinsic-size: 500px;">
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col">
      <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 font-medium flex justify-between items-center">
        <span>{{ heading }}</span>
        <span class="text-xs text-gray-500 font-normal bg-white px-2 py-0.5 rounded border border-gray-200">
          {{ allNormalizedRows.length }} {{ t('compatibility.vehicles', 'Vehicles') }}
        </span>
      </div>

      <div class="p-5">
        <div class="overflow-x-auto">
          <table class="min-w-full text-[13px] leading-5 border-collapse">
            <thead class="bg-gray-100 text-gray-700">
              <tr>
                <th class="px-3 py-2.5 border border-gray-200 text-left font-semibold w-1/3">
                  {{ t('compatibility.brand', 'Brand') }}
                </th>
                <th class="px-3 py-2.5 border border-gray-200 text-left font-semibold w-1/3">
                  {{ t('compatibility.model', 'Model') }}
                </th>
                <th class="px-3 py-2.5 border border-gray-200 text-left font-semibold w-1/3">
                  {{ t('compatibility.yearRange', 'Year') }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(r, i) in visibleRows"
                :key="i"
                class="odd:bg-white even:bg-gray-50 hover:bg-gray-50/60"
              >
                <td class="px-3 py-2.5 border border-gray-200 text-gray-900 font-medium">{{ r.brand }}</td>
                <td class="px-3 py-2.5 border border-gray-200 text-gray-700">{{ r.model }}</td>
                <td class="px-3 py-2.5 border border-gray-200 font-mono text-gray-600 [font-variant-numeric:tabular-nums]">
                  {{ r.year }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="hasMore" class="mt-4 text-center">
          <button 
            type="button"
            @click="toggleExpand"
            class="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span v-if="!isExpanded">
              {{ t('compatibility.showMore', 'Show {count} more vehicles').replace('{count}', remainingCount) }}
            </span>
            <span v-else>
              {{ t('compatibility.showLess', 'Show less') }}
            </span>
            <svg class="w-4 h-4 transition-transform duration-200" :class="isExpanded ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>