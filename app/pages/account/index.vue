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
  ArrowLeftOnRectangleIcon as LogoutIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { $customApi } = useNuxtApp()
const { t, te, locale } = useI18n()
const { logout, user } = useAuth()

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
    // Optional: if /account/stats also returns balances, they take priority
    // over the (possibly cached) user object.
    if (d.tokens && typeof d.tokens === 'object') statsTokens.value = d.tokens as any
  } catch { /* ignore */ }
  finally { loadingStats.value = false }
})

/* ───────────────────────── Service tokens ─────────────────────────
 * One entry per online calculator. `fields` lists the property names to
 * look for on the user object (or on `tokens` from /account/stats); the
 * first one present wins. Rename them to match your API.
 */
const statsTokens = ref<any>({})

/* Kia / Hyundai balances — the same endpoint the PIN code form uses.
   Returns { balances: { kia_pre2017: n, kia_post2017: n } }. */
const pinBalances = ref<Record<string, number>>({})
onMounted(async () => {
  try {
    const res: any = await $customApi('/pin-code/balances', { method: 'GET' })
    const body = res?.data ?? res
    if (body?.balances && typeof body.balances === 'object') pinBalances.value = body.balances
  } catch { /* not logged in or endpoint down — cards fall back to 0 */ }
})

/* English fallback so raw keys never show if a locale is missing account.tokens */
const TOKENS_EN: Record<string, string> = {
  title: 'My service tokens',
  subtitle: 'Your balance for each online calculator.',
  toyota: 'Toyota Passcode',
  toyota_desc: 'Passcode calculation',
  kia_new: 'Kia / Hyundai 2017+',
  kia_old: 'Kia / Hyundai before 2017',
  pin_key_desc: 'PIN code & key code calculation',
  lookup: 'Kia / Hyundai Part Number Lookup',
  lookup_desc: 'Remote part number from the VIN',
  tokens_available: 'tokens available',
  subscription_active: 'Monthly subscription active',
  subscription_until: 'Until {date}',
  days_left: '{n} days left',
  subscription_expired: 'Subscription expired on {date}',
  use: 'Use',
  buy: 'Buy tokens',
}
function tx(key: string, params: Record<string, unknown> = {}) {
  const full = `account.tokens.${key}`
  if (te(full)) return t(full, params)
  return (TOKENS_EN[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

type ServiceDef = {
  key: string
  name: string
  desc: string
  icon: any
  to: string
  tokenFields: string[]
  subscriptionFields?: string[]   // expiry date of a monthly subscription
  buyTo?: string                  // where 'Buy tokens' goes (default: <to>#buy-tokens)
}

const SERVICES = computed<ServiceDef[]>(() => [
  {
    key: 'toyota',
    name: tx('toyota'),
    desc: tx('toyota_desc'),
    icon: KeyIcon,
    to: '/toyota-passcode',
    tokenFields: ['toyota_tokens'],
  },
  {
    key: 'kia_new',
    name: tx('kia_new'),
    desc: tx('pin_key_desc'),
    icon: KeyIcon,
    to: '/pin-code',
    buyTo: '/pin-code',
    tokenFields: ['kia_post2017', 'kia_hyundai_new_tokens', 'kia_new_tokens'],
  },
  {
    key: 'kia_old',
    name: tx('kia_old'),
    desc: tx('pin_key_desc'),
    icon: KeyIcon,
    to: '/pin-code',
    buyTo: '/pin-code',
    tokenFields: ['kia_pre2017', 'kia_hyundai_old_tokens', 'kia_old_tokens'],
  },
  {
    key: 'lookup',
    name: tx('lookup'),
    desc: tx('lookup_desc'),
    icon: MagnifyingGlassIcon,
    to: '/kia-hyundai-part-number-lookup',
    tokenFields: [
      'part_number_tokens', 'partnumber_tokens', 'part_tokens',
      'vin_lookup_tokens', 'kia_lookup_tokens', 'lookup_tokens', 'vin_tokens',
      'tokens', // the original (first) token balance, before Toyota got its own
    ],
    subscriptionFields: [
      'part_number_subscription_expires_at', 'part_number_subscription_ends_at',
      'vin_lookup_subscription_expires_at', 'lookup_subscription_ends_at',
    ],
  },
])

/* Dev only: print the token-related fields the API really sends, so the
   names above can be matched exactly. Shows in the browser console. */
if (import.meta.dev && import.meta.client) {
  watch(user, (u: any) => {
    if (!u) return
    const found = Object.fromEntries(
      Object.entries(u).filter(([k]) => /token|subscri|credit|balance/i.test(k))
    )
    console.info('[account] token fields on user:', found)
  }, { immediate: true })
}

/**
 * Kia / Hyundai balances live in their own table as rows of
 * { type: 'kia_post2017' | 'kia_pre2017', balance }. When the API sends those
 * rows (on the user or in /account/stats) as an array, turn them into
 * { kia_post2017: 4, kia_pre2017: 5 } so they can be looked up by name.
 */
function rowsToMap(obj: any): Record<string, any> {
  const out: Record<string, any> = {}
  if (!obj || typeof obj !== 'object') return out
  const scan = (v: any) => {
    if (!Array.isArray(v)) return
    for (const row of v) {
      if (row && typeof row === 'object' && row.type != null && row.balance != null) {
        out[String(row.type)] = row.balance
      }
    }
  }
  scan(obj)
  for (const v of Object.values(obj)) scan(v)
  return out
}

const balanceMap = computed<Record<string, any>>(() => ({
  ...pinBalances.value,
  ...rowsToMap(user.value),
  ...(user.value as any ?? {}),
  ...rowsToMap(statsTokens.value),
  ...(Array.isArray(statsTokens.value) ? {} : statsTokens.value),
}))

function pick(fields: string[] = []) {
  for (const f of fields) {
    const v = balanceMap.value[f]
    if (v !== undefined && v !== null && v !== '' && typeof v !== 'object') return v
  }
  return null
}

function formatDate(d: Date) {
  try {
    return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

const tokenCards = computed(() => {
  const now = Date.now()
  return SERVICES.value.map(s => {
    const tokens = Math.max(0, Number(pick(s.tokenFields) ?? 0) || 0)

    let sub: null | { active: boolean; date: string; daysLeft: number } = null
    const raw = s.subscriptionFields ? pick(s.subscriptionFields) : null
    if (raw) {
      const end = new Date(raw)
      if (!Number.isNaN(end.getTime())) {
        const ms = end.getTime() - now
        sub = {
          active: ms > 0,
          date: formatDate(end),
          daysLeft: Math.max(0, Math.ceil(ms / 86_400_000)),
        }
      }
    }

    return { ...s, tokens, sub, ready: tokens > 0 || !!sub?.active }
  })
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

          <div v-if="active === 'dashboard'" class="space-y-6">

            <!-- ═════ Service tokens ═════ -->
            <!-- Client-only: balances come from the logged-in user, which the
                 server render does not have; rendering on the server gave every
                 card the zero-balance colors, and hydration kept them. -->
            <ClientOnly>
              <section class="rounded-xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
                  <h3 class="text-base font-bold text-gray-900">{{ tx('title') }}</h3>
                  <p class="text-xs text-gray-500">{{ tx('subtitle') }}</p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div v-for="card in tokenCards" :key="card.key" class="token-card">
                    <!-- Name -->
                    <div class="flex items-start gap-2">
                      <component :is="card.icon" class="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 leading-snug">{{ card.name }}</p>
                        <p class="text-[11px] text-gray-500 leading-snug mt-0.5">{{ card.desc }}</p>
                      </div>
                    </div>

                    <!-- Balance -->
                    <div class="mt-auto pt-3">
                      <div v-if="card.sub?.active" class="flex items-center gap-1.5 text-green-700">
                        <CalendarDaysIcon class="w-4 h-4 shrink-0" />
                        <div class="min-w-0">
                          <p class="text-xs font-bold leading-tight">{{ tx('subscription_active') }}</p>
                          <p class="text-[11px] leading-tight">
                            {{ tx('subscription_until', { date: card.sub.date }) }} · {{ tx('days_left', { n: card.sub.daysLeft }) }}
                          </p>
                        </div>
                      </div>

                      <div v-if="!(card.sub?.active && card.tokens === 0)"
                           class="flex items-baseline gap-1.5" :class="card.sub?.active ? 'mt-2' : ''">
                        <span class="text-2xl font-black tabular-nums leading-none"
                              :class="card.tokens > 0 ? 'text-gray-900' : 'text-gray-300'">
                          {{ card.tokens }}
                        </span>
                        <span class="text-[11px] text-gray-500">{{ tx('tokens_available') }}</span>
                      </div>

                      <p v-if="card.sub && !card.sub.active" class="mt-1 text-[11px] text-gray-500">
                        {{ tx('subscription_expired', { date: card.sub.date }) }}
                      </p>
                    </div>

                    <!-- Actions -->
                    <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs font-bold">
                      <NuxtLinkLocale :to="card.to" class="text-gray-700 hover:text-gray-900">
                        {{ tx('use') }} →
                      </NuxtLinkLocale>
                      <NuxtLinkLocale
                        :to="card.buyTo || `${card.to}#buy-tokens`"
                        class="px-2.5 py-1 rounded-md transition-colors"
                        :class="card.ready
                          ? 'text-orange-700 hover:bg-orange-50'
                          : 'bg-orange-600 text-white hover:bg-orange-700'"
                      >
                        {{ tx('buy') }}
                      </NuxtLinkLocale>
                    </div>
                  </div>
                </div>
              </section>
              <template #fallback>
                <section class="rounded-xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
                  <div class="h-5 w-40 bg-gray-200 rounded mb-4 animate-pulse"></div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div v-for="n in 4" :key="n" class="token-card animate-pulse">
                      <div class="h-4 w-3/4 bg-gray-200 rounded"></div>
                      <div class="h-3 w-1/2 bg-gray-100 rounded mt-2"></div>
                      <div class="h-7 w-10 bg-gray-200 rounded mt-auto"></div>
                      <div class="h-4 w-full bg-gray-100 rounded mt-3"></div>
                    </div>
                  </div>
                </section>
              </template>
            </ClientOnly>

            <!-- ═════ Account shortcuts ═════ -->
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
.token-card {
  @apply rounded-lg border border-gray-200 bg-white p-3.5 flex flex-col sm:min-h-[150px];
}
</style>