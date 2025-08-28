<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useNuxtApp, useRoute, useRouter } from '#app'

type Order = {
  id: number
  uuid?: string
  created_at: string
  total: number | string
  payment_status: string
  status: string
}

type OrderItem = {
  id: number
  product_id: number
  quantity: number
  price: number | string
  product_name?: string
  sku?: string
  image?: string
}

const { $customApi } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const perPage = 10
const page = computed(() => Math.max(1, Number(route.query.page ?? 1)))

const loading = ref(false)
const error = ref<string>('')

const orders = ref<Order[]>([])
const meta = ref<{ current: number; last: number; total: number }>({
  current: 1, last: 1, total: 0
})

/** Load list */
async function fetchOrders() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await $customApi('/account/orders', {
      params: { page: page.value, per_page: perPage }
    })
    const d = res?.data ?? res
    orders.value = Array.isArray(d?.data) ? d.data : []

    meta.value = {
      current: Number(d?.meta?.current_page ?? page.value),
      last:    Number(d?.meta?.last_page    ?? 1),
      total:   Number(d?.meta?.total        ?? orders.value.length)
    }

    // If URL page > last (e.g. after filters), snap back to last
    if (meta.value.last > 0 && page.value > meta.value.last) {
      go(meta.value.last)
    }
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to load orders.'
  } finally {
    loading.value = false
  }
}

/** Pagination helpers */
function go(n: number) {
  // guard to avoid “No orders yet” flicker
  if (n < 1 || n > meta.value.last || n === meta.value.current) return
  router.replace({ query: { ...route.query, page: String(n) } })
}

watch(() => route.query.page, fetchOrders)
onMounted(fetchOrders)

/** ------- Details (modal) ------- */
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref<{
  id?: number
  uuid?: string
  created_at?: string
  total?: number | string
  payment_status?: string
  status?: string
  address?: any
  items?: OrderItem[]
} | null>(null)

async function openDetails(orderId: number) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    const res: any = await $customApi(`/account/orders/${orderId}`)
    const d = res?.data ?? res
    // API returns a single resource object
    detail.value = {
      id: d?.id,
      uuid: d?.uuid,
      created_at: d?.created_at,
      total: d?.total,
      payment_status: d?.payment_status,
      status: d?.status,
      address: d?.address ?? null,
      items: d?.items ?? []
    }
  } catch (e: any) {
    detailError.value = e?.data?.message || e?.message || 'Failed to load order.'
  } finally {
    detailLoading.value = false
  }
}
function closeDetails() {
  detailOpen.value = false
  detail.value = null
}
</script>

<template>
  <div>
    <div v-if="error" class="mb-3 text-red-600">{{ error }}</div>
    <div v-if="loading">Loading…</div>

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
              <th class="py-2 pl-3 text-right w-24"> </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="o in orders" :key="o.id" class="hover:bg-gray-50">
              <td class="py-3 pr-3 font-medium">{{ o.uuid || o.id }}</td>
              <td class="py-3 pr-3">{{ new Date(o.created_at).toLocaleString() }}</td>
              <td class="py-3 pr-3">
                <span class="px-2 py-0.5 rounded bg-gray-100">{{ o.status }}</span>
              </td>
              <td class="py-3 pr-3">{{ o.payment_status }}</td>
              <td class="py-3 pr-3 text-right font-semibold">
                ${{ Number(o.total).toFixed(2) }}
              </td>
              <td class="py-3 pl-3 text-right">
                <button class="btn-secondary" @click="openDetails(o.id)">View</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="mt-4 flex items-center justify-end gap-2">
          <button
            class="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
            :disabled="meta.current <= 1"
            @click="go(meta.current - 1)"
          >
            Prev
          </button>

          <span class="text-sm">Page {{ meta.current }} / {{ meta.last }}</span>

          <button
            class="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
            :disabled="meta.current >= meta.last"
            @click="go(meta.current + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <div v-if="detailOpen" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40" @click="closeDetails"></div>
      <div
        class="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl p-5 overflow-y-auto"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Order details</h3>
          <button class="text-gray-600 hover:text-black" @click="closeDetails">✕</button>
        </div>

        <div v-if="detailLoading">Loading…</div>
        <div v-else-if="detailError" class="text-red-600">{{ detailError }}</div>

        <template v-else>
          <div class="grid sm:grid-cols-2 gap-3 text-sm mb-4">
            <div><span class="text-gray-500">Order #</span><div class="font-medium">{{ detail?.uuid || detail?.id }}</div></div>
            <div><span class="text-gray-500">Date</span><div class="font-medium">{{ detail?.created_at ? new Date(detail.created_at).toLocaleString() : '—' }}</div></div>
            <div><span class="text-gray-500">Status</span><div class="font-medium">{{ detail?.status }}</div></div>
            <div><span class="text-gray-500">Payment</span><div class="font-medium">{{ detail?.payment_status }}</div></div>
            <div><span class="text-gray-500">Total</span><div class="font-medium">${{ Number(detail?.total ?? 0).toFixed(2) }}</div></div>
          </div>

          <div v-if="detail?.address" class="mb-4">
            <h4 class="font-semibold mb-2">Shipping address</h4>
            <pre class="bg-gray-50 rounded p-3 text-xs whitespace-pre-wrap">{{ detail.address }}</pre>
          </div>

          <h4 class="font-semibold mb-2">Items</h4>
          <div class="grid sm:grid-cols-2 gap-3">
            <div
              v-for="it in (detail?.items || [])"
              :key="it.id"
              class="flex gap-3 rounded-lg border p-3 bg-white"
            >
              <img v-if="it.image" :src="it.image" class="h-14 w-14 rounded object-contain border" alt="">
              <div class="min-w-0">
                <div class="font-medium truncate">{{ it.product_name || ('#'+it.product_id) }}</div>
                <div class="text-xs text-gray-500">SKU: {{ it.sku || '—' }}</div>
                <div class="text-xs text-gray-500">Qty: {{ it.quantity }}</div>
              </div>
              <div class="ml-auto font-semibold self-center">${{ Number(it.price).toFixed(2) }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-secondary{ @apply inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white px-3 py-1.5 hover:bg-black disabled:opacity-50; }
</style>
