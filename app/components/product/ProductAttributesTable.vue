<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '#imports'

type AttrItem  = { id: number | string; slug?: string; name?: string; label?: string; value: string }
type AttrGroup = { id: number | string; slug?: string; name: string; items: AttrItem[] }

const props = defineProps<{ groups: AttrGroup[]; title?: string }>()

const { t, locale } = useI18n()

/** Build rows, grouping same labels and joining values with a locale-aware list formatter */
const rows = computed(() => {
  const order: string[] = []                         // preserve first-seen order
  const grouped = new Map<string, { label: string; values: string[] }>()
  const lf = new Intl.ListFormat(locale.value || 'en', { style: 'long', type: 'conjunction' })

  for (const g of props.groups || []) {
    for (const it of g.items || []) {
      const rawVal = (it?.value ?? '').toString().trim()
      if (!rawVal) continue

      const label = (it?.label || it?.name || g.name || '').toString().trim()
      if (!label) continue

      const key = label.toLowerCase()                // case-insensitive grouping

      if (!grouped.has(key)) {
        grouped.set(key, { label, values: [] })
        order.push(key)
      }

      const bucket = grouped.get(key)!
      if (!bucket.values.includes(rawVal)) bucket.values.push(rawVal)
    }
  }

  // flatten back to [{label, value}] with localized joining
  return order.map(k => {
    const { label, values } = grouped.get(k)!
    return { label, value: values.length > 1 ? lf.format(values) : (values[0] || '') }
  })
})

const hasRows   = computed(() => rows.value.length > 0)
const heading   = computed(() => props.title ?? t('product.specifications', 'Specifications'))
const mid       = computed(() => Math.ceil(rows.value.length / 2))
const leftRows  = computed(() => rows.value.slice(0, mid.value))
const rightRows = computed(() => rows.value.slice(mid.value))
</script>

<template>
  <section v-if="hasRows" class="mt-6">
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 font-medium">
        {{ heading }}
      </div>

      <div class="p-5">
        <!-- Mobile: single table -->
        <div class="md:hidden">
          <table class="m-auto w-full table-fixed border-collapse text-[13px] leading-5">
            <tbody>
              <tr v-for="(r, i) in rows" :key="'m-' + i + r.label" class="odd:bg-white even:bg-gray-50">
                <th class="w-1/2 border border-gray-200 px-3 py-2.5 text-left font-semibold text-gray-900 align-top">
                  {{ r.label }}
                </th>
                <td class="w-1/2 border border-gray-200 px-3 py-2.5 text-gray-800 align-top">
                  {{ r.value }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- md+: two balanced tables -->
        <div class="hidden gap-6 md:grid md:grid-cols-2">
          <table class="m-auto w-full table-fixed border-collapse text-[13px] leading-5">
            <tbody>
              <tr v-for="(r, i) in leftRows" :key="'l-' + i + r.label" class="odd:bg-white even:bg-gray-50">
                <th class="w-1/2 border border-gray-200 bg-gray-100 px-3 py-2.5 text-left font-semibold text-gray-900 align-top">
                  {{ r.label }}
                </th>
                <td class="w-1/2 border border-gray-200 px-3 py-2.5 text-gray-800 align-top">
                  {{ r.value }}
                </td>
              </tr>
            </tbody>
          </table>

          <table v-if="rightRows.length" class="m-auto w-full table-fixed border-collapse text-[13px] leading-5">
            <tbody>
              <tr v-for="(r, i) in rightRows" :key="'r-' + i + r.label" class="odd:bg-white even:bg-gray-50">
                <th class="w-1/2 border border-gray-200 bg-gray-100 px-3 py-2.5 text-left font-semibold text-gray-900 align-top">
                  {{ r.label }}
                </th>
                <td class="w-1/2 border border-gray-200 px-3 py-2.5 text-gray-800 align-top">
                  {{ r.value }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
