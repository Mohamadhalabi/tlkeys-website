<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, useNuxtApp, useHead, useI18n, useRuntimeConfig } from '#imports'
import { useAlertStore } from '~/stores/alert' // Assuming you have this store, remove if not

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
  note?: string // Added note to types
} | null

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { $customApi } = useNuxtApp()
const runtimeConfig = useRuntimeConfig()
const alerts = useAlertStore()

// --- Config ---
// Replace with your actual Wallet
const USDT_WALLET_ADDRESS = 'TMUnF98HTXiW3uQz4VbktLJuEaHcYS47zb' 
const WHATSAPP_NUMBER = String((runtimeConfig as any)?.public?.whatsappNumber || '905376266092')

// --- State ---
const activePaymentTab = ref<'bank' | 'crypto'>('bank')
const copied = ref(false)

const orderId = computed(() => String(route.query.orderId || '').trim() || null)
const explicitSuccess = computed(() => {
  const v = String(route.query.success ?? '').toLowerCase().trim()
  return v === '' ? null : (v === 'true' ? true : v === 'false' ? false : null)
})

const loading = ref(true)
const error = ref<string | null>(null)
const order = ref<OrderPayload>(null)

// --- Helpers ---
const money = (m: Money): string => {
  if (m == null) return '0.00'
  if (typeof m === 'number') return m.toFixed(2)
  if (typeof m === 'string') {
    const n = Number(m)
    return Number.isFinite(n) ? n.toFixed(2) : m
  }
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
  return !!order.value && !isFailed.value
})

// Check if we should show transfer instructions (if method is transfer/wire/manual and not paid)
const showPaymentInstructions = computed(() => {
  if (!order.value || isPaid.value || isFailed.value) return false
  const pm = (order.value.payment_method || '').toLowerCase()
  // Adjust these keywords based on what your backend actually returns
  return pm.includes('transfer') || pm.includes('wire') || pm.includes('manual') || pm.includes('bank')
})

const whatsappLink = computed(() => {
  const oid = order.value?.order_id || ''
  let msg = ''
  
  if (activePaymentTab.value === 'crypto') {
    msg = t('whatsapp.payWithUSDT', { id: oid }) || `Hello, regarding Order #${oid}. I want to pay with USDT. Please confirm.`
  } else {
    msg = t('whatsapp.paymentProof', { id: oid }) || `Hello, I placed Order #${oid}. Here is the proof of payment.`
  }
  
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
})

// --- Actions ---
async function fetchOrder() {
  if (!orderId.value) {
    error.value = t('errors.missingOrderId') || 'Missing order id'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const res = await $customApi<any>(`/user/orders/${encodeURIComponent(orderId.value)}`)
    const payload = res?.data ?? res ?? {}
    order.value = payload?.order ?? payload
    
    // Auto-select Crypto tab if note contains hint (optional enhancement)
    if (order.value?.note?.toLowerCase().includes('usdt') || order.value?.note?.toLowerCase().includes('crypto')) {
      activePaymentTab.value = 'crypto'
    }
  } catch (e: any) {
    error.value = e?.message || (t('errors.loadOrderFailed') || 'Failed to load order')
  } finally {
    loading.value = false
  }
}

function copyText(text: string) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    if(alerts?.showAlert) {
        alerts.showAlert({ type: 'success', title: t('common.copied') || 'Copied', message: t('messages.copiedClipboard') || 'Copied to clipboard' })
    }
    setTimeout(() => { copied.value = false }, 2000)
  })
}

function goHome() {
  router.push('/')
}
function goOrders() {
  router.push('/account?tab=orders')
}

useHead({
  title: computed(() => orderId.value ? `${t('pages.order')} ${orderId.value} — ${t('pages.complete')}` : t('pages.completeOrder')),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

onMounted(fetchOrder)
</script>

<template>
  <main class="container mx-auto px-3 md:px-4 lg:px-6 py-8">
    <nav class="text-sm mb-6">
      <ol class="flex gap-2 text-gray-500">
        <li><NuxtLink to="/">{{ $t('shop.home') }}</NuxtLink></li>
        <li>/</li>
        <li class="text-gray-900 font-medium">{{ $t('pages.completeOrder') || 'Complete order' }}</li>
      </ol>
    </nav>

    <div v-if="loading" class="rounded-2xl border bg-white p-6 shadow-sm animate-pulse">
      <div class="h-5 w-40 bg-gray-200 rounded mb-4"></div>
      <div class="h-4 w-64 bg-gray-200 rounded mb-2"></div>
      <div class="h-4 w-56 bg-gray-200 rounded mb-2"></div>
      <div class="h-4 w-44 bg-gray-200 rounded"></div>
    </div>

    <div v-else-if="error" class="rounded-2xl border bg-white p-6 shadow-sm">
      <div class="flex items-start gap-3 text-rose-700">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 7h2v6h-2V7zm0 8h2v2h-2v-2z"/><path d="M1 21h22L12 2 1 21z"/>
        </svg>
        <div>
          <h2 class="text-lg font-semibold mb-1">{{ $t('errors.orderLoadTitle') || "Couldn't load your order" }}</h2>
          <p class="text-sm text-gray-600">{{ error }}</p>
          <div class="mt-4 flex gap-2">
            <button class="px-4 py-2 rounded-xl border hover:bg-gray-50" @click="fetchOrder">{{ $t('common.tryAgain') || 'Try again' }}</button>
            <button class="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" @click="goHome">{{ $t('common.goHome') || 'Go home' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <section class="lg:col-span-8 space-y-6">
        
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
                <template v-if="isFailed">{{ $t('checkout.paymentFailed') || 'Payment failed or canceled' }}</template>
                <template v-else>{{ $t('checkout.orderConfirmed') || 'Thanks! Your order is confirmed' }}</template>
              </h2>
              <p class="text-sm text-gray-700 mt-1">
                <span class="text-gray-500">{{ $t('labels.orderId') || 'Order ID' }}:</span>
                <span class="font-mono font-medium">{{ order?.order_id || '—' }}</span>
                <span class="mx-2">•</span>
                <span class="text-gray-500">{{ $t('labels.placedOn') || 'Placed on' }}</span>
                <span class="font-medium">{{ order?.created_at || '—' }}</span>
              </p>
              <p v-if="!isFailed && !isPaid" class="text-xs text-gray-600 mt-1">
                {{ $t('labels.paymentStatus') || 'Payment status' }}: <span class="font-medium">{{ up(order?.payment_status) }}</span>.
                {{ $t('checkout.emailNextSteps') || 'You’ll receive an email with next steps shortly.' }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="showPaymentInstructions" class="rounded-2xl border bg-white p-5 shadow-sm">
           <h3 class="text-lg font-semibold mb-3">{{ $t('checkout.howToPay') || 'How to complete your payment' }}</h3>
           
           <div class="flex p-1 bg-gray-50 rounded-xl border mb-4 w-fit">
              <button 
                @click="activePaymentTab = 'bank'"
                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="activePaymentTab === 'bank' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              >
                {{ $t('checkout.bankTransfer') || 'Bank Transfer' }}
              </button>
              <button 
                @click="activePaymentTab = 'crypto'"
                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                :class="activePaymentTab === 'crypto' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
              >
                {{ $t('checkout.cryptoUSDT') || 'Crypto (USDT)' }}
              </button>
            </div>

            <div v-if="activePaymentTab === 'bank'" class="text-sm text-gray-700 animate-fadeIn">
               <div class="grid grid-cols-[80px_1fr] gap-2 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span class="font-semibold text-gray-500">{{ $t('bank.name') || 'Bank' }}</span>
                  <span class="font-medium text-gray-900">ADCB</span>
                  
                  <span class="font-semibold text-gray-500">{{ $t('bank.account') || 'Account' }}</span>
                  <span class="font-mono bg-white border px-2 py-0.5 rounded w-fit">699321041001</span>
                  
                  <span class="font-semibold text-gray-500">{{ $t('bank.iban') || 'IBAN' }}</span>
                  <div class="flex items-center gap-2">
                    <span class="font-mono bg-white border px-2 py-0.5 rounded w-fit break-all">AE470030000699321041001</span>
                  </div>
                  
                  <span class="font-semibold text-gray-500">{{ $t('bank.bic') || 'BIC' }}</span>
                  <span class="font-mono bg-white border px-2 py-0.5 rounded w-fit">ADCBAEAA</span>
               </div>
            </div>

            <div v-if="activePaymentTab === 'crypto'" class="text-sm text-gray-700 animate-fadeIn">
              <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label class="block text-xs font-bold text-gray-500 mb-1">{{ $t('checkout.usdtWalletLabel') || 'USDT (TRC20) Wallet Address' }}</label>
                <div class="flex items-center gap-2">
                  <code class="flex-1 block bg-white border px-3 py-2 rounded-lg text-gray-800 break-all font-mono select-all">
                    {{ USDT_WALLET_ADDRESS }}
                  </code>
                  <button 
                    @click="copyText(USDT_WALLET_ADDRESS)" 
                    class="p-2 rounded-lg border bg-white hover:bg-gray-50 text-emerald-600 transition-colors shrink-0"
                    :title="$t('common.copy') || 'Copy'"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <div class="mt-3 p-3 bg-amber-50 text-amber-900 rounded-lg text-xs">
                  <span class="font-bold">Important:</span> Only send USDT via the TRC20 network. Other networks may result in loss of funds.
                </div>
              </div>
            </div>

            <div class="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-between border-t pt-4">
              <p class="text-sm text-gray-500">
                {{ $t('checkout.proofInstructions') || 'After paying, please send us the screenshot.' }}
              </p>
              <a :href="whatsappLink" target="_blank" class="inline-flex items-center gap-2 rounded-xl bg-green-500 text-white px-4 py-2 font-medium hover:bg-green-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="w-5 h-5" fill="currentColor">
                  <path d="M128,24A104,104,0,0,0,44.24,194.34L36,224l29.66-8.24A104,104,0,1,0,128,24Zm0,184a80,80,0,0,1-41.05-11.39l-2.61-.17L66.1,200.9l4.46-16.22-.18-2.82A80,80,0,1,1,128,208Zm44.2-54.35c-2.58-1.31-15.28-7.53-17.63-8.39s-4.09-1.32-5.8,1.32-6.64,8.39-8.15,10.11-3,2-5.59.65a64.83,64.83,0,0,1-19.18-11.82,72.09,72.09,0,0,1-13.3-16.68c-1.39-2.42,0-3.74,1-5.14a47.88,47.88,0,0,0,3.51-4.84,4.55,4.55,0,0,0,.44-4.26c-.44-1.32-5.8-14.08-7.95-19.29s-4.22-4.43-5.79-4.5-3.2-.07-4.94-.07A9.47,9.47,0,0,0,83,93.4c-2.36,2.42-9,8.88-9,21.67s9.23,25.12,10.54,26.86,18.19,28,44.09,39.2c6.17,2.68,11,4.29,14.77,5.5a35.09,35.09,0,0,0,16.26,1,26.67,26.67,0,0,0,17.47-12,21.41,21.41,0,0,0,1.51-12.37C172.63,155.6,170.79,154,172.2,153.65Z"/>
                </svg>
                <span v-if="activePaymentTab === 'crypto'">{{ $t('checkout.confirmUSDT') || 'I want to pay with USDT' }}</span>
                <span v-else>{{ $t('checkout.sendProof') || 'Send Proof on WhatsApp' }}</span>
              </a>
            </div>
        </div>

        <div class="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 class="text-lg font-semibold mb-4">Order details</h3>
          <div class="grid sm:grid-cols-2 gap-4 text-sm">
            <div class="space-y-1">
              <div class="flex justify-between"><span class="text-gray-600">{{ $t('labels.orderId') || 'Order ID' }}</span><span class="font-medium">{{ order?.order_id || '—' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">{{ $t('labels.status') || 'Status' }}</span><span class="font-medium">{{ up(order?.status) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">{{ $t('labels.payment') || 'Payment' }}</span><span class="font-medium">{{ up(order?.payment_method) }} · {{ up(order?.payment_status) }}</span></div>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between"><span class="text-gray-600">{{ $t('checkout.shippingMethod') || 'Shipping' }}</span><span class="font-medium">{{ up(order?.shipping_method) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">{{ $t('checkout.shippingCost') || 'Shipping cost' }}</span><span class="font-medium">{{ money(order?.shipping ?? 0) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">{{ $t('checkout.total') || 'Total' }}</span><span class="font-semibold text-gray-900">{{ money(order?.total ?? 0) }}</span></div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 class="text-lg font-semibold mb-3">{{ $t('checkout.shippingAddress') || 'Shipping address' }}</h3>
          <div class="text-sm text-gray-700">
            <div>{{ order?.address?.address || '—' }}</div>
            <div class="text-gray-600">{{ order?.address?.city || '—' }}, {{ order?.address?.postal_code || '—' }}</div>
            <div class="text-gray-600">{{ order?.address?.country || '—' }}</div>
            <div class="mt-1">☎ {{ order?.address?.phone || '—' }}</div>
          </div>
        </div>
      </section>

      <aside class="lg:col-span-4">
        <div class="rounded-2xl border bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h3 class="text-lg font-semibold">{{ $t('checkout.whatsNext') || 'What’s next?' }}</h3>
          <ul class="mt-3 text-sm text-gray-700 space-y-2">
            <li v-if="isFailed" class="flex gap-2">
              <span class="text-rose-600 font-medium">•</span>
              {{ $t('checkout.tryAnotherMethod') || 'Try another payment method from your Orders page.' }}
            </li>
            <li v-else class="flex gap-2">
              <span class="text-emerald-600 font-medium">•</span>
              {{ $t('checkout.notifyEmail') || 'We’ll notify you by email when your order status changes.' }}
            </li>
            <li class="flex gap-2">
              <span class="text-gray-500 font-medium">•</span>
              {{ $t('checkout.keepOrderId') || 'Keep your order ID' }} <span class="font-mono">{{ order?.order_id || '—' }}</span> {{ $t('checkout.forReference') || 'for reference.' }}
            </li>
          </ul>

          <div class="mt-5 flex flex-col gap-2">
            <button class="w-full rounded-xl bg-emerald-600 text-white px-4 py-2.5 font-medium hover:bg-emerald-700" @click="goOrders">
              {{ $t('dashboard.viewOrders') || 'View my orders' }}
            </button>
            <button class="w-full rounded-xl border px-4 py-2.5 font-medium hover:bg-gray-50" @click="goHome">
              {{ $t('common.continueShopping') || 'Continue shopping' }}
            </button>
          </div>

          <div class="mt-6 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
            <div class="flex justify-between">
              <span>{{ $t('labels.paymentMethod') || 'Payment method' }}</span>
              <span class="font-medium">{{ up(order?.payment_method) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('labels.paymentStatus') || 'Payment status' }}</span>
              <span class="font-medium">{{ up(order?.payment_status) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('labels.tracking') || 'Tracking' }}</span>
              <span class="font-medium">{{ order?.tracking_no ? order.tracking_no : '—' }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
/* Tailwind handles styling */
</style>