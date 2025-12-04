<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n, useRouter, useNuxtApp, definePageMeta, useSeoMeta, useHead, useRuntimeConfig } from '#imports'
import { useAlertStore } from '~/stores/alert'

definePageMeta({ ssr: false })

/* ---------------- Types ---------------- */
type QuoteProduct = {
  product_id: number | string
  slug?: string | null
  sku?: string | null
  title: string
  quantity: number
  unit: number
  line: number
  weight: number
  image?: string | null
  is_machine?: boolean
  /** NEW: backend flag per product */
  blocked_in_selected_country?: boolean
}
type Address = {
  id: number
  is_default: boolean
  country_id: number
  country_name?: string | null
  zone_id?: number | null
  city?: string | null
  street?: string | null
  address?: string | null
  phone?: string | null
  postal_code?: string | null
}
type ShippingKey = 'pick_up'|'domestic'|'dhl'|'fedex'|'aramex'|'ups'
type ShippingOption = { key: ShippingKey; label: string; price: number; disabled?: boolean; note?: string }
type CouponResult = {
  code: string
  applied: boolean
  reason?: string | null
  message?: string | null
  discount_value?: number
}
type Promotions = {
  eligible: { free_ship: boolean; ten_off: boolean }
  selected: 'free_ship'|'ten_off'|'none'
  savings: { free_ship: number; ten_off: number }
  notes: { free_ship: string; ten_off: string }
}
/** NEW: checkout_block payload from backend */
type CheckoutBlock = {
  is_blocked: boolean
  country_id?: number | null
  country_name?: string | null
  message?: string | null
  action_hint?: string | null
  violations?: Array<{ product_id: number; sku: string; title: string }>
}
type Quote = {
  products: QuoteProduct[]
  addresses: Address[]
  selected_address_id: number|null
  shipping: { options: ShippingOption[], selected: ShippingKey|null, price: number }
  summary: {
    sub_total:number
    coupon_discount:number
    promo_discount:number
    discount:number
    sub_after_coupon:number
    shipping:number
    total:number
  }
  weights: { total_weight_kg:number; machine_weight_kg?:number; zone_id:number|null }
  promotions?: Promotions
  coupon?: CouponResult | null
  /** NEW */
  checkout_block?: CheckoutBlock | null
}
type Country = {
  id: number
  name: string | Record<string,string>
  iso2?: string | null
  iso3?: string | null
  zone_id?: number | null
}
type PromoKey = 'free_ship'|'ten_off'|'none'

/* ---------------- Setup ---------------- */
const UAE_COUNTRY_ID = 231
const { $customApi } = useNuxtApp()
const { t, locale } = useI18n()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const alerts = useAlertStore()

/** WhatsApp helper */
const WHATSAPP_NUMBER = String((runtimeConfig as any)?.public?.whatsappNumber || '905376266092')
const whatsappLink = computed(() => {
  const msg = t('common.whatsappPrefill') || 'Hello, I need help completing my order.'
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
})

/* ---------------- Helpers ---------------- */
const isString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const money = (v: unknown): string => Number(v || 0).toFixed(2)
const imgSrc = (v: unknown): string | null => (isString(v) ? v : null)

function countryDisplayName(c: Country, loc: string): string {
  try {
    if (typeof c.name === 'string') {
      const parsed = JSON.parse(c.name as string)
      if (parsed && typeof parsed === 'object') {
        return parsed[loc] || (parsed as any).en || (Object.values(parsed)[0] as string) || ''
      }
      return c.name
    }
    if (c.name && typeof c.name === 'object') {
      return (c.name[loc] || (c.name as any).en || (Object.values(c.name)[0] as string) || '') as string
    }
  } catch {}
  return String(c.name ?? '')
}

/* ---------------- State ---------------- */
const quote = ref<Quote | null>(null)
const loading = ref(false)
const creatingOrder = ref(false)

/** Coupon: */
const couponInput = ref<string>('')
const appliedCouponCode = ref<string | null>(null)

/** Promotions (mutually exclusive) */
const selectedPromo = ref<PromoKey>('none')

/** Alert de-dup */
const lastShownCouponKey = ref<string | null>(null)
const makeCouponKey = (c?: CouponResult | null) =>
  c ? `${(c.code||'').toUpperCase()}:${c.applied?'1':'0'}:${c.reason||''}:${Number(c.discount_value||0).toFixed(2)}` : null

const addresses = ref<Address[]>([])
const selectedAddressId = ref<number | null>(null)
const selectedAddress = computed<Address | null>(() => addresses.value.find(a => a.id === selectedAddressId.value) || null)

const selectedShipping = ref<ShippingKey | null>(null)

const paymentMethod = ref<'card'|'paypal'|'transfer' | null>(null)
const acceptTerms = ref(false)

const surchargePct = computed(() => (paymentMethod.value === 'card' || paymentMethod.value === 'paypal') ? 3 : 0)
const totalWithSurcharge = computed(() => {
  const base = quote.value?.summary?.total ?? 0
  return +(base * (1 + (surchargePct.value / 100))).toFixed(2)
})

/* -------- Countries (dropdown data) ------- */
const countries = ref<Country[]>([])
const countriesLoading = ref(false)
const countriesError = ref<string | null>(null)

async function fetchCountries() {
  countriesLoading.value = true
  countriesError.value = null
  try {
    const res = await $customApi<any>('/get-countries')
    const list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
    countries.value = (list || []) as Country[]
  } catch (e: any) {
    countriesError.value = t('errors.failedToLoadCountries') || 'Failed to load countries'
  } finally {
    countriesLoading.value = false
  }
}

/* ---------------- Shipping options (UAE override) ---------------- */
const shippingOptions = computed<ShippingOption[]>(() => {
  if (selectedAddress.value?.country_id === UAE_COUNTRY_ID) {
    return [
      { key: 'pick_up',  label: t('checkout.pickup') || 'Pickup',          price: 0 },
      { key: 'domestic', label: t('checkout.localShipping') || 'Local shipping', price: 10 },
    ]
  }
  return quote.value?.shipping?.options ?? []
})

/* ---------------- Address modal ---------------- */
type AddressForm = Partial<Address> & { is_default?: boolean }
const addressModalOpen = ref(false)
const addressForm = ref<AddressForm>({})
const isEditing = computed(() => !!addressForm.value.id)

function openAddressForm(a?: Address) {
  addressForm.value = a ? { ...a } : {
    country_id: undefined as any,
    city: '',
    street: '',
    address: '',
    phone: '',
    postal_code: '',
    is_default: false
  }
  addressModalOpen.value = true
}
function closeAddressForm() { addressModalOpen.value = false }

/* ---------------- Coupon UX ---------------- */
function showCouponAlertOnce(c: CouponResult | null | undefined) {
  const k = makeCouponKey(c)
  if (!k || k === lastShownCouponKey.value) return
  lastShownCouponKey.value = k

  if (c?.applied) {
    const saved = (c.discount_value ?? 0).toFixed(2)
    alerts.showAlert({
      type: 'success',
      title: t('checkout.couponAppliedTitle') || 'Coupon applied',
      message: (t('checkout.couponAppliedMsg', { amount: saved }) as string)
        || `You saved <b>${saved}$</b> on the subtotal.`
    })
  } else {
    alerts.showAlert({
      type: 'error',
      title: t('checkout.couponNotAppliedTitle') || 'Coupon not applied',
      message: c?.message || t('checkout.couponInvalid') || 'This coupon cannot be used for your order.'
    })
  }
}

/* ---------------- API calls ---------------- */
async function fetchAddresses() {
  const res = await $customApi<Quote>('/checkout/quote')
  addresses.value = res?.addresses ?? []
  selectedAddressId.value = res?.selected_address_id ?? addresses.value[0]?.id ?? null
}

/** fetchQuote
 *  - If you pass {couponOverride}, it will be used for this request only (used by Apply).
 *  - Otherwise, we send appliedCouponCode (if any).
 *  - Also send the selected promo (free_ship | ten_off | none).
 */
async function fetchQuote(opts?: { couponOverride?: string | null, showCouponAlert?: boolean }) {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (selectedAddressId.value) params.set('address_id', String(selectedAddressId.value))
    if (selectedShipping.value)  params.set('shipping_method', String(selectedShipping.value))

    const couponToSend = (opts && 'couponOverride' in opts)
      ? (opts.couponOverride || null)
      : (appliedCouponCode.value || null)

    if (couponToSend) params.set('coupon', couponToSend)
    if (selectedPromo.value) params.set('promo', selectedPromo.value)

    const res = await $customApi<Quote>(`/checkout/quote?${params.toString()}`)
    quote.value = res

    /* ✅ UAE local shipping = 10$ */
    if (
      selectedAddress.value?.country_id === UAE_COUNTRY_ID &&
      selectedShipping.value === 'domestic' &&
      quote.value?.summary
    ) {
      const currentShip = Number(quote.value.summary.shipping ?? 0)
      const targetShip = 10
      const diff = targetShip - currentShip

      quote.value.summary.shipping = targetShip
      quote.value.summary.total = Number(
        ((quote.value.summary.total ?? 0) + diff).toFixed(2)
      )
    }

    // sync selected address and default shipping
    if (!selectedAddressId.value) selectedAddressId.value = res.selected_address_id ?? null
    if (!selectedShipping.value && res.shipping?.selected) {
      selectedShipping.value = res.shipping.selected as ShippingKey
    }
    if (selectedAddress.value?.country_id === UAE_COUNTRY_ID && selectedShipping.value && !['pick_up','domestic'].includes(selectedShipping.value)) {
      selectedShipping.value = null
    }

    if (res.promotions?.selected) {
      selectedPromo.value = res.promotions.selected as PromoKey
    }

    if (opts?.showCouponAlert) {
      showCouponAlertOnce(res.coupon)
      if (!(res.coupon?.applied)) {
        appliedCouponCode.value = null
      }
    }
  } finally {
    loading.value = false
  }
}

/* ---------------- Blocked-country helpers ---------------- */
/** Is checkout blocked? */
const isCheckoutBlocked = computed<boolean>(() => !!quote.value?.checkout_block?.is_blocked)
/** Country name for message */
const blockedCountryName = computed<string>(() =>
  (quote.value?.checkout_block?.country_name || selectedAddress.value?.country_name || '') as string
)
/** SKU list for message */
const blockedSkus = computed<string[]>(() => {
  const viaPayload = quote.value?.checkout_block?.violations?.map(v => v.sku).filter(Boolean) ?? []
  // fallback: derive from products list
  if (viaPayload.length) return viaPayload as string[]
  return (quote.value?.products || [])
    .filter(p => p.blocked_in_selected_country)
    .map(p => String(p.sku || ''))
    .filter(Boolean)
})
/** Convenience: list of blocked product_ids to mark in UI */
const blockedProductIds = computed<Set<number | string>>(() => {
  const set = new Set<number | string>()
  ;(quote.value?.products || []).forEach(p => {
    if (p.blocked_in_selected_country) set.add(p.product_id)
  })
  return set
})

/* ---------------- Save/Delete address ---------------- */
async function saveAddress() {
  const body = { ...addressForm.value }
  if (!body.country_id || !String(body.city||'').trim() || !String(body.street||'').trim()
      || !String(body.address||'').trim() || !String(body.postal_code||'').trim() || !String(body.phone||'').trim()) {
    alerts.showAlert({
      type: 'error',
      title: t('checkout.missingFields') || 'Missing fields',
      message: t('checkout.allAddressFieldsRequired') || 'Please fill in all address fields.'
    })
    return
  }

  let savedId: number | null = null
  if (isEditing.value) {
    await $customApi(`/edit-addresses/${body.id}`, { method: 'POST', body })
    savedId = Number(body.id)
  } else {
    const res = await $customApi<{ id: number }>(`/addresses`, { method: 'POST', body })
    savedId = (res as any)?.id ?? null
  }

  if (body.is_default && (savedId || body.id)) {
    const idToSet = Number(savedId || body.id)
    if (Number.isFinite(idToSet)) {
      await $customApi(`/addresses/${idToSet}/default`, { method: 'POST' })
      selectedAddressId.value = idToSet
    }
  }

  addressModalOpen.value = false
  await fetchAddresses()
  if (selectedAddress.value?.country_id === UAE_COUNTRY_ID) selectedShipping.value = null
  await fetchQuote()
  alerts.showAlert({ type: 'success', title: t('checkout.addressSaved') || 'Address saved' })
}

async function deleteAddress(a: Address) {
  if (!confirm(t('checkout.deleteAddressConfirm') || 'Delete this address?')) return
  await $customApi(`/delete-addresses/${a.id}`, { method: 'POST' })
  await fetchAddresses()
  if (selectedAddressId.value === a.id) selectedAddressId.value = addresses.value[0]?.id ?? null
  await fetchQuote()
  alerts.showAlert({ type: 'success', title: t('checkout.addressDeleted') || 'Address deleted' })
}

/* ---------------- Order creation ---------------- */
async function createOrder() {
  if (isCheckoutBlocked.value) {
    alerts.showAlert({
      type: 'error',
      title: t('checkout.blockedTitle') || 'Cannot place order',
      message: (quote.value?.checkout_block?.message
                || t('checkout.blockedMessageGeneric')
                || 'Some items cannot be shipped to this country. Please remove them or change the shipping country.') as string
    })
    return
  }
  if (!selectedAddressId.value) return alerts.showAlert({ type:'error', title: t('checkout.selectAddressFirst') || 'Please select an address' })
  if (!selectedShipping.value)  return alerts.showAlert({ type:'error', title: t('checkout.selectShippingFirst') || 'Please choose a shipping method' })
  if (!paymentMethod.value)     return alerts.showAlert({ type:'error', title: t('checkout.selectPaymentFirst') || 'Please select a payment method' })
  if (!acceptTerms.value)       return alerts.showAlert({ type:'error', title: t('checkout.acceptTermsFirst') || 'Please accept Terms & Conditions' })

  if (creatingOrder.value) return
  creatingOrder.value = true

  const paymentMap: Record<'card'|'paypal'|'transfer', string> = {
    card: 'ccavenue',
    paypal: 'paypal',
    transfer: 'transfer_online'
  }

  const body = {
    address:         selectedAddressId.value,
    shipping_method: selectedShipping.value,
    payment_method:  paymentMap[paymentMethod.value],
    coupon_code:     appliedCouponCode.value || null,
    promo:           selectedPromo.value,
    free_ship:       selectedPromo.value === 'free_ship' ? 1 : 0,
  }

  try {
    const res = await $customApi<any>('/user/orders/create', {
      method: 'POST',
      body,
      headers: { currency: 'USD', 'Accept-Language': 'en' },
    })

    const payload = res?.data || res
    const order   = payload?.order
    const paypalUrl = (payload?.paypal_url || '').trim()

    if (paymentMethod.value === 'paypal' && paypalUrl) {
      window.location.href = paypalUrl
      return
    }
    if (paymentMethod.value === 'card' && order?.order_id) {
      const baseTotal = Number(order?.total?.value ?? order?.total ?? 0)
      const amount = (Math.round((baseTotal * 1.03 + Number.EPSILON) * 100) / 100).toFixed(2)
      location.href = `https://dev-srv.tlkeys.com/online-order?order_id=${encodeURIComponent(order.order_id)}&amount=${amount}`
      return
    }
    if (order?.order_id) {
      router.push({ path: '/complete-order', query: { orderId: order.order_id } })
      return
    }

    alerts.showAlert({
      type:'info',
      title: t('checkout.orderCreated') || 'Order created',
      message: t('checkout.missingOrderId') || 'Missing order id in response.'
    })
    creatingOrder.value = false
  } catch (e: any) {
    alerts.showAlert({
      type:'error',
      title: t('checkout.failedCreateOrder') || 'Failed to create order',
      message: e?.message
    })
    creatingOrder.value = false
  }
}

/* ---------------- Products list toggle ---------------- */
const COLLAPSE_COUNT = 5
const showAllProducts = ref(false)
const allProducts = computed(() => quote.value?.products ?? [])
const displayedProducts = computed(() =>
  showAllProducts.value ? allProducts.value : allProducts.value.slice(0, COLLAPSE_COUNT)
)
const hasMoreProducts = computed(() => allProducts.value.length > COLLAPSE_COUNT)
const remainingCount = computed(() => Math.max(allProducts.value.length - COLLAPSE_COUNT, 0))

/* ---------------- Step Note (progressive guidance) ---------------- */
const stepNote = computed<null | { where: 'address'|'shipping'|'payment'; text: string }>(() => {
  if (!selectedAddressId.value) {
    return { where: 'address',  text: t('checkout.stepAddress') || 'Please first select / add address' }
  }
  if (!selectedShipping.value) {
    return { where: 'shipping', text: t('checkout.stepShipping') || '2nd step choose your shipping method' }
  }
  if (!paymentMethod.value) {
    return { where: 'payment',  text: t('checkout.stepPayment') || '3rd step choose the payment method' }
  }
  return null
})

/* ---------------- SEO ---------------- */
const pageTitle = computed(() => {
  const count = allProducts.value.length
  const base = t('dashboard.checkout') || 'Checkout'
  const itemWord = count === 1 ? (t('common.item') || 'item') : (t('common.items') || 'items')
  return `${base} — ${count} ${itemWord}`
})

const pageDescription = computed(() => {
  const subtotal = money(quote.value?.summary?.sub_total) + '$'
  const shipLabel = selectedShipping.value
    ? (t('checkout.shippingMethod') || 'Shipping') + ': ' + String(selectedShipping.value).toUpperCase()
    : (t('checkout.shippingMethod') || 'Shipping')
  return `${t('checkout.reviewAndPlace') || 'Review your cart and place your order.'} ${t('checkout.subtotal') || 'Subtotal'}: ${subtotal}. ${shipLabel}.`
})

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: 'website',
  twitterCard: 'summary'
})
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

/* ---------------- Effects ---------------- */
onMounted(async () => {
  await Promise.all([fetchCountries(), fetchAddresses()])
  await fetchQuote()
})

watch(selectedAddressId, async () => {
  selectedShipping.value = null
  await fetchQuote()
})
watch(selectedShipping, async () => {
  await fetchQuote()
})
// 🔕 NO watcher on couponInput — only apply on button/Enter.
</script>

<template>
  <main class="container mx-auto px-3 md:px-4 lg:px-6 py-6">
    <!-- Breadcrumbs -->
    <nav class="text-sm mb-4" aria-label="Breadcrumb">
      <ol class="flex gap-2 text-gray-500">
        <li><NuxtLinkLocale to="/">{{ $t('shop.home') }}</NuxtLinkLocale></li>
        <li>/</li>
        <li><NuxtLinkLocale to="/cart">{{ $t('dashboard.cart') }}</NuxtLinkLocale></li>
        <li>/</li>
        <li class="text-gray-900 font-medium">{{ $t('dashboard.checkout') }}</li>
      </ol>
    </nav>

    <!-- NEW: Blocked-country banner -->
    <div
      v-if="isCheckoutBlocked"
      class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 p-4"
      role="alert"
    >
      <div class="flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mt-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11.001 10h2v5h-2z"/><path d="M12 17a1.25 1.25 0 110 2.5A1.25 1.25 0 0112 17z"/><path d="M10.29 3.86l-8 14A1 1 0 003 19h18a1 1 0 00.87-1.5l-8-14a1 1 0 00-1.74 0z"/>
        </svg>
        <div>
          <p class="font-semibold">
            {{ quote?.checkout_block?.message || `Some items cannot be shipped to ${blockedCountryName}.` }}
          </p>
          <p v-if="blockedSkus.length" class="mt-1 text-sm">
            {{ $t('checkout.blockedSkus') || 'Blocked SKUs for this country' }}:
            <span class="font-mono">{{ blockedSkus.join(', ') }}</span>
          </p>
          <p class="mt-1 text-xs text-rose-700">
            {{ quote?.checkout_block?.action_hint || ($t('checkout.blockedActionHint') || 'Remove restricted items or change the shipping country to proceed.') }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="(quote?.products?.length ?? 0) > 0" class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:sticky">
      <!-- LEFT: Steps -->
      <section class="lg:col-span-8 space-y-6">
        <!-- Coupon -->
        <div class="rounded-2xl border p-4 bg-white shadow-sm">
          <p class="text-center text-gray-500 mb-2">{{ $t('checkout.IfYouHaveAcoupon') }}</p>

          <div class="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <input
              v-model="couponInput"
              type="text"
              class="w-full sm:w-80 rounded-xl border px-3 py-2"
              :placeholder="$t('checkout.enterCouponCode')"
              @keyup.enter="applyCoupon"
              :aria-label="$t('checkout.couponCode') || 'Coupon code'"
            />
            <button
              class="rounded-2xl border px-4 py-2 font-medium hover:bg-gray-50"
              :disabled="!couponInput || creatingOrder"
              @click="applyCoupon"
            >
              {{ $t('checkout.applyCoupon') }}
            </button>

            <button
              v-if="appliedCouponCode"
              class="rounded-2xl border px-4 py-2 font-medium hover:bg-gray-50"
              :disabled="creatingOrder"
              @click="removeCoupon"
            >
              {{ $t('common.remove') || 'Remove' }} ({{ appliedCouponCode }})
            </button>
          </div>
        </div>

        <!-- Promotions (mutually exclusive) -->
        <div
          v-if="quote?.promotions && (quote.promotions.eligible.free_ship || quote.promotions.eligible.ten_off)"
          class="rounded-2xl border p-4 bg-white shadow-sm"
        >
          <h3 class="text-lg font-semibold mb-2">{{ $t('checkout.promotions') || 'Promotions' }}</h3>

          <div class="space-y-2">
            <label
              v-if="quote.promotions.eligible.free_ship"
              class="flex items-start gap-2 p-2 rounded-xl border hover:bg-gray-50 cursor-pointer transition ring-offset-2"
              :class="selectedPromo==='free_ship' ? 'ring-2 ring-emerald-500' : ''"
            >
              <input class="mt-1" type="radio" value="free_ship" v-model="selectedPromo" @change="fetchQuote()" />
              <div>
                <div class="font-medium">
                  {{ $t('checkout.freeShipTitle') || 'Free Shipping (>$500 eligible items)' }}
                  <span class="ml-2 text-emerald-700 font-semibold" v-if="quote.promotions.savings.free_ship">
                    -{{ money(quote.promotions.savings.free_ship) }}$
                  </span>
                </div>
                <div class="text-xs text-gray-600">
                  {{ quote.promotions.notes.free_ship }}
                </div>
              </div>
            </label>

            <label
              v-if="quote.promotions.eligible.ten_off"
              class="flex items-start gap-2 p-2 rounded-xl border hover:bg-gray-50 cursor-pointer transition ring-offset-2"
              :class="selectedPromo==='ten_off' ? 'ring-2 ring-emerald-500' : ''"
            >
              <input class="mt-1" type="radio" value="ten_off" v-model="selectedPromo" @change="fetchQuote()" />
              <div>
                <div class="font-medium">
                  {{ $t('checkout.tenOffTitle') || '10% OFF (>$700, first paid order)' }}
                  <span class="ml-2 text-emerald-700 font-semibold" v-if="quote.promotions.savings.ten_off">
                    -{{ money(quote.promotions.savings.ten_off) }}$
                  </span>
                </div>
                <div class="text-xs text-gray-600">
                  {{ quote.promotions.notes.ten_off }}
                </div>
              </div>
            </label>

            <label
              class="flex items-start gap-2 p-2 rounded-xl border hover:bg-gray-50 cursor-pointer transition ring-offset-2"
              :class="selectedPromo==='none' ? 'ring-2 ring-emerald-500' : ''"
            >
              <input class="mt-1" type="radio" value="none" v-model="selectedPromo" @change="fetchQuote()" />
              <div class="font-medium">{{ $t('checkout.noPromo') || 'No promotion' }}</div>
            </label>
          </div>

          <p v-if="selectedPromo==='ten_off' && quote?.summary?.promo_discount"
             class="mt-2 text-sm text-emerald-700">
            {{ $t('checkout.promoSavings') || 'Promo savings' }}:
            -{{ money(quote.summary.promo_discount) }}$
          </p>
        </div>

        <!-- Step Note: Address -->
        <div
          v-if="!selectedAddressId"
          class="rounded-2xl border p-4 bg-amber-50/70 text-amber-900 shadow-sm"
          role="status"
        >
          <div class="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mt-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm.75 5a.75.75 0 10-1.5 0v6a.75.75 0 00.75.75H16a.75.75 0 000-1.5h-3.25V7z"/>
            </svg>
            <p class="text-sm font-medium">{{ $t('checkout.stepAddress') || 'Please first select / add address' }}</p>
          </div>
        </div>

        <!-- Step 1: Address -->
        <div class="rounded-2xl border p-4 bg-white shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10z"/><path fill-rule="evenodd" d="M2 20a8 8 0 1116 0v1H2v-1z" clip-rule="evenodd"/>
              </svg>
              {{ $t('checkout.addrress') }}
            </h3>
            <button class="rounded-2xl border px-3 py-2 text-sm hover:bg-gray-50" @click="openAddressForm()" :disabled="creatingOrder">
              + {{ $t('checkout.addAddress') }}
            </button>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <label
              v-for="a in addresses"
              :key="a.id"
              class="rounded-2xl border p-3 cursor-pointer flex gap-3 items-start transition ring-offset-2 bg-white hover:shadow-sm"
              :class="selectedAddressId === a.id ? 'ring-2 ring-emerald-500' : ''"
            >
              <input type="radio" class="mt-1" :value="a.id" v-model="selectedAddressId" :disabled="creatingOrder" />
              <div class="w-full">
                <div class="font-medium">
                  {{ a.country_name || '—' }} <span v-if="a.city">— {{ a.city }}</span>
                </div>
                <div class="text-sm text-gray-500 break-words">
                  <template v-if="a.street">{{ a.street }}<br /></template>
                  {{ a.address }}
                </div>
                <div class="text-sm text-gray-500">☎ {{ a.phone }}</div>
                <div v-if="a.postal_code" class="text-sm text-gray-500">{{ a.postal_code }}</div>
                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                  <span v-if="a.is_default" class="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>{{ $t('checkout.default') }}
                  </span>
                  <button class="px-2 py-1 rounded border hover:bg-gray-50" @click.stop="openAddressForm(a)" :disabled="creatingOrder">{{ $t('edit') }}</button>
                  <button class="px-2 py-1 rounded border hover:bg-gray-50" @click.stop="deleteAddress(a)" :disabled="creatingOrder">{{ $t('delete') }}</button>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Step 2: Shipping -->
        <div class="rounded-2xl border p-4 bg-white shadow-sm" :class="(!selectedAddressId || creatingOrder) ? 'opacity-50 pointer-events-none' : ''">
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M2 6a2 2 0 012-2h10a2 2 0 012 2v8h-1.18a3 3 0 10-5.64 0H8.82a3 3 0 10-5.64 0H2V6z"/>
              <path d="M20 8h-2v6h.82a3 3 0 015.64 0H24V12l-2-4z"/>
            </svg>
            {{ $t('checkout.shippingMethod') }}
          </h3>

          <!-- Shipping blocked note -->
          <div
            v-if="isCheckoutBlocked"
            class="mb-3 rounded-2xl border p-3 bg-rose-50/80 text-rose-900 shadow-sm text-sm"
            role="status"
          >
            {{ $t('checkout.shippingBlocked') || 'Shipping options are disabled due to product/country restriction.' }}
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label
              v-for="opt in shippingOptions"
              :key="opt.key"
              class="rounded-2xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
              :class="[selectedShipping === opt.key ? 'ring-2 ring-emerald-500' : '', (opt.disabled || isCheckoutBlocked) ? 'opacity-50 pointer-events-none' : '']"
            >
              <input type="radio" class="sr-only" :value="opt.key" v-model="selectedShipping" :disabled="opt.disabled || isCheckoutBlocked" />
              <div class="flex items-center justify-center gap-2">
                <span v-if="opt.key==='pick_up'" class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  {{ $t('checkout.pickup') || 'Pickup' }}
                </span>
                <span v-else-if="opt.key==='domestic'" class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold bg-cyan-100 text-cyan-700 border border-cyan-200">
                  {{ $t('checkout.localShipping') || 'Local' }}
                </span>
                <span v-else-if="opt.key==='dhl'" class="inline-flex items-center rounded px-1.5 py-0.5 text-md font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">DHL</span>
                <span v-else-if="opt.key==='fedex'" class="inline-flex items-center rounded px-1.5 py-0.5 text-md font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">FEDEX</span>
                <span v-else-if="opt.key==='aramex'" class="inline-flex items-center rounded px-1.5 py-0.5 text-md font-bold bg-red-100 text-red-700 border border-red-200">ARAMEX</span>
                <span v-else class="inline-flex items-center rounded px-1.5 py-0.5 text-md font-bold bg-amber-100 text-amber-700 border border-amber-200">UPS</span>
              </div>
              <div class="text-md font-bold mt-3" v-if="!opt.disabled && !isCheckoutBlocked">{{ money(opt.price) }}$</div>
              <div class="text-xs text-gray-400" v-else>—</div>
              <div v-if="opt.note && (opt.disabled || isCheckoutBlocked)" class="mt-1 text-[11px] text-gray-500">
                {{ opt.note }}
              </div>
            </label>
          </div>
        </div>

        <!-- Step 3: Payment -->
        <div class="rounded-2xl border p-4 bg-white shadow-sm" :class="((!selectedShipping && !isCheckoutBlocked) ? 'opacity-50 pointer-events-none' : '') + (creatingOrder ? ' opacity-50 pointer-events-none' : '')">
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v2H2V6z"/>
              <path d="M2 10h20v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8zm3 5h6v2H5v-2z"/>
            </svg>
            {{ $t('checkout.paymentMethod') }}
          </h3>

          <div class="grid sm:grid-cols-3 gap-3">
            <label class="rounded-2xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
                   :class="paymentMethod === 'card' ? 'ring-2 ring-emerald-500' : ''">
              <input class="sr-only" type="radio" value="card" v-model="paymentMethod" :disabled="isCheckoutBlocked" />
              <div class="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 6a2 2 0 012-2h14a2 2 0 012 2v2H3V6z"/><path d="M3 10h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8zm2 5h6v2H5v-2z"/></svg>
                <span class="font-medium">{{ $t('checkout.payCard') }}</span>
              </div>
            </label>

            <label class="rounded-2xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
                   :class="paymentMethod === 'paypal' ? 'ring-2 ring-emerald-500' : ''">
              <input class="sr-only" type="radio" value="paypal" v-model="paymentMethod" :disabled="isCheckoutBlocked" />
              <div class="flex items-center justify-center gap-2">
                <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-600 text-white text-xs font-bold">P</span>
                <span class="font-medium">PayPal</span>
              </div>
            </label>

            <label class="rounded-2xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
                   :class="paymentMethod === 'transfer' ? 'ring-2 ring-emerald-500' : ''">
              <input class="sr-only" type="radio" value="transfer" v-model="paymentMethod" :disabled="isCheckoutBlocked" />
              <div class="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3l9 6v2H3V9l9-6z"/><path d="M4 13h16v6H4v-6z"/></svg>
                <span class="font-medium">{{ $t('checkout.bankTransfer') }}</span>
              </div>
            </label>
          </div>

          <div v-if="paymentMethod === 'transfer'" class="mt-3 text-sm">
            <div class="rounded-xl border p-3 bg-gray-50">
              <div class="font-medium">{{ $t('bank.name') || 'ADCB' }}</div>
              <div>{{ $t('bank.account') || 'Account' }}: 699321041001</div>
              <div>{{ $t('bank.iban') || 'IBAN' }}: AE470030000699321041001</div>
              <div>{{ $t('bank.bic') || 'BIC' }}: ADCBAEAA</div>
            </div>
          </div>
        </div>
      </section>

      <!-- RIGHT: Order Summary -->
      <aside class="lg:col-span-4">
        <div class="rounded-2xl border p-4 bg-white shadow-sm lg:sticky lg:top-6">
          <h3 class="text-lg font-semibold mb-3">{{ $t('checkout.yourOrder') }}</h3>

          <!-- Help note + WhatsApp -->
          <div class="mb-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 shrink-0 text-emerald-600" fill="currentColor" aria-hidden="true">
              <path d="M2 5a3 3 0 013-3h14a3 3 0 013 3v8a3 3 0 01-3 3H9.41L5.7 19.71A1 1 0 014 19v-3H5a3 3 0 01-3-3V5z"/>
              <path d="M15.23 7.2a1 1 0 011.41.06l1.1 1.18a1 1 0 01-.05 1.41l-.68.64a2.5 2.5 0 01-2.14.62 7.8 7.8 0 01-3.82-1.94 7.8 7.8 0 01-1.94-3.82 2.5 2.5 0 01.62-2.14l.64-.68A1 1 0 0111.5 2.3l1.18 1.1a1 1 0 01.06 1.41l-.62.66a.5.5 0 000 .68l.43.43a5.8 5.8 0 002.06 1.23.5.5 0 00.62-.11l.66-.62z"/>
            </svg>
            <div class="text-sm leading-5">
              <p class="text-emerald-900">
                {{ $t('common.helpNote') || 'If you face any problem during checkout, please contact us.' }}
              </p>
              <a :href="whatsappLink" target="_blank" rel="noopener"
                 class="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-1.5 hover:bg-emerald-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                 :aria-label="$t('common.contactOnWhatsApp') || 'Contact us on WhatsApp'">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="w-4 h-4" fill="currentColor" aria-hidden="true">
                  <path d="M128,24A104,104,0,0,0,44.24,194.34L36,224l29.66-8.24A104,104,0,1,0,128,24Zm0,184a80,80,0,0,1-41.05-11.39l-2.61-.17L66.1,200.9l4.46-16.22-.18-2.82A80,80,0,1,1,128,208Zm44.2-54.35c-2.58-1.31-15.28-7.53-17.63-8.39s-4.09-1.32-5.8,1.32-6.64,8.39-8.15,10.11-3,2-5.59.65a64.83,64.83,0,0,1-19.18-11.82,72.09,72.09,0,0,1-13.3-16.68c-1.39-2.42,0-3.74,1-5.14a47.88,47.88,0,0,0,3.51-4.84,4.55,4.55,0,0,0,.44-4.26c-.44-1.32-5.8-14.08-7.95-19.29s-4.22-4.43-5.79-4.5-3.2-.07-4.94-.07A9.47,9.47,0,0,0,83,93.4c-2.36,2.42-9,8.88-9,21.67s9.23,25.12,10.54,26.86,18.19,28,44.09,39.2c6.17,2.68,11,4.29,14.77,5.5a35.09,35.09,0,0,0,16.26,1,26.67,26.67,0,0,0,17.47-12,21.41,21.41,0,0,0,1.51-12.37C172.63,155.6,170.79,154,172.2,153.65Z"/>
                </svg>
                <span class="font-medium">WhatsApp</span>
              </a>
            </div>
          </div>

          <!-- Products list -->
          <ul class="divide-y">
            <li
              v-for="row in displayedProducts"
              :key="row.product_id"
              class="py-3 flex items-start justify-between gap-3"
            >
              <div class="flex items-start gap-3">
                <NuxtImg
                  v-if="imgSrc(row.image)"
                  :src="imgSrc(row.image)!"
                  width="64" height="64"
                  class="rounded-lg object-cover border shrink-0"
                  :alt="$t('common.productImageAlt') || 'Product image'"
                />
                <div v-else class="w-[64px] h-[64px] rounded-lg border flex items-center justify-center shrink-0 text-xs text-gray-400">
                  {{ $t('common.img') || 'IMG' }}
                </div>
                <div class="text-sm">
                  <div class="font-medium line-clamp-2">{{ row.title }}</div>
                  <div v-if="row.sku" class="text-green-600 font-bold">{{ $t('labels.sku') || 'SKU' }}: {{ row.sku }}</div>

                  <!-- NEW: per-item blocked chip -->
                  <div
                    v-if="row.blocked_in_selected_country"
                    class="mt-1 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 text-rose-700 px-2 py-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.001 10h2v5h-2z"/><path d="M12 17a1.25 1.25 0 110 2.5A1.25 1.25 0 0112 17z"/><path d="M10.29 3.86l-8 14A1 1 0 003 19h18a1 1 0 00.87-1.5l-8-14a1 1 0 00-1.74 0z"/></svg>
                    <span class="text-xs">
                      {{ $t('checkout.itemNotAvailableForCountry') || 'Not available to' }}
                      <strong>{{ blockedCountryName }}</strong>
                    </span>
                  </div>

                  <div class="text-gray-500">{{ row.quantity }} × {{ money(row.unit) }}</div>
                </div>
              </div>
              <div class="text-sm text-red-600 font-semibold">{{ money(row.line) }}$</div>
            </li>
          </ul>

          <div v-if="hasMoreProducts" class="mt-3">
            <button
              type="button"
              class="w-full rounded-xl bg-orange-500 text-white px-4 py-2 font-medium shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              :aria-expanded="showAllProducts"
              :disabled="creatingOrder"
              @click="showAllProducts = !showAllProducts"
            >
              <template v-if="showAllProducts">
                {{ $t('common.showLess') || 'Show less' }}
              </template>
              <template v-else>
                {{ ($t('common.showMore') || 'Show more') + ' (' + remainingCount + ')' }}
              </template>
            </button>
          </div>

          <!-- Totals -->
          <div class="mt-4 space-y-1 text-sm">
            <div class="flex justify-between"><span>{{ $t('checkout.subtotal') }}</span><span>{{ money(quote?.summary?.sub_total) }}$</span></div>

            <div v-if="quote?.summary?.coupon_discount" class="flex justify-between text-emerald-700">
              <span>{{ $t('checkout.coupon') }}</span><span>-{{ money(quote?.summary?.coupon_discount) }}$</span>
            </div>
            <div v-if="quote?.summary?.promo_discount" class="flex justify-between text-emerald-700">
              <span>{{ $t('checkout.promotion') || 'Promotion' }}</span><span>-{{ money(quote?.summary?.promo_discount) }}$</span>
            </div>

            <div class="flex justify-between">
              <span>{{ $t('checkout.shipping') }} ({{ selectedShipping || '-' }})</span>
              <span>{{ money(quote?.summary?.shipping) }}$</span>
            </div>
            <div class="flex justify-between font-medium pt-2 border-t">
              <span>{{ $t('checkout.total') }}</span><span>{{ money(quote?.summary?.total) }}$</span>
            </div>
            <div class="flex justify-between text-rose-700" v-if="surchargePct">
              <span>{{ $t('checkout.paymentSurcharge') }} ({{ surchargePct }}%)</span>
              <span>{{ money(totalWithSurcharge - (quote?.summary?.total ?? 0)) }}$</span>
            </div>
            <div class="flex justify-between font-semibold text-lg pt-1">
              <span>{{ $t('checkout.grandTotal') }}</span><span class="text-red-600 font-bold">{{ money(totalWithSurcharge) }}$</span>
            </div>
          </div>

          <!-- Place order -->
          <div class="mt-5 rounded-2xl border p-4 bg-emerald-50/60">
            <label class="flex items-start gap-2 text-sm text-emerald-900">
              <input type="checkbox" v-model="acceptTerms" class="mt-1 accent-emerald-600" />
              <span>
                {{ $t('checkout.iAgreeTo') }}
                <NuxtLinkLocale to="/terms" class="underline decoration-emerald-600 text-emerald-700 hover:text-emerald-800">
                  {{ $t('checkout.terms') }}
                </NuxtLinkLocale>
              </span>
            </label>

            <button
              class="w-full mt-3 rounded-xl bg-orange-500 text-white px-6 py-3 font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isCheckoutBlocked || !selectedAddressId || !selectedShipping || !paymentMethod || !acceptTerms || creatingOrder"
              :aria-busy="creatingOrder ? 'true' : 'false'"
              @click="createOrder"
              :title="isCheckoutBlocked ? ($t('checkout.blockedButtonTitle') || 'Remove restricted items or change the country to continue') : ''"
            >
              <span v-if="creatingOrder" class="inline-flex items-center gap-2">
                <svg class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                {{ $t('checkout.creatingOrder') || 'Creating your order…' }}
              </span>
              <span v-else>
                {{ $t('checkout.createOrder') }}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <div v-else class="text-center py-20 text-gray-500">
      {{ $t('checkout.CheckoutNotAvailable') }}
      <div class="mt-4">
        <NuxtLinkLocale to="/shop" class="underline">{{ $t('checkout.returnToShop') }}</NuxtLinkLocale>
      </div>
    </div>

    <!-- Address Modal -->
    <Teleport to="body">
      <div
        v-if="addressModalOpen"
        class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3"
        @click.self="closeAddressForm"
      >
        <div class="bg-white w-full sm:max-w-md rounded-xl p-4 sm:p-5 max-h-[85vh] overflow-y-auto shadow-xl" role="dialog" aria-modal="true">
          <h4 class="text-lg font-semibold mb-3">
            {{ isEditing ? $t('checkout.editAddress') : $t('checkout.newAddress') }}
          </h4>
          <form @submit.prevent="saveAddress" class="space-y-3">
            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.country') }}</label>
              <select v-model.number="addressForm.country_id" class="w-full rounded-xl border px-3 py-2" required>
                <option value="">{{ $t('checkout.selectCountry') }}</option>
                <option v-for="c in countries" :key="c.id" :value="c.id">
                  {{ countryDisplayName(c, String($i18n?.locale || locale)) }}
                </option>
              </select>
              <p v-if="countriesLoading" class="text-xs text-gray-500 mt-1">{{ $t('loading') || 'Loading' }}…</p>
              <p v-if="countriesError" class="text-xs text-red-600 mt-1">{{ $t('errors.failedToLoadCountries') || countriesError }}</p>
            </div>

            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.city') }}</label>
              <input v-model="addressForm.city" type="text" class="w-full rounded-xl border px-3 py-2" required />
            </div>

            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.street') }}</label>
              <input v-model="addressForm.street" type="text" class="w-full rounded-xl border px-3 py-2" required />
            </div>

            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.address') }}</label>
              <textarea v-model="addressForm.address" rows="3" class="w-full rounded-xl border px-3 py-2" required></textarea>
            </div>

            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.postalCode') }}</label>
              <input v-model="addressForm.postal_code" type="text" class="w-full rounded-xl border px-3 py-2" required />
            </div>

            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.phone') }}</label>
              <input v-model="addressForm.phone" type="text" class="w-full rounded-xl border px-3 py-2" required />
            </div>

            <label class="inline-flex items-center gap-2 mt-1">
              <input type="checkbox" v-model="addressForm.is_default" class="accent-emerald-600" />
              <span class="text-sm">{{ $t('checkout.setAsDefault') }}</span>
            </label>

            <div class="pt-2 flex justify-end gap-3">
              <button type="button" class="px-4 py-2 rounded border hover:bg-gray-50" @click="closeAddressForm">{{ $t('cancel') }}</button>
              <button type="submit" class="px-4 py-2 rounded bg-orange-500 text-white hover:bg-emerald-700">{{ $t('save') }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </main>
</template>
