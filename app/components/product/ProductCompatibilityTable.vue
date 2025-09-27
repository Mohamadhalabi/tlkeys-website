<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '#imports'

type Row = { brand: string; model: string; from: number | null; to: number | null }

const props = defineProps<{
  rows: Row[]
  title?: string
}>()

const { t } = useI18n()

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
  // treat 'all', 'ALL', 'All', 'All Models', '*' as empty
  if (/^all(\s+models?)?$/i.test(s) || s === '*') return '----'
  return s
}

/* ---------------- Build normalized rows ------------- */
const normalizedRows = computed(() =>
  (props.rows || []).map(r => ({
    brand: (r.brand || '').trim() || '----',
    model: normalizeModel(r.model),
    year: fmtRange(r),
  }))
)
</script>

<template>
  <section v-if="normalizedRows.length" class="mt-6">
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <!-- Card header -->
      <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 font-medium">
        {{ heading }}
      </div>

      <div class="p-5">
        <div class="overflow-x-auto">
          <table class="min-w-full text-[13px] leading-5 border-collapse">
            <thead class="bg-gray-100 text-gray-700">
              <tr>
                <th class="px-3 py-2.5 border border-gray-200 text-left font-semibold">
                  {{ t('compatibility.brand', 'Brand') }}
                </th>
                <th class="px-3 py-2.5 border border-gray-200 text-left font-semibold">
                  {{ t('compatibility.model', 'Model') }}
                </th>
                <th class="px-3 py-2.5 border border-gray-200 text-left font-semibold">
                  {{ t('compatibility.yearRange', 'Year (From–To)') }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(r, i) in normalizedRows"
                :key="i"
                class="odd:bg-white even:bg-gray-50 hover:bg-gray-50/60"
              >
                <td class="px-3 py-2.5 border border-gray-200 text-gray-900">{{ r.brand }}</td>
                <td class="px-3 py-2.5 border border-gray-200 text-gray-700">{{ r.model }}</td>
                <td class="px-3 py-2.5 border border-gray-200 font-mono [font-variant-numeric:tabular-nums]">
                  {{ r.year }}
                </td>
              </tr>

              <tr v-if="!normalizedRows.length">
                <td colspan="3" class="px-3 py-6 text-center text-gray-500">
                  {{ t('compatibility.empty', 'No compatibility data') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
