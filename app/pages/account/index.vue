<script setup lang="ts">
definePageMeta({ middleware: ['auth-account'] })

import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, useNuxtApp } from '#app'
import { useI18n } from 'vue-i18n'

// Tabs/components
import ProfileTab from '~/components/account/ProfileTab.vue'
import OrdersTab from '~/components/account/OrdersTab.vue'
import AddressesTab from '~/components/account/AddressesTab.vue'

// Icons
import {
  ClipboardDocumentListIcon as OrdersIcon,
  WalletIcon,
  TicketIcon,
  MapPinIcon,
  UserCircleIcon,
  ShoppingCartIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const { $customApi } = useNuxtApp()
const { t, locale } = useI18n()

/** Active tab via query (?tab=) with dashboard default */
const active = computed<string>(() => {
  const k = String(route.query.tab || '')
  return [
    'dashboard','profile','password','orders','wallet','coupons',
    'addresses','reviews','cart','whatsnew'
  ].includes(k) ? k : 'dashboard'
})
function setTab(key: string) {
  router.replace({ query: { ...route.query, tab: key } })
}

/** Optional stats for badges/tiles */
const stats = ref<{ orders?: number; coupons?: number; cart?: number; addresses?: number; wallet?: number }>(
  { orders: 0, coupons: 0, cart: 0, addresses: 0, wallet: 0 }
)
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
      addresses: Number(d.addresses ?? 0),
      wallet: Number(d.wallet ?? 0),
    }
  } catch { /* ignore */ }
  finally { loadingStats.value = false }
})

/** Sidebar items (reactive to locale) */
const side = computed(() => {
  // touch locale for reactivity when language changes
  const _ = locale.value
  return [
    { key: 'dashboard',  label: t('account.tabs.dashboard') },

    { key: 'profile',    label: t('account.tabs.accountDetails') },

    { key: 'orders',     label: t('account.tabs.myOrders'),     badge: stats.value.orders },
    { key: 'wallet',     label: t('account.tabs.myWallet') },
    { key: 'coupons',    label: t('account.tabs.myCoupons'),    badge: stats.value.coupons },
    // { key: 'addresses',  label: t('account.tabs.myAddresses'),  badge: stats.value.addresses },
    { key: 'reviews',    label: t('account.tabs.myReview') },
    { key: 'whatsnew',   label: t('account.tabs.whatsNew'),     badge: 0 },
  ]
})

/** Heading above the content area (reactive to locale) */
const tabHeading = computed(() => {
  const _ = locale.value
  switch (active.value) {
    case 'profile':   return t('account.tabs.accountDetails')
    case 'password':  return t('account.tabs.editPassword')
    case 'orders':    return t('account.tabs.myOrders')
    case 'wallet':    return t('account.tabs.myWallet')
    case 'coupons':   return t('account.tabs.myCoupons')
    case 'addresses': return t('account.tabs.myAddresses')
    case 'reviews':   return t('account.tabs.myReview')
    case 'cart':      return t('account.tabs.cart')
    case 'whatsnew':  return t('account.tabs.whatsNew')
    default:          return t('account.tabs.dashboard')
  }
})
</script>

<template>
  <section class="max-w-screen-2xl mx-auto px-3 lg:px-6 py-6 lg:py-10">
    <!-- Page title -->
    <h1 class="text-2xl lg:text-3xl font-extrabold tracking-tight mb-6">
      {{ $t('account.pageTitle') }}
    </h1>

    <div class="grid grid-cols-12 gap-6">
      <!-- Sidebar -->
      <aside class="col-span-12 md:col-span-4 lg:col-span-3">
        <nav class="bg-white rounded-xl shadow border overflow-hidden">
          <template v-for="(item, idx) in side" :key="item.key">
            <button
              type="button"
              class="w-full text-left px-4 lg:px-5 py-3 lg:py-3.5 flex items-center justify-between border-b last:border-b-0"
              :class="active === item.key
                ? 'bg-orange-100 text-orange-900 font-semibold'
                : 'hover:bg-gray-50 text-gray-800'"
              @click="setTab(item.key)"
            >
              <span class="truncate">{{ item.label }}</span>

              <!-- Badge (optional) -->
              <span
                v-if="item.badge !== undefined && item.badge !== null"
                class="ml-3 inline-flex items-center justify-center min-w-[1.5rem] h-6 text-xs rounded-full"
                :class="(item.badge ?? 0) > 0 ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'"
              >
                {{ item.badge }}
              </span>
            </button>

            <!-- Section divider (keeps Dashboard at top) -->
            <hr v-if="idx === 0" class="border-gray-200" />
          </template>
        </nav>
      </aside>

      <!-- Content -->
      <div class="col-span-12 md:col-span-8 lg:col-span-9">
        <div class="bg-white rounded-xl shadow p-4 sm:p-6">
          <h2 class="text-xl font-semibold mb-4">{{ tabHeading }}</h2>

          <!-- DASHBOARD -->
          <div v-if="active === 'dashboard'" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <NuxtLinkLocale :to="{ query: { tab: 'orders' } }" class="tile group">
              <OrdersIcon class="h-8 w-8" />
              <div class="tile-label">{{ $t('account.tabs.myOrders') }}</div>
              <div v-if="!loadingStats" class="tile-sub">
                {{ $t('account.dashboard.total', { n: stats.orders || 0 }) }}
              </div>
            </NuxtLinkLocale>

            <NuxtLinkLocale :to="{ query: { tab: 'wallet' } }" class="tile group">
              <WalletIcon class="h-8 w-8" />
              <div class="tile-label">{{ $t('account.tabs.myWallet') }}</div>
              <div v-if="!loadingStats" class="tile-sub">
                {{ (stats.wallet ?? 0).toLocaleString() }}
              </div>
            </NuxtLinkLocale>

            <NuxtLinkLocale :to="{ query: { tab: 'coupons' } }" class="tile group">
              <TicketIcon class="h-8 w-8" />
              <div class="tile-label">{{ $t('account.tabs.myCoupons') }}</div>
              <div v-if="!loadingStats" class="tile-sub">
                {{ $t('account.dashboard.available', { n: stats.coupons || 0 }) }}
              </div>
            </NuxtLinkLocale>

            <NuxtLinkLocale :to="{ query: { tab: 'addresses' } }" class="tile group">
              <MapPinIcon class="h-8 w-8" />
              <div class="tile-label">{{ $t('account.tabs.myAddresses') }}</div>
              <div v-if="!loadingStats" class="tile-sub">
                {{ $t('account.dashboard.saved', { n: stats.addresses || 0 }) }}
              </div>
            </NuxtLinkLocale>

            <NuxtLinkLocale :to="{ query: { tab: 'profile' } }" class="tile group">
              <UserCircleIcon class="h-8 w-8" />
              <div class="tile-label">{{ $t('account.tabs.accountDetails') }}</div>
              <div class="tile-sub">{{ $t('account.dashboard.manageProfile') }}</div>
            </NuxtLinkLocale>

            <NuxtLinkLocale :to="{ query: { tab: 'cart' } }" class="tile group">
              <ShoppingCartIcon class="h-8 w-8" />
              <div class="tile-label">{{ $t('account.tabs.cart') }}</div>
              <div v-if="!loadingStats" class="tile-sub">
                {{ $t('account.dashboard.items', { n: stats.cart || 0 }) }}
              </div>
            </NuxtLinkLocale>
          </div>

          <!-- ACCOUNT DETAILS -->
          <ProfileTab v-else-if="active === 'profile' || active === 'password'" />

          <!-- ORDERS -->
          <OrdersTab v-else-if="active === 'orders'" />

          <!-- ADDRESSES -->
          <AddressesTab v-else-if="active === 'addresses'" />

          <!-- PLACEHOLDERS -->
          <div v-else class="text-sm text-gray-600">
            {{ $t('common.comingSoon') }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Tile card */
.tile {
  @apply relative rounded-xl border bg-white p-6 shadow-sm
         hover:shadow-md transition-shadow
         flex flex-col items-center justify-center text-center gap-2;
}
.tile .tile-label { @apply text-lg font-semibold text-gray-900; }
.tile .tile-sub   { @apply text-xs text-gray-500; }

/* Hide thin scrollbars in the sidebar on small screens (if it overflows) */
.sidebar-scroll::-webkit-scrollbar { display: none; }
.sidebar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
</style>
