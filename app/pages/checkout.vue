<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n, useRouter, useNuxtApp, definePageMeta, useSeoMeta, useHead, useRuntimeConfig } from '#imports'

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
type ShippingOption = { key: ShippingKey; label: string; price: number; disabled?: boolean }
type Quote = {
  products: QuoteProduct[]
  addresses: Address[]
  selected_address_id: number|null
  shipping: { options: ShippingOption[], selected: ShippingKey|null, price: number }
  summary: { sub_total:number; discount:number; sub_after_coupon:number; shipping:number; total:number }
  weights: { total_weight_kg:number; zone_id:number|null }
}
type Country = {
  id: number
  name: string | Record<string,string>
  iso2?: string | null
  iso3?: string | null
  zone_id?: number | null
}

/* ---------------- Setup ---------------- */
const UAE_COUNTRY_ID = 231
const { $customApi } = useNuxtApp()
const { t, locale } = useI18n()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()

/** Put your WhatsApp number in .env as:
 *  NUXT_PUBLIC_WHATSAPP_NUMBER=9715XXXXXXXX (digits only, no + or spaces)
 *  Fallback below is used if not provided.
 */
const WHATSAPP_NUMBER = String((runtimeConfig as any)?.public?.whatsappNumber || '905376266092')

const whatsappLink = computed(() => {
  const msg = t('common.whatsappPrefill') || 'Hello, I need help completing my order.'
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
})

/* ---------------- Helpers ---------------- */
const isString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const money = (v: unknown): string => Number(v || 0).toFixed(2)
const imgSrc = (v: unknown): string | null => (isString(v) ? v : null)

/** Safely resolve country display name from string or JSON */
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
  } catch { /* ignore */ }
  return String(c.name ?? '')
}

/* ---------------- State ---------------- */
const quote = ref<Quote | null>(null)
const loading = ref(false)
const creatingOrder = ref(false) // 🔒 prevent double submits after click

const coupon = ref<string>('')

const addresses = ref<Address[]>([])
const selectedAddressId = ref<number | null>(null)
const selectedAddress = computed<Address | null>(() => addresses.value.find(a => a.id === selectedAddressId.value) || null)

const selectedShipping = ref<ShippingKey | null>(null)

const paymentMethod = ref<'card'|'paypal'|'transfer' | null>(null)
const acceptTerms = ref(false)

const shippingDisabled = computed(() => !selectedAddressId.value)
const paymentDisabled = computed(() => !selectedShipping.value)

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
    countriesError.value = e?.message || 'Failed to load countries'
  } finally {
    countriesLoading.value = false
  }
}

/* ---------------- Shipping options (UAE override) ---------------- */
const shippingOptions = computed<ShippingOption[]>(() => {
  if (selectedAddress.value?.country_id === UAE_COUNTRY_ID) {
    return [
      { key: 'pick_up', label: t('checkout.pickup') || 'Pickup', price: 0 },
      { key: 'domestic',  label: t('checkout.localShipping') || 'Local shipping', price: 10 },
    ]
  }
  return quote.value?.shipping?.options ?? []
})

/* ---------------- Address modal (Add/Edit + set default) ---------------- */
type AddressForm = Partial<Address> & { is_default?: boolean }
const addressModalOpen = ref(false)
const addressForm = ref<AddressForm>({})
const isEditing = computed(() => !!addressForm.value.id)

function openAddressForm(a?: Address) {
  if (a) {
    addressForm.value = { ...a }
  } else {
    addressForm.value = {
      country_id: undefined as any,
      city: '',
      street: '',
      address: '',
      phone: '',
      postal_code: '',
      is_default: false
    }
  }
  addressModalOpen.value = true
}
function closeAddressForm() {
  addressModalOpen.value = false
}

/* ---------------- API calls (via customApi) ---------------- */
async function fetchAddresses() {
  const res = await $customApi<Quote>('/checkout/quote')
  addresses.value = res?.addresses ?? []
  selectedAddressId.value = res?.selected_address_id ?? addresses.value[0]?.id ?? null
}

async function fetchQuote() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (selectedAddressId.value) params.set('address_id', String(selectedAddressId.value))
    if (selectedShipping.value)  params.set('shipping_method', String(selectedShipping.value))
    if (coupon.value)            params.set('coupon', coupon.value)

    const res = await $customApi<Quote>(`/checkout/quote?${params.toString()}`)
    quote.value = res

    if (!selectedAddressId.value) selectedAddressId.value = res.selected_address_id ?? null

    if (!selectedShipping.value && res.shipping?.selected) {
      selectedShipping.value = res.shipping.selected as ShippingKey
    }

    if (selectedAddress.value?.country_id === UAE_COUNTRY_ID && selectedShipping.value && !['pick_up','domestic'].includes(selectedShipping.value)) {
      selectedShipping.value = null
    }
  } finally {
    loading.value = false
  }
}

async function saveAddress() {
  const body = { ...addressForm.value }

  if (
    !body.country_id ||
    !String(body.city || '').trim() ||
    !String(body.street || '').trim() ||
    !String(body.address || '').trim() ||
    !String(body.postal_code || '').trim() ||
    !String(body.phone || '').trim()
  ) {
    alert(t('checkout.allAddressFieldsRequired') || 'Please fill in all address fields.')
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
  if (selectedAddress.value?.country_id === UAE_COUNTRY_ID) {
    selectedShipping.value = null
  }
  await fetchQuote()
}

async function deleteAddress(a: Address) {
  if (!confirm(t('checkout.deleteAddressConfirm') || 'Delete this address?')) return
  await $customApi(`/delete-addresses/${a.id}`, { method: 'POST' })
  await fetchAddresses()
  if (selectedAddressId.value === a.id) {
    selectedAddressId.value = addresses.value[0]?.id ?? null
  }
  await fetchQuote()
}

async function createOrder() {
  // guard basic requirements first
  if (!selectedAddressId.value) return alert(t('checkout.selectAddressFirst') || 'Please select an address')
  if (!selectedShipping.value)  return alert(t('checkout.selectShippingFirst') || 'Please choose a shipping method')
  if (!paymentMethod.value)     return alert(t('checkout.selectPaymentFirst') || 'Please select a payment method')
  if (!acceptTerms.value)       return alert(t('checkout.acceptTermsFirst') || 'Please accept Terms & Conditions')

  if (creatingOrder.value) return // already submitting
  creatingOrder.value = true

  const paymentMap: Record<'card'|'paypal'|'transfer', string> = {
    card: 'ccavenue',          // CCAvenue
    paypal: 'paypal',          // PayPal
    transfer: 'transfer_online'
  }

  const body = {
    address:         selectedAddressId.value,
    shipping_method: selectedShipping.value,
    payment_method:  paymentMap[paymentMethod.value],
    coupon_code:     coupon.value || null,
  }

  try {
    // Auth: this route is under auth:api
    const res = await $customApi<any>('/user/orders/create', {
      method: 'POST',
      body,
      headers: {
        currency: 'USD',
        'Accept-Language': 'en',
      },
    })

    // ---- Unwrap your API envelope ----
    const payload = res?.data || res
    const order   = payload?.order
    const paypalUrl = (payload?.paypal_url || '').trim()

    // PayPal: if a non-empty URL is present, go there
    if (paymentMethod.value === 'paypal' && paypalUrl) {
      window.location.href = paypalUrl
      return
    }

    // Card (CCAvenue): add 3% to total and redirect
    if (paymentMethod.value === 'card' && order?.order_id) {
      const baseTotal = Number(order?.total?.value ?? order?.total ?? 0)
      const amount = (Math.round((baseTotal * 1.03 + Number.EPSILON) * 100) / 100).toFixed(2)
      location.href =
        `https://dev-srv.tlkeys.com/online-order?order_id=${encodeURIComponent(order.order_id)}&amount=${amount}`
      return
    }

    // Transfer or any non-redirect flow
    if (order?.order_id) {
      router.push({ path: '/complete-order', query: { orderId: order.order_id } })
      return
    }

    // Fallback
    alert('Order created but missing order id in response.')
    creatingOrder.value = false
  } catch (e: any) {
    alert(e?.message || 'Failed to create order')
    creatingOrder.value = false // re-enable on error so user can retry
  }
}

/* ---------------- Products list: show 5 then toggle ---------------- */
const COLLAPSE_COUNT = 5
const showAllProducts = ref(false)
const allProducts = computed(() => quote.value?.products ?? [])
const displayedProducts = computed(() =>
  showAllProducts.value ? allProducts.value : allProducts.value.slice(0, COLLAPSE_COUNT)
)
const hasMoreProducts = computed(() => allProducts.value.length > COLLAPSE_COUNT)
const remainingCount = computed(() => Math.max(allProducts.value.length - COLLAPSE_COUNT, 0))

/* ---------------- SEO ---------------- */
const pageTitle = computed(() => {
  const count = allProducts.value.length
  const base = t('dashboard.checkout') || 'Checkout'
  return `${base} — ${count} ${count === 1 ? 'item' : 'items'}`
})

const pageDescription = computed(() => {
  const subtotal = money(quote.value?.summary?.sub_total) + '$'
  const shipLabel = selectedShipping.value
    ? (t('checkout.shippingMethod') || 'Shipping') + ': ' + String(selectedShipping.value).toUpperCase()
    : (t('checkout.shippingMethod') || 'Shipping')
  return `${t('checkout.reviewAndPlace') || 'Review your cart and place your order.'} Subtotal: ${subtotal}. ${shipLabel}.`
})

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: 'website',
  twitterCard: 'summary'
})

// Keep checkout out of search results
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
watch([selectedShipping, coupon], async () => {
  await fetchQuote()
})
</script>

<template>
  <main class="container mx-auto px-3 md:px-4 lg:px-6 py-6">
    <!-- Breadcrumbs -->
    <nav class="text-sm mb-4">
      <ol class="flex gap-2 text-gray-500">
        <li><NuxtLinkLocale to="/">{{ $t('shop.home') }}</NuxtLinkLocale></li>
        <li>/</li>
        <li><NuxtLinkLocale to="/cart">{{ $t('dashboard.cart') }}</NuxtLinkLocale></li>
        <li>/</li>
        <li class="text-gray-900 font-medium">{{ $t('dashboard.checkout') }}</li>
      </ol>
    </nav>

    <div v-if="(quote?.products?.length ?? 0) > 0" class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:sticky">
      <!-- LEFT: Steps -->
      <section class="lg:col-span-8 space-y-6">
        <!-- Coupon -->
        <div class="rounded-2xl border p-4 bg-white shadow-sm">
          <p class="text-center text-gray-500 mb-2">{{ $t('checkout.IfYouHaveAcoupon') }}</p>
          <div class="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <input
              v-model="coupon"
              type="text"
              class="w-full sm:w-80 rounded-xl border px-3 py-2"
              :placeholder="$t('checkout.enterCouponCode')"
            />
            <button class="rounded-xl border px-4 py-2 font-medium hover:bg-gray-50"
                    :disabled="!coupon || creatingOrder"
                    @click="fetchQuote">
              {{ $t('checkout.applyCoupon') }}
            </button>
          </div>
        </div>

        <!-- Step 1: Address -->
        <div class="rounded-2xl border p-4 bg-white shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10z"/><path fill-rule="evenodd" d="M2 20a8 8 0 1116 0v1H2v-1z" clip-rule="evenodd"/>
              </svg>
              {{ $t('checkout.addrress') }}
            </h3>
            <button class="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" @click="openAddressForm()" :disabled="creatingOrder">
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
        <div class="rounded-2xl border p-4 bg-white shadow-sm" :class="(shippingDisabled || creatingOrder) ? 'opacity-50 pointer-events-none' : ''">
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h10a2 2 0 012 2v8h-1.18a3 3 0 10-5.64 0H8.82a3 3 0 10-5.64 0H2V6z"/>
              <path d="M20 8h-2v6h.82a3 3 0 015.64 0H24V12l-2-4z"/>
            </svg>
            {{ $t('checkout.shippingMethod') }}
          </h3>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label
              v-for="opt in shippingOptions"
              :key="opt.key"
              class="rounded-2xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
              :class="selectedShipping === opt.key ? 'ring-2 ring-emerald-500' : ''"
            >
              <input type="radio" class="sr-only" :value="opt.key" v-model="selectedShipping" :disabled="opt.disabled" />
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
              <div class="text-md font-bold mt-3" v-if="!opt.disabled">{{ money(opt.price) }}$</div>
              <div class="text-xs text-gray-400" v-else>—</div>
            </label>
          </div>
        </div>

        <!-- Step 3: Payment -->
        <div class="rounded-2xl border p-4 bg-white shadow-sm" :class="(paymentDisabled || creatingOrder) ? 'opacity-50 pointer-events-none' : ''">
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v2H2V6z"/>
              <path d="M2 10h20v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8zm3 5h6v2H5v-2z"/>
            </svg>
            {{ $t('checkout.paymentMethod') }}
          </h3>

          <div class="grid sm:grid-cols-3 gap-3">
            <label class="rounded-2xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
                   :class="paymentMethod === 'card' ? 'ring-2 ring-emerald-500' : ''">
              <input class="sr-only" type="radio" value="card" v-model="paymentMethod" />
              <div class="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6a2 2 0 012-2h14a2 2 0 012 2v2H3V6z"/><path d="M3 10h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8zm2 5h6v2H5v-2z"/></svg>
                <span class="font-medium">{{ $t('checkout.payCard') }}</span>
              </div>
            </label>

            <label class="rounded-2xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
                   :class="paymentMethod === 'paypal' ? 'ring-2 ring-emerald-500' : ''">
              <input class="sr-only" type="radio" value="paypal" v-model="paymentMethod" />
              <div class="flex items-center justify-center gap-2">
                <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-600 text-white text-xs font-bold">P</span>
                <span class="font-medium">PayPal</span>
              </div>
            </label>

            <label class="rounded-2xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
                   :class="paymentMethod === 'transfer' ? 'ring-2 ring-emerald-500' : ''">
              <input class="sr-only" type="radio" value="transfer" v-model="paymentMethod" />
              <div class="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 6v2H3V9l9-6z"/><path d="M4 13h16v6H4v-6z"/></svg>
                <span class="font-medium">{{ $t('checkout.bankTransfer') }}</span>
              </div>
            </label>
          </div>

          <div v-if="paymentMethod === 'transfer'" class="mt-3 text-sm">
            <div class="rounded-xl border p-3 bg-gray-50">
              <div class="font-medium">ADCB</div>
              <div>Account: 699321041001</div>
              <div>IBAN: AE470030000699321041001</div>
              <div>BIC: ADCBAEAA</div>
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
            <!-- Icon (chat bubble + handset) -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 class="w-6 h-6 shrink-0 text-emerald-600" fill="currentColor" aria-hidden="true">
              <path d="M2 5a3 3 0 013-3h14a3 3 0 013 3v8a3 3 0 01-3 3H9.41L5.7 19.71A1 1 0 014 19v-3H5a3 3 0 01-3-3V5z"/>
              <path d="M15.23 7.2a1 1 0 011.41.06l1.1 1.18a1 1 0 01-.05 1.41l-.68.64a2.5 2.5 0 01-2.14.62 7.8 7.8 0 01-3.82-1.94 7.8 7.8 0 01-1.94-3.82 2.5 2.5 0 01.62-2.14l.64-.68A1 1 0 0111.5 2.3l1.18 1.1a1 1 0 01.06 1.41l-.62.66a.5.5 0 000 .68l.43.43a5.8 5.8 0 002.06 1.23.5.5 0 00.62-.11l.66-.62z"/>
            </svg>
            <div class="text-sm leading-5">
              <p class="text-emerald-900">
                {{ $t('common.helpNote') || 'If you face any problem during checkout, please contact us.' }}
              </p>
              <a :href="whatsappLink"
                 target="_blank" rel="noopener"
                 class="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-1.5 hover:bg-emerald-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                 aria-label="Contact us on WhatsApp">
                <!-- WhatsApp mini mark -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="w-4 h-4" fill="currentColor" aria-hidden="true">
                  <path d="M128,24A104,104,0,0,0,44.24,194.34L36,224l29.66-8.24A104,104,0,1,0,128,24Zm0,184a80,80,0,0,1-41.05-11.39l-2.61-.17L66.1,200.9l4.46-16.22-.18-2.82A80,80,0,1,1,128,208Zm44.2-54.35c-2.58-1.31-15.28-7.53-17.63-8.39s-4.09-1.32-5.8,1.32-6.64,8.39-8.15,10.11-3,2-5.59.65a64.83,64.83,0,0,1-19.18-11.82,72.09,72.09,0,0,1-13.3-16.68c-1.39-2.42,0-3.74,1-5.14a47.88,47.88,0,0,0,3.51-4.84,4.55,4.55,0,0,0,.44-4.26c-.44-1.32-5.8-14.08-7.95-19.29s-4.22-4.43-5.79-4.5-3.2-.07-4.94-.07A9.47,9.47,0,0,0,83,93.4c-2.36,2.42-9,8.88-9,21.67s9.23,25.12,10.54,26.86,18.19,28,44.09,39.2c6.17,2.68,11,4.29,14.77,5.5a35.09,35.09,0,0,0,16.26,1,26.67,26.67,0,0,0,17.47-12,21.41,21.41,0,0,0,1.51-12.37C172.63,155.6,170.79,154,172.2,153.65Z"/>
                </svg>
                <span class="font-medium">WhatsApp</span>
              </a>
            </div>
          </div>

          <!-- Products (first 5 + full-width orange toggle) -->
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
                />
                <div v-else class="w-[64px] h-[64px] rounded-lg border flex items-center justify-center shrink-0 text-xs text-gray-400">
                  IMG
                </div>
                <div class="text-sm">
                  <div class="font-medium line-clamp-2">{{ row.title }}</div>
                  <div v-if="row.sku" class="text-green-600 font-bold">SKU: {{ row.sku }}</div>
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
                {{ $t('show Less') || 'Show less' }}
              </template>
              <template v-else>
                {{ ($t('show More') || 'Show more') + ' (' + remainingCount + ')' }}
              </template>
            </button>
          </div>

          <!-- Totals -->
          <div class="mt-4 space-y-1 text-sm">
            <div class="flex justify-between"><span>{{ $t('checkout.subtotal') }}</span><span>{{ money(quote?.summary?.sub_total) }}$</span></div>
            <div v-if="quote?.summary?.discount" class="flex justify-between text-emerald-700">
              <span>{{ $t('checkout.coupon') }}</span><span>-{{ money(quote?.summary?.discount) }}</span>
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
              <input type="checkbox" v-model="acceptTerms" class="mt-1 accent-emerald-600" :disabled="creatingOrder" />
              <span>
                {{ $t('checkout.iAgreeTo') }}
                <NuxtLinkLocale to="/terms" class="underline decoration-emerald-600 text-emerald-700 hover:text-emerald-800">
                  {{ $t('checkout.terms') }}
                </NuxtLinkLocale>
              </span>
            </label>

            <button
              class="w-full mt-3 rounded-xl bg-orange-500 text-white px-6 py-3 font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!selectedAddressId || !selectedShipping || !paymentMethod || !acceptTerms || creatingOrder"
              :aria-busy="creatingOrder ? 'true' : 'false'"
              @click="createOrder"
            >
              <span v-if="creatingOrder" class="inline-flex items-center gap-2">
                <svg class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
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
        <div class="bg-white w-full sm:max-w-md rounded-xl p-4 sm:p-5 max-h-[85vh] overflow-y-auto shadow-xl">
          <h4 class="text-lg font-semibold mb-3">
            {{ isEditing ? $t('checkout.editAddress') : $t('checkout.newAddress') }}
          </h4>
          <form @submit.prevent="saveAddress" class="space-y-3">
            <!-- Country SELECT -->
            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.country') }}</label>
              <select
                v-model.number="addressForm.country_id"
                class="w-full rounded-xl border px-3 py-2"
                required
                :disabled="creatingOrder"
              >
                <option value="">{{ $t('checkout.selectCountry') }}</option>
                <option
                  v-for="c in countries"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ countryDisplayName(c, String($i18n?.locale || locale)) }}
                </option>
              </select>
              <p v-if="countriesLoading" class="text-xs text-gray-500 mt-1">{{ $t('loading') }}…</p>
              <p v-if="countriesError" class="text-xs text-red-600 mt-1">{{ $t('countriesError') || countriesError }}</p>
            </div>

            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.city') }}</label>
              <input v-model="addressForm.city" type="text" class="w-full rounded-xl border px-3 py-2" required :disabled="creatingOrder" />
            </div>

            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.street') }}</label>
              <input v-model="addressForm.street" type="text" class="w-full rounded-xl border px-3 py-2" required :disabled="creatingOrder" />
            </div>

            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.address') }}</label>
              <textarea v-model="addressForm.address" rows="3" class="w-full rounded-xl border px-3 py-2" required :disabled="creatingOrder"></textarea>
            </div>

            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.postalCode') }}</label>
              <input v-model="addressForm.postal_code" type="text" class="w-full rounded-xl border px-3 py-2" required :disabled="creatingOrder" />
            </div>

            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.phone') }}</label>
              <input v-model="addressForm.phone" type="text" class="w-full rounded-xl border px-3 py-2" required :disabled="creatingOrder" />
            </div>

            <label class="inline-flex items-center gap-2 mt-1">
              <input type="checkbox" v-model="addressForm.is_default" class="accent-emerald-600" :disabled="creatingOrder" />
              <span class="text-sm">{{ $t('checkout.setAsDefault') }}</span>
            </label>

            <div class="pt-2 flex justify-end gap-3">
              <button type="button" class="px-4 py-2 rounded border hover:bg-gray-50" @click="closeAddressForm" :disabled="creatingOrder">{{ $t('cancel') }}</button>
              <button type="submit" class="px-4 py-2 rounded bg-orange-500 text-white hover:bg-emerald-700" :disabled="creatingOrder">{{ $t('save') }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </main>
</template>
