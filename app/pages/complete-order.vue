<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, useNuxtApp, useHead } from '#imports'

type Money = { value?: string | number|null; currency?: string|null; code?: string|null; exchange_rate?: number|null } | number | string | null
type Address = { country?: string|null; city?: string|null; address?: string|null; postal_code?: string|null; phone?: string|null } | null
type OrderPayload = {
  order_id?: string
  type?: string
  payment_method?: string
  payment_status?: string
  total?: Money
  shipping_method?: string
  shipping?: Money
  status?: string
  coupon_value?: Money
  tracking_no?: string|null
  created_at?: string
  address?: Address
} | null

const route = useRoute()
const router = useRouter()
const { $customApi } = useNuxtApp()

const orderId = computed(() => String(route.query.orderId || '').trim() || null)
const explicitSuccess = computed(() => {
  const v = String(route.query.success ?? '').toLowerCase().trim()
  return v === '' ? null : (v === 'true' ? true : v === 'false' ? false : null)
})

const loading = ref(true)
const error = ref<string | null>(null)
const order = ref<OrderPayload>(null)

// small helpers
const money = (m: Money): string => {
  if (m == null) return '0.00'
  if (typeof m === 'number') return m.toFixed(2)
  if (typeof m === 'string') {
    const n = Number(m)
    return Number.isFinite(n) ? n.toFixed(2) : m
  }
  // object { value, currency, code }
  const raw = m.value ?? 0
  const n = Number(raw)
  const val = Number.isFinite(n) ? n.toFixed(2) : String(raw)
  const sym = (m as any).currency || ''
  return `${val}${sym ? ' ' + sym : ''}`
}

const nice = (v: unknown): string => (v == null || v === '') ? '—' : String(v)
const up = (v: unknown): string => nice(v).toUpperCase()

const isPaid = computed(() => (order.value?.payment_status || '').toLowerCase() === 'paid')
const isFailed = computed(() => {
  if (explicitSuccess.value === false) return true
  const st = (order.value?.status || '').toLowerCase()
  const p  = (order.value?.payment_status || '').toLowerCase()
  return st === 'canceled' || p === 'failed'
})
const isSuccess = computed(() => {
  if (explicitSuccess.value === true) return true
  if (explicitSuccess.value === false) return false
  // If we don’t know, consider success when we at least have an order
  return !!order.value && !isFailed.value
})

async function fetchOrder() {
  if (!orderId.value) {
    error.value = 'Missing order id'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    // Your API route: GET /user/orders/{uuid} (auth:api)
    const res = await $customApi<any>(`/user/orders/${encodeURIComponent(orderId.value)}`)
    // Accept both { data: { order: {...} } } and { order: {...} }
    const payload = res?.data ?? res ?? {}
    order.value = payload?.order ?? payload
  } catch (e: any) {
    error.value = e?.message || 'Failed to load order'
  } finally {
    loading.value = false
  }
}

function goHome() {
  router.push('/')
}
function goOrders() {
  // adjust this path to your real “My Orders” page if different
  router.push('/account/orders')
}

useHead({
  title: computed(() => orderId.value ? `Order ${orderId.value} — Complete` : 'Complete Order'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

onMounted(fetchOrder)
</script>

<template>
  <main class="container mx-auto px-3 md:px-4 lg:px-6 py-8">
    <!-- Breadcrumbs -->
    <nav class="text-sm mb-6">
      <ol class="flex gap-2 text-gray-500">
        <li><NuxtLink to="/">Home</NuxtLink></li>
        <li>/</li>
        <li class="text-gray-900 font-medium">Complete order</li>
      </ol>
    </nav>

    <!-- State: loading -->
    <div v-if="loading" class="rounded-2xl border bg-white p-6 shadow-sm animate-pulse">
      <div class="h-5 w-40 bg-gray-200 rounded mb-4"></div>
      <div class="h-4 w-64 bg-gray-200 rounded mb-2"></div>
      <div class="h-4 w-56 bg-gray-200 rounded mb-2"></div>
      <div class="h-4 w-44 bg-gray-200 rounded"></div>
    </div>

    <!-- State: error -->
    <div v-else-if="error" class="rounded-2xl border bg-white p-6 shadow-sm">
      <div class="flex items-start gap-3 text-rose-700">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 7h2v6h-2V7zm0 8h2v2h-2v-2z"/><path d="M1 21h22L12 2 1 21z"/>
        </svg>
        <div>
          <h2 class="text-lg font-semibold mb-1">Couldn’t load your order</h2>
          <p class="text-sm text-gray-600">{{ error }}</p>
          <div class="mt-4 flex gap-2">
            <button class="px-4 py-2 rounded-xl border hover:bg-gray-50" @click="fetchOrder">Try again</button>
            <button class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" @click="goHome">Go home</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <section class="lg:col-span-8 space-y-6">
        <!-- Banner -->
        <div
          class="rounded-2xl border p-5 shadow-sm"
          :class="isFailed ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'"
        >
          <div class="flex items-start gap-3">
            <svg v-if="isFailed" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-rose-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21z"/><path d="M11 7h2v6h-2zM11 15h2v2h-2z" fill="white"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-emerald-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm-1 15l-4-4 1.414-1.414L11 13.172l5.586-5.586L18 9z"/>
            </svg>
            <div>
              <h2 class="text-lg font-semibold">
                <template v-if="isFailed">Payment failed or canceled</template>
                <template v-else>Thanks! Your order is confirmed</template>
              </h2>
              <p class="text-sm text-gray-700 mt-1">
                <span class="text-gray-500">Order ID:</span>
                <span class="font-mono font-medium">{{ order?.order_id || '—' }}</span>
                <span class="mx-2">•</span>
                <span class="text-gray-500">Placed on</span>
                <span class="font-medium">{{ order?.created_at || '—' }}</span>
              </p>
              <p v-if="!isFailed && !isPaid" class="text-xs text-gray-600 mt-1">
                Payment status: <span class="font-medium">{{ up(order?.payment_status) }}</span>.
                You’ll receive an email with next steps shortly.
              </p>
            </div>
          </div>
        </div>

        <!-- Order details -->
        <div class="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 class="text-lg font-semibold mb-4">Order details</h3>
          <div class="grid sm:grid-cols-2 gap-4 text-sm">
            <div class="space-y-1">
              <div class="flex justify-between"><span class="text-gray-600">Order ID</span><span class="font-medium">{{ order?.order_id || '—' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Status</span><span class="font-medium">{{ up(order?.status) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Payment</span><span class="font-medium">{{ up(order?.payment_method) }} · {{ up(order?.payment_status) }}</span></div>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between"><span class="text-gray-600">Shipping</span><span class="font-medium">{{ up(order?.shipping_method) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Shipping cost</span><span class="font-medium">{{ money(order?.shipping ?? 0) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Total</span><span class="font-semibold text-gray-900">{{ money(order?.total ?? 0) }}</span></div>
            </div>
          </div>
        </div>

        <!-- Shipping address -->
        <div class="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 class="text-lg font-semibold mb-3">Shipping address</h3>
          <div class="text-sm text-gray-700">
            <div>{{ order?.address?.address || '—' }}</div>
            <div class="text-gray-600">{{ order?.address?.city || '—' }}, {{ order?.address?.postal_code || '—' }}</div>
            <div class="text-gray-600">{{ order?.address?.country || '—' }}</div>
            <div class="mt-1">☎ {{ order?.address?.phone || '—' }}</div>
          </div>
        </div>
      </section>

      <!-- Aside -->
      <aside class="lg:col-span-4">
        <div class="rounded-2xl border bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h3 class="text-lg font-semibold">What’s next?</h3>
          <ul class="mt-3 text-sm text-gray-700 space-y-2">
            <li v-if="isFailed" class="flex gap-2">
              <span class="text-rose-600 font-medium">•</span>
              Try another payment method from your Orders page.
            </li>
            <li v-else class="flex gap-2">
              <span class="text-emerald-600 font-medium">•</span>
              We’ll notify you by email when your order status changes.
            </li>
            <li class="flex gap-2">
              <span class="text-gray-500 font-medium">•</span>
              Keep your order ID <span class="font-mono">{{ order?.order_id || '—' }}</span> for reference.
            </li>
          </ul>

          <div class="mt-5 flex flex-col gap-2">
            <button class="w-full rounded-xl bg-emerald-600 text-white px-4 py-2.5 font-medium hover:bg-emerald-700" @click="goOrders">
              View my orders
            </button>
            <button class="w-full rounded-xl border px-4 py-2.5 font-medium hover:bg-gray-50" @click="goHome">
              Continue shopping
            </button>
          </div>

          <div class="mt-6 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
            <div class="flex justify-between">
              <span>Payment method</span>
              <span class="font-medium">{{ up(order?.payment_method) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Payment status</span>
              <span class="font-medium">{{ up(order?.payment_status) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Tracking</span>
              <span class="font-medium">{{ order?.tracking_no ? order.tracking_no : '—' }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
/* (empty — Tailwind handles styling) */
</style>
