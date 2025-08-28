<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNuxtApp } from '#app'

type OrderItem = {
  id: number
  product_id: number
  quantity: number
  price: number
  product_name?: string
  sku?: string
  image?: string
}

type Address = {
  country?: string
  city?: string
  address?: string
  phone?: string
  name?: string
}

type OrderDetail = {
  id: number
  uuid?: string
  status: string
  payment_status: string
  shipping_method?: string
  payment_method?: string
  total: number
  shipping?: number
  created_at: string
  items?: OrderItem[]
  address?: Address
}

const props = defineProps<{ id: number }>()
const emit = defineEmits<{ (e: 'close'): void }>()
const { $customApi } = useNuxtApp()

const loading = ref(true)
const error = ref('')
const order = ref<OrderDetail | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await $customApi(`/account/orders/${props.id}`)
    const d = res?.data ?? res
    order.value = d
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to load order.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <!-- simple modal -->
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
    <div class="bg-white rounded-xl shadow-xl w-[min(900px,92vw)] max-h-[90vh] overflow-y-auto">
      <div class="p-4 border-b flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          Order {{ order?.uuid || order?.id || '' }}
        </h3>
        <button class="rounded px-3 py-1 bg-gray-100 hover:bg-gray-200" @click="emit('close')">Close</button>
      </div>

      <div class="p-4">
        <div v-if="error" class="mb-3 text-red-600">{{ error }}</div>
        <div v-else-if="loading">Loading…</div>

        <div v-else-if="order">
          <!-- header -->
          <div class="grid sm:grid-cols-2 gap-4 mb-6">
            <div class="rounded-lg border p-3">
              <div class="text-sm text-gray-500">Status</div>
              <div class="font-medium">{{ order.status }} ({{ order.payment_status }})</div>
              <div class="text-sm text-gray-500 mt-2">Placed</div>
              <div>{{ new Date(order.created_at).toLocaleString() }}</div>
            </div>

            <div class="rounded-lg border p-3">
              <div class="text-sm text-gray-500">Summary</div>
              <div>Total: <strong>${{ Number(order.total).toFixed(2) }}</strong></div>
              <div>Shipping: ${{ Number(order.shipping ?? 0).toFixed(2) }}</div>
              <div v-if="order.shipping_method">Ship: {{ order.shipping_method }}</div>
              <div v-if="order.payment_method">Pay: {{ order.payment_method }}</div>
            </div>
          </div>

          <!-- address -->
          <div v-if="order.address" class="rounded-lg border p-3 mb-6">
            <div class="text-sm text-gray-500 mb-1">Shipping address</div>
            <div class="font-medium">{{ order.address.name }}</div>
            <div>{{ order.address.address }}</div>
            <div>{{ order.address.city }} {{ order.address.country }}</div>
            <div>{{ order.address.phone }}</div>
          </div>

          <!-- items -->
          <div class="rounded-lg border">
            <table class="min-w-full text-sm">
              <thead class="text-left text-gray-600">
                <tr>
                  <th class="py-2 px-3">Product</th>
                  <th class="py-2 px-3">SKU</th>
                  <th class="py-2 px-3">Qty</th>
                  <th class="py-2 px-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="it in (order.items || [])" :key="it.id">
                  <td class="py-2 px-3">
                    <div class="flex items-center gap-3">
                      <img v-if="it.image" :src="it.image" alt class="h-12 w-12 object-contain rounded border" />
                      <div class="min-w-0">
                        <div class="font-medium truncate">{{ it.product_name || ('#'+it.product_id) }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="py-2 px-3">{{ it.sku || '—' }}</td>
                  <td class="py-2 px-3">{{ it.quantity }}</td>
                  <td class="py-2 px-3 text-right font-semibold">${{ Number(it.price).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
