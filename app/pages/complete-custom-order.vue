<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, useNuxtApp, useHead } from '#imports'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

type MoneyBlock = {
  unit?: number
  line?: number
  shipping?: number
  payment_fee?: number
  subtotal?: number
  total?: number
  currency?: string
  order_status?: string
}

type GuestCheckoutShow = {
  uuid: string
  status: string
  order_status: string
  created_at?: string | null
  payment?: { method?: 'card' | 'paypal' | 'transfer' | string | null; link?: string | null }
  amounts?: Pick<MoneyBlock, 'total' | 'currency'> & Partial<MoneyBlock>
}

const route = useRoute()
const router = useRouter()
const { $customApi } = useNuxtApp()

const orderId = computed(() => String(route.query.orderId || '').trim())
const loading = ref(true)
const error = ref<string | null>(null)
const gc = ref<GuestCheckoutShow | null>(null)

// helpers
const up = (v: unknown) => (v == null || v === '') ? '—' : String(v).toUpperCase()
const money = (n?: number | string | null, cur?: string) => {
  const num = Number(n)
  if (!Number.isFinite(num)) return String(n ?? '0.00')
  return `${num.toFixed(2)}${cur ? ' ' + cur : ''}`
}

const isPaid = computed(() => ['paid', 'processing'].includes((gc.value?.status || '').toLowerCase()))
const isFailed = computed(() => (gc.value?.status || '').toLowerCase() === 'canceled')
const isNotPaid = computed(() => !isPaid.value && !isFailed.value) // pending / awaiting payment
const isSuccess = computed(() => !!gc.value && !isFailed.value)

async function fetchGuestOrder() {
  if (!orderId.value) {
    error.value = 'Missing order id'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const res = await $customApi<GuestCheckoutShow>(`/guest-checkout/${encodeURIComponent(orderId.value)}`)
    gc.value = (res as any)?.data ?? res ?? null
  } catch (e: any) {
    error.value = e?.message || 'Failed to load order'
  } finally {
    loading.value = false
  }
}

function goHome() {
  router.push('/')
}

// SEO Meta: noindex, nofollow
useHead({
  title: computed(() =>
    orderId.value
      ? `${t('completeCustomOrder.title')} — ${orderId.value}`
      : t('completeCustomOrder.title')
  ),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

onMounted(fetchGuestOrder)
</script>

<template>
  <main class="container mx-auto px-3 md:px-4 lg:px-6 py-8">
    <!-- Breadcrumbs -->
    <nav class="text-sm mb-6">
      <ol class="flex gap-2 text-gray-500">
        <li><NuxtLink to="/">{{ $t('common.home') }}</NuxtLink></li>
        <li>/</li>
        <li class="text-gray-900 font-medium">{{ $t('completeCustomOrder.title') }}</li>
      </ol>
    </nav>

    <!-- Loading -->
    <div v-if="loading" class="rounded-2xl border bg-white p-6 shadow-sm animate-pulse">
      <div class="h-5 w-40 bg-gray-200 rounded mb-4"></div>
      <div class="h-4 w-64 bg-gray-200 rounded mb-2"></div>
      <div class="h-4 w-56 bg-gray-200 rounded mb-2"></div>
      <div class="h-4 w-44 bg-gray-200 rounded"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-2xl border bg-white p-6 shadow-sm">
      <div class="flex items-start gap-3 text-rose-700">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 7h2v6h-2V7zm0 8h2v2h-2v-2z" />
          <path d="M1 21h22L12 2 1 21z" />
        </svg>
        <div>
          <h2 class="text-lg font-semibold mb-1">{{ $t('completeCustomOrder.errorTitle') }}</h2>
          <p class="text-sm text-gray-600">{{ error }}</p>
          <div class="mt-4 flex gap-2">
            <button class="px-4 py-2 rounded-xl border hover:bg-gray-50" @click="fetchGuestOrder">
              {{ $t('completeCustomOrder.tryAgain') }}
            </button>
            <button class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" @click="goHome">
              {{ $t('completeCustomOrder.goHome') }}
            </button>
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
          :class="[
            isFailed ? 'bg-rose-50 border-rose-200' : '',
            isPaid ? 'bg-emerald-50 border-emerald-200' : '',
            isNotPaid ? 'bg-amber-50 border-amber-200' : ''
          ]"
        >
          <div class="flex items-start gap-3">
            <!-- Icon -->
            <svg v-if="isFailed" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-rose-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21z" />
              <path d="M11 7h2v6h-2zM11 15h2v2h-2z" fill="white" />
            </svg>
            <svg v-else-if="isPaid" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-emerald-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm-1 15l-4-4 1.414-1.414L11 13.172l5.586-5.586L18 9z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm1 5h-2v6h2zm0 8h-2v2h2z"/>
            </svg>

            <div>
              <h2 class="text-lg font-semibold">
                <template v-if="isFailed">{{ $t('completeCustomOrder.paymentFailed') }}</template>
                <template v-else-if="isPaid">{{ $t('completeCustomOrder.thanks') }}</template>
                <template v-else>{{ $t('completeCustomOrder.notPaidYet') }}</template>
              </h2>

              <p class="text-sm text-gray-700 mt-1">
                <span class="text-gray-500">{{ $t('completeCustomOrder.orderId') }}:</span>
                <span class="font-mono font-medium">{{ gc?.uuid || '—' }}</span>
                <span class="mx-2">•</span>
                <span class="text-gray-500">{{ $t('completeCustomOrder.placedOn') }}</span>
                <span class="font-medium">{{ gc?.created_at || '—' }}</span>
              </p>

              <p v-if="!isFailed && !isPaid" class="text-xs text-gray-600 mt-1">
                {{ $t('completeCustomOrder.status') }}:
                <span class="font-medium">{{ up(gc?.order_status) }}</span>.
                {{ $t('completeCustomOrder.youWillReceiveEmail') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Totals -->
        <div class="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 class="text-lg font-semibold mb-4">{{ $t('completeCustomOrder.orderDetails') }}</h3>
          <div class="grid sm:grid-cols-2 gap-4 text-sm">
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-600">{{ $t('completeCustomOrder.orderId') }}</span>
                <span class="font-medium">{{ gc?.uuid || '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">{{ $t('completeCustomOrder.status') }}</span>
                <span class="font-medium">{{ up(gc?.order_status) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">{{ $t('completeCustomOrder.payment') }}</span>
                <span class="font-medium">{{ up(gc?.payment?.method) }}</span>
              </div>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-600">{{ $t('completeCustomOrder.subtotal') }}</span>
                <span class="font-medium">
                  {{ money(gc?.amounts?.subtotal ?? null, gc?.amounts?.currency) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">{{ $t('completeCustomOrder.shipping') }}</span>
                <span class="font-medium">
                  {{ money(gc?.amounts?.shipping ?? 0, gc?.amounts?.currency) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">{{ $t('completeCustomOrder.total') }}</span>
                <span class="font-semibold text-gray-900">
                  {{ money(gc?.amounts?.total ?? 0, gc?.amounts?.currency) }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="gc?.payment?.method !== 'transfer' && gc?.payment?.link" class="mt-4">
            <a
              :href="gc.payment.link"
              class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-white font-medium hover:bg-emerald-700"
            >
              {{ $t('completeCustomOrder.payNow') }}
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 5l7 7-7 7M5 19V5h8" />
              </svg>
            </a>
          </div>

          <p v-else-if="gc?.payment?.method === 'transfer'" class="mt-4 text-sm text-gray-700">
            {{ $t('completeCustomOrder.bankTransfer') }}
          </p>
        </div>
      </section>

      <!-- Aside -->
      <aside class="lg:col-span-4">
        <div class="rounded-2xl border bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h3 class="text-lg font-semibold">{{ $t('completeCustomOrder.whatsNext') }}</h3>
          <ul class="mt-3 text-sm text-gray-700 space-y-2">
            <li v-if="isFailed" class="flex gap-2">
              <span class="text-rose-600 font-medium">•</span>
              {{ $t('completeCustomOrder.tryAnotherPayment') }}
            </li>
            <li v-else class="flex gap-2">
              <span class="text-emerald-600 font-medium">•</span>
              {{ $t('completeCustomOrder.weWillNotify') }}
            </li>
            <li class="flex gap-2">
              <span class="text-gray-500 font-medium">•</span>
              {{ $t('completeCustomOrder.keepOrderId') }}
              <span class="font-mono">{{ gc?.uuid || '—' }}</span>
            </li>
          </ul>

          <div class="mt-5">
            <button
              class="w-full rounded-xl border px-4 py-2.5 font-medium hover:bg-gray-50"
              @click="goHome"
            >
              {{ $t('completeCustomOrder.continueShopping') }}
            </button>
          </div>
        </div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
/* Tailwind handles styling */
</style>
