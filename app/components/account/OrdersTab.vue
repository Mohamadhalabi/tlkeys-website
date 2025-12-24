<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter, useNuxtApp } from '#app'
import { EyeIcon } from '@heroicons/vue/24/outline'

type Order = {
  id: number
  uuid?: string
  created_at: string
  total: number
  payment_status: string
  status: string
}

const emit = defineEmits(['view'])
const route = useRoute()
const router = useRouter()
const { $customApi } = useNuxtApp()

// Set perPage to 15 to match the API request
const perPage = 15
const loading = ref(false)
const error = ref('')
const orders = ref<Order[]>([])
const pagination = ref({ current: 1, last: 1, total: 0 })

function coercePage(v: any) {
  const n = Number(v || 1)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

async function fetchOrders() {
  loading.value = true;
  error.value = '';
  try {
    const page = route.query.page || 1;
    // We request 15 per page as seen in your network logs
    const res: any = await $customApi(`/account/orders?page=${page}&per_page=15`);
    
    // DEBUG: This will show you the structure in the browser console
    console.log("Orders API Raw Response:", res);

    // Some wrappers return the object directly, others wrap in .data
    // We check for the 'meta' key to find where the real response is
    const root = res?.meta ? res : (res?.data?.meta ? res.data : res);
    
    if (root && root.data) {
      orders.value = root.data; // This fills the table
      pagination.value = {
        current: Number(root.meta.current_page),
        last: Number(root.meta.last_page),
        total: Number(root.meta.total)
      };
    } else {
      console.error("Could not find data array in response", root);
      orders.value = [];
    }
  } catch (e: any) {
    error.value = 'Failed to load orders.';
    console.error("Fetch error:", e);
  } finally {
    loading.value = false;
  }
}

function gotoPage(n: number) {
  const target = Math.min(Math.max(1, n), pagination.value.last)
  router.replace({ query: { ...route.query, page: target } })
}

watch(() => [route.query.page], () => fetchOrders(), { immediate: true })
</script>

<template>
  <div>
    <div v-if="error" class="p-4 bg-red-50 text-red-600 rounded-lg mb-4">{{ error }}</div>
    
    <div v-if="loading" class="flex justify-center py-10">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>

    <div v-else>
      <div v-if="!orders.length" class="text-center py-10 text-gray-500 font-medium">No orders yet.</div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="text-left text-xs uppercase tracking-wider text-gray-500 bg-gray-50">
            <tr>
              <th class="px-4 py-3">Order ID</th>
              <th class="px-4 py-3">Date</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Total</th>
              <th class="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y border-b">
            <tr 
              v-for="o in orders" 
              :key="o.id" 
              class="hover:bg-orange-50/50 cursor-pointer transition-colors"
              @click="emit('view', o.id)"
            >
              <td class="px-4 py-4 font-mono text-xs font-bold">{{ o.uuid || o.id }}</td>
              <td class="px-4 py-4 text-gray-600">{{ new Date(o.created_at).toLocaleDateString() }}</td>
              <td class="px-4 py-4">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-gray-100">
                  {{ o.status }}
                </span>
              </td>
              <td class="px-4 py-4 text-right font-bold text-gray-900">
                ${{ Number(o.total).toFixed(2) }}
              </td>
              <td class="px-4 py-4 text-right">
                <button class="text-orange-600 hover:text-orange-800 p-1">
                  <EyeIcon class="h-5 w-5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-6 flex items-center justify-between border-t pt-4">
          <p class="text-sm text-gray-500">
            {{ $t('account.orders.pageOf', { 
                current: pagination.current, 
                total: pagination.last 
              }) 
            }}
          </p>
          
          <div class="flex gap-2">
            <button
              class="px-4 py-2 text-sm font-medium rounded border bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              :disabled="pagination.current <= 1"
              @click.stop="gotoPage(pagination.current - 1)"
            >
              {{ $t('common.prev') }}
            </button>
            <button
              class="px-4 py-2 text-sm font-medium rounded border bg-white disabled:opacity-50 hover:bg-gray-50 transition-colors"
              :disabled="pagination.current >= pagination.last"
              @click.stop="gotoPage(pagination.current + 1)"
            >
              {{ $t('common.next') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>