<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter, useNuxtApp } from '#app'

type Order = {
  id: number
  uuid?: string
  created_at: string
  total: number
  payment_status: string
  status: string
}

const route = useRoute()
const router = useRouter()
const { $customApi } = useNuxtApp()

const perPage = 10
const loading = ref(false)
const error = ref('')
const orders = ref<Order[]>([])
const pagination = ref({ current: 1, last: 1, total: 0 })

function coercePage(v: any) {
  const n = Number(v || 1)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

async function fetchOrders() {
  loading.value = true
  error.value = ''
  try {
    const page = coercePage(route.query.page)

    // Force the query string to avoid params/adapter quirks
    const url = `/account/orders?page=${page}&per_page=${perPage}`

    const res: any = await $customApi(url)
    // ultra-defensive parsing (handles axios, fetch, double wrapping, etc.)
    const raw = res?.data ?? res
    const topData = raw?.data
    const inner = topData && typeof topData === 'object' && !Array.isArray(topData) ? topData : null

    const list: any[] =
      Array.isArray(topData) ? topData :
      (inner && Array.isArray(inner.data)) ? inner.data :
      (Array.isArray(raw) ? raw : [])

    const meta = raw?.meta ?? inner?.meta ?? {}
    const total = Number(meta.total ?? list.length)
    const last = Number(meta.last_page ?? (total ? Math.max(1, Math.ceil(total / perPage)) : 1))
    const current = Number(meta.current_page ?? page ?? 1)

    orders.value = list as Order[]
    pagination.value = { current, last, total }
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to load orders.'
    orders.value = []
    pagination.value = { current: 1, last: 1, total: 0 }
  } finally {
    loading.value = false
  }
}

function gotoPage(n: number) {
  const target = Math.min(Math.max(1, n), pagination.value.last)
  if (target === pagination.value.current) return
  router.replace({ query: { ...route.query, page: target } })
}

watch(
  () => [route.query.page],
  () => fetchOrders(),
  { immediate: true }
)
</script>

<template>
  <div>
    <div v-if="error" class="mb-3 text-red-600">{{ error }}</div>
    <div v-else-if="loading">Loading…</div>

    <div v-else>
      <div v-if="!orders.length" class="text-sm text-gray-600">No orders yet.</div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="text-left text-gray-600">
            <tr>
              <th class="py-2 pr-3">#</th>
              <th class="py-2 pr-3">Date</th>
              <th class="py-2 pr-3">Status</th>
              <th class="py-2 pr-3">Payment</th>
              <th class="py-2 pr-3 text-right">Total</th>
              <!-- <th class="py-2 pr-3"></th> -->
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="o in orders" :key="o.id">
              <td class="py-3 pr-3 font-medium">{{ o.uuid || o.id }}</td>
              <td class="py-3 pr-3">{{ new Date(o.created_at).toLocaleString() }}</td>
              <td class="py-3 pr-3"><span class="px-2 py-0.5 rounded bg-gray-100">{{ o.status }}</span></td>
              <td class="py-3 pr-3">{{ o.payment_status }}</td>
              <td class="py-3 pr-3 text-right font-semibold">
                ${{ Number(o.total).toFixed(2) }}
              </td>
              <!-- <td class="py-3 pr-3">
                <NuxtLinkLocale
                  :to="{ path: `/account/orders/${o.id}` }"
                  class="inline-flex items-center rounded border px-2 py-1 hover:bg-gray-50"
                >
                  View
                </NuxtLinkLocale>
              </td> -->
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="mt-4 flex items-center justify-end gap-2">
          <button
            class="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
            :disabled="pagination.current <= 1"
            @click="gotoPage(pagination.current - 1)"
          >
            Prev
          </button>

          <span class="text-sm">
            Page {{ pagination.current }} / {{ pagination.last }}
          </span>

          <button
            class="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
            :disabled="pagination.current >= pagination.last"
            @click="gotoPage(pagination.current + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
