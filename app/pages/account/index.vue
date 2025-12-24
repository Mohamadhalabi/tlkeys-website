<script setup lang="ts">
definePageMeta({ middleware: ['auth-account'] })

import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, useNuxtApp } from '#app'
import { useI18n } from 'vue-i18n'
import { useAuth } from '~/composables/useAuth'

// Tabs/components
import ProfileTab from '~/components/account/ProfileTab.vue'
import OrdersTab from '~/components/account/OrdersTab.vue'
import AddressesTab from '~/components/account/AddressesTab.vue'

// Icons
import {
  ClipboardDocumentListIcon as OrdersIcon,
  TicketIcon,
  MapPinIcon,
  UserCircleIcon,
  ShoppingCartIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ArrowLeftOnRectangleIcon as LogoutIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { $customApi } = useNuxtApp()
const { t } = useI18n()
const { logout } = useAuth()

/** SEO Meta */
useSeoMeta({
  title: t('account.pageTitle'),
  description: 'Manage your orders, profile settings, and shipping addresses.'
})

/** Active tab logic */
const active = computed<string>(() => {
  const k = String(route.query.tab || '')
  return [
    'dashboard','profile','password','orders','coupons',
    'addresses','reviews','cart','whatsnew', 'order_details'
  ].includes(k) ? k : 'dashboard'
})

function setTab(key: string) {
  router.push({ query: { ...route.query, tab: key, id: undefined } })
}

/** Single Order Logic */
const selectedOrder = ref<any>(null)
const loadingOrder = ref(false)
const downloadingPdf = ref(false)

async function fetchOrderDetails(id: string | number) {
  try {
    loadingOrder.value = true
    const res: any = await $customApi(`/account/orders/${id}`)
    selectedOrder.value = res.data ?? res
  } catch (err) {
    setTab('orders')
  } finally {
    loadingOrder.value = false
  }
}

async function downloadInvoice(orderId: number) {
  try {
    downloadingPdf.value = true
    const res: any = await $customApi(`/account/orders/${orderId}/download`, {
      responseType: 'blob'
    })
    const blob = new Blob([res], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Order-${selectedOrder.value.uuid}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error("PDF download failed", err)
  } finally {
    downloadingPdf.value = false
  }
}

watch(() => route.query.id, (newId) => {
  if (active.value === 'order_details' && newId) {
    fetchOrderDetails(String(newId))
  }
}, { immediate: true })

function openOrder(id: number) {
  router.push({ query: { ...route.query, tab: 'order_details', id } })
}

/** Stats & Sidebar */
const stats = ref({ orders: 0, coupons: 0, cart: 0, addresses: 0 })
const loadingStats = ref(false)

onMounted(async () => {
  try {
    loadingStats.value = true
    const res: any = await $customApi('/account/stats')
    const d = res?.data ?? res ?? {}
    stats.value = {
      orders: Number(d.orders ?? 0),
      coupons: Number(d.coupons ?? 0),
      cart: Number(d.cart ?? 0),
      addresses: Number(d.addresses ?? 0)
    }
  } catch { /* ignore */ }
  finally { loadingStats.value = false }
})

const side = computed(() => [
  { key: 'dashboard',  label: t('account.tabs.dashboard') },
  { key: 'profile',    label: t('account.tabs.accountDetails') },
  { key: 'orders',     label: t('account.tabs.myOrders'), badge: stats.value.orders },
  { key: 'coupons',    label: t('account.tabs.myCoupons'), badge: stats.value.coupons },
  { key: 'reviews',    label: t('account.tabs.myReview') },
  { key: 'whatsnew',   label: t('account.tabs.whatsNew') }
])

const tabHeading = computed(() => {
  if (active.value === 'order_details') return t('completeCustomOrder.orderDetails') || 'Order Details'
  const titles: any = {
    profile: t('account.tabs.accountDetails'),
    password: t('account.tabs.editPassword'),
    orders: t('account.tabs.myOrders'),
    coupons: t('account.tabs.myCoupons'),
    addresses: t('account.tabs.myAddresses'),
    reviews: t('account.tabs.myReview'),
    cart: t('account.tabs.cart'),
    whatsnew: t('account.tabs.whatsNew'),
    dashboard: t('account.tabs.dashboard')
  }
  return titles[active.value] || t('account.tabs.dashboard')
})

async function handleLogout() {
  await logout()
  router.push('/')
}
</script>

<template>
  <section class="max-w-screen-2xl mx-auto px-3 lg:px-6 py-6 lg:py-10">
    <h1 class="text-2xl lg:text-3xl font-extrabold tracking-tight mb-6">{{ $t('account.pageTitle') }}</h1>

    <div class="grid grid-cols-12 gap-6">
      <aside class="col-span-12 md:col-span-4 lg:col-span-3">
        <nav class="bg-white rounded-xl shadow border overflow-hidden sticky top-4">
          <template v-for="(item, idx) in side" :key="item.key">
            <button
              @click="setTab(item.key)"
              class="w-full text-left px-5 py-3.5 flex items-center justify-between border-b last:border-b-0 transition-colors"
              :class="active === item.key || (active === 'order_details' && item.key === 'orders')
                ? 'bg-orange-50 text-orange-900 font-semibold'
                : 'hover:bg-gray-50 text-gray-800'"
            >
              <span>{{ item.label }}</span>
              <span v-if="item.badge" class="bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded-full">
                {{ item.badge }}
              </span>
            </button>
            <hr v-if="idx === 0" class="border-gray-200" />
          </template>
        </nav>
      </aside>

      <div class="col-span-12 md:col-span-8 lg:col-span-9">
        <div class="bg-white rounded-xl shadow p-4 sm:p-8">
          
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-4">
              <button v-if="active === 'order_details'" @click="setTab('orders')" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeftIcon class="h-5 w-5 text-gray-600" />
              </button>
              <h2 class="text-2xl font-bold text-gray-900">{{ tabHeading }}</h2>
            </div>
            
            <button 
              v-if="active === 'order_details' && selectedOrder" 
              @click="downloadInvoice(selectedOrder.id)"
              class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 text-sm font-semibold"
              :disabled="downloadingPdf"
            >
              <ArrowDownTrayIcon class="h-4 w-4" />
              <span>{{ downloadingPdf ? 'Downloading...' : 'Invoice PDF' }}</span>
            </button>
          </div>

          <hr class="mb-6 border-gray-100" />

          <div v-if="active === 'dashboard'" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <NuxtLinkLocale :to="{ query: { tab: 'orders' } }" class="tile group">
              <OrdersIcon class="h-8 w-8 text-gray-400 group-hover:text-orange-500 transition-colors" />
              <div class="tile-label text-lg font-semibold">{{ $t('account.tabs.myOrders') }}</div>
              <div v-if="!loadingStats" class="tile-sub text-gray-500 text-sm">{{ stats.orders }} total</div>
            </NuxtLinkLocale>

            <NuxtLinkLocale :to="{ query: { tab: 'coupons' } }" class="tile group">
              <TicketIcon class="h-8 w-8 text-gray-400 group-hover:text-orange-500 transition-colors" />
              <div class="tile-label text-lg font-semibold">{{ $t('account.tabs.myCoupons') }}</div>
              <div v-if="!loadingStats" class="tile-sub text-gray-500 text-sm">{{ stats.coupons }} available</div>
            </NuxtLinkLocale>

            <NuxtLinkLocale :to="{ query: { tab: 'addresses' } }" class="tile group">
              <MapPinIcon class="h-8 w-8 text-gray-400 group-hover:text-orange-500 transition-colors" />
              <div class="tile-label text-lg font-semibold">{{ $t('account.tabs.myAddresses') }}</div>
              <div v-if="!loadingStats" class="tile-sub text-gray-500 text-sm">{{ stats.addresses }} saved</div>
            </NuxtLinkLocale>

            <NuxtLinkLocale :to="{ query: { tab: 'profile' } }" class="tile group">
              <UserCircleIcon class="h-8 w-8 text-gray-400 group-hover:text-orange-500 transition-colors" />
              <div class="tile-label text-lg font-semibold">{{ $t('account.tabs.accountDetails') }}</div>
              <div class="tile-sub text-gray-500 text-sm">Manage profile</div>
            </NuxtLinkLocale>

            <NuxtLinkLocale :to="{ query: { tab: 'cart' } }" class="tile group">
              <ShoppingCartIcon class="h-8 w-8 text-gray-400 group-hover:text-orange-500 transition-colors" />
              <div class="tile-label text-lg font-semibold">{{ $t('account.tabs.cart') }}</div>
              <div v-if="!loadingStats" class="tile-sub text-gray-500 text-sm">{{ stats.cart }} items</div>
            </NuxtLinkLocale>

            <button type="button" @click="handleLogout" class="tile group text-red-700 hover:text-red-800">
              <LogoutIcon class="h-8 w-8 text-red-400" />
              <div class="tile-label text-lg font-semibold">Logout</div>
              <div class="tile-sub text-sm">Sign Out</div>
            </button>
          </div>

          <OrdersTab v-else-if="active === 'orders'" @view="openOrder" />

          <div v-else-if="active === 'order_details'">
            <div v-if="loadingOrder" class="space-y-4 animate-pulse">
               <div class="h-8 bg-gray-100 rounded w-1/3"></div>
               <div class="h-32 bg-gray-50 rounded"></div>
            </div>
            
            <div v-else-if="selectedOrder" class="space-y-8">
              <div class="bg-gray-50 rounded-lg p-6 flex flex-wrap gap-6 justify-between border">
                <div>
                  <span class="text-xs uppercase text-gray-400 font-bold tracking-widest">Order Number</span>
                  <p class="font-mono text-lg font-bold">#{{ selectedOrder.uuid }}</p>
                </div>
                <div>
                  <span class="text-xs uppercase text-gray-400 font-bold tracking-widest">Status</span>
                  <p><span class="px-2 py-1 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                    {{ selectedOrder.status }}
                  </span></p>
                </div>
                <div>
                  <span class="text-xs uppercase text-gray-400 font-bold tracking-widest">Payment</span>
                  <p class="text-sm font-semibold capitalize text-gray-700">{{ selectedOrder.payment_status }}</p>
                </div>
                <div>
                  <span class="text-xs uppercase text-gray-400 font-bold tracking-widest">Shipping</span>
                  <p class="text-sm font-semibold uppercase text-gray-700">{{ selectedOrder.shipping_method || 'Standard' }}</p>
                </div>
                <div>
                  <span class="text-xs uppercase text-gray-400 font-bold tracking-widest">Total Amount</span>
                  <p class="text-lg font-bold text-gray-900">${{ selectedOrder.total }}</p>
                </div>
              </div>

              <div class="border rounded-xl overflow-hidden shadow-sm">
                <table class="w-full text-left">
                  <thead class="bg-gray-50 border-b">
                    <tr>
                      <th class="px-6 py-4 text-sm font-semibold text-gray-600 uppercase">Items</th>
                      <th class="px-6 py-4 text-sm font-semibold text-gray-600 text-center uppercase">Qty</th>
                      <th class="px-6 py-4 text-sm font-semibold text-gray-600 text-right uppercase">Price</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y">
                    <tr v-for="item in selectedOrder.items" :key="item.id">
                      <td class="px-6 py-4 flex items-center gap-4">
                        <img :src="item.image" class="w-16 h-16 object-cover rounded bg-gray-100 border shadow-sm" />
                        <span class="font-bold text-gray-800">{{ item.product_name }}</span>
                      </td>
                      <td class="px-6 py-4 text-center text-gray-600">{{ item.quantity }}</td>
                      <td class="px-6 py-4 text-right font-bold text-gray-900">${{ item.price }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="grid md:grid-cols-2 gap-6">
                <div class="border rounded-xl p-6 bg-white shadow-sm">
                  <h3 class="font-bold mb-4 flex items-center gap-2 border-b pb-2 text-gray-800 uppercase text-xs tracking-widest">
                    <MapPinIcon class="h-4 w-4 text-orange-400" /> Delivery Address
                  </h3>
                  <div class="text-gray-600 text-sm leading-relaxed" v-if="selectedOrder.address">
                    <p class="font-semibold text-gray-900 mb-1">{{ selectedOrder.address.address }}</p>
                    <p>{{ selectedOrder.address.city }}</p>
                    <p class="mt-3 text-xs text-gray-400 font-mono">Phone: {{ selectedOrder.address.phone }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ProfileTab v-else-if="active === 'profile' || active === 'password'" />
          <AddressesTab v-else-if="active === 'addresses'" />
          <div v-else class="text-sm text-gray-600 py-10 text-center italic">
            {{ $t('common.comingSoon') || 'Feature coming soon' }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tile {
  @apply relative rounded-xl border bg-white p-6 shadow-sm
         hover:shadow-md transition-all hover:bg-orange-50/30
         flex flex-col items-center justify-center text-center gap-2;
}
</style>