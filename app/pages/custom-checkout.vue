<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRuntimeConfig, useNuxtApp, useHead } from '#imports'
import { useI18n } from 'vue-i18n'
import { useAlertStore } from '~/stores/alert'
import { computeUnitPrice } from '~/utils/pricing'
import { useCurrency } from '~/composables/useCurrency'

/* Head */
useHead({
  title: 'Buy Now — Checkout',
  meta: [{ name: 'robots', content: 'noindex,nofollow' }]
})

type Country = { id:number; name:string|Record<string,string>; iso2?:string|null; zone_id?:number|null }
type ShippingKey = 'dhl'|'fedex'|'aramex'|'ups'
type ShippingOption = { key:ShippingKey; label:string; price:number; disabled?:boolean }
type BuyNowQuote = {
  product:{ id:number|string; title:string; sku?:string|null; image?:string|null; weight:number }
  quantity:number
  unit:number
  line:number
  weights:{ total_weight_kg:number; zone_id:number|null }
  shipping:{ options:ShippingOption[]; selected:ShippingKey|null; price:number }
  summary:{ product_total:number; shipping:number; total:number }
}
type ProductLite = {
  id:number|string
  title:string
  slug?:string|null
  sku?:string|null
  image?:string|null
  images?:Array<{src:string}>
  price?:number|string|null
  regular_price?:number|string|null
  sale_price?:number|string|null
  table_price?:Array<{min_qty:number;max_qty?:number|null;price:number|string;sale_price?:number|string|null}>
  discount_type?:'percent'|'fixed'|null
  discount_value?:number|string|null
  discount_active?:boolean
  discount_end?:string|null
}
type PayMethod = 'card'|'paypal'|'transfer'

const { t } = useI18n()
const route = useRoute()
const { $customApi } = useNuxtApp()
const cfg = useRuntimeConfig()
const alerts = useAlertStore()
const { formatMoney } = useCurrency()

/* routing / data */
const pid   = computed(() => String(route.query.pid || ''))
const pslug = computed(() => String(route.query.pslug || ''))
const initialQty = Math.max(1, Number(route.query.qty || 1))
const serialFromQuery = String(route.query.serial || '')

const loadingProduct = ref(false)
const productError = ref<string|null>(null)
const product = ref<ProductLite|null>(null)

const qty = ref<number>(initialQty)
const countries = ref<Country[]>([])
const countriesLoading = ref(false)
const countriesError = ref<string|null>(null)
const selectedCountryId = ref<number | ''>('')

const quoteLoading = ref(false)
const quoteError = ref<string|null>(null)
const quote = ref<BuyNowQuote | null>(null)
const selectedShipping = ref<ShippingKey | null>(null)

/* form */
const submitAttempted = ref(false)
const email = ref('')
const fullName = ref('')
const city = ref('')
const streetAddress = ref('')
const postalCode = ref('')
const phone = ref('')
const paymentMethod = ref<PayMethod>('card')

function nameOf(c: Country): string {
  try {
    if (typeof c.name === 'string') {
      const s = c.name.trim()
      if (s.startsWith('{')) { const o = JSON.parse(s); return o.en || Object.values(o)[0] || '' }
      return s
    }
    return c.name?.['en'] || Object.values(c.name||{})[0] || ''
  } catch { return String(c.name ?? '') }
}

const imageSrc = computed(() => product.value?.images?.[0]?.src || product.value?.image || '/images/placeholder.webp')

async function fetchProduct() {
  loadingProduct.value = true
  productError.value = null
  const API_BASE_URL = cfg.public.API_BASE_URL as string

  const use = async (path: string) => {
    const res = await $customApi(`${API_BASE_URL}${path}`)
    const p = (res?.data ?? res) as any
    const images = Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [{ src: p.image }] : [])
    product.value = {
      id: p.id, title: p.title ?? p.name ?? '', slug: p.slug ?? null,
      sku: p.sku ?? null, image: p.image ?? null, images,
      price: p.price ?? null, regular_price: p.regular_price ?? null, sale_price: p.sale_price ?? null,
      table_price: Array.isArray(p.table_price) ? p.table_price : [],
      discount_type: p?.discount?.type ?? p.discount_type ?? null,
      discount_value: p?.discount?.value ?? p.discount_value ?? null,
      discount_active: Boolean(p?.discount?.active ?? p.discount_active ?? false),
      discount_end: p?.discount?.end_date ?? p.discount_end ?? null
    }
  }

  try {
    if (pslug.value) {
      await use(`/products/slug/${encodeURIComponent(pslug.value)}?include=images,table_price,discount`)
    } else {
      try {
        await use(`/products/${encodeURIComponent(pid.value)}?include=images,table_price,discount`)
      } catch {
        await use(`/products/id/${encodeURIComponent(pid.value)}?include=images,table_price,discount`)
      }
    }
  } catch (e: any) {
    productError.value = e?.message || 'Failed to load the product'
  } finally {
    loadingProduct.value = false
  }
}

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

const unitPrice = computed(() => {
  const p: any = product.value
  if (!p) return 0
  return computeUnitPrice(p, Math.max(1, Number(qty.value || 1))).unit
})
const lineTotal = computed(() => Math.max(0, unitPrice.value * Math.max(1, Number(qty.value || 1))))

async function fetchBuyNowQuote() {
  quoteLoading.value = true
  quoteError.value = null
  quote.value = null
  try {
    if (!product.value) throw new Error('No product')
    if (!selectedCountryId.value) throw new Error('Please select a country')

    const body = {
      product_id: product.value.id,
      quantity: Math.max(1, Number(qty.value || 1)),
      country_id: Number(selectedCountryId.value),
      serial: serialFromQuery || null
    }
    const res = await $customApi<BuyNowQuote>('/buy-now/quote', { method: 'POST', body })
    const data: any = res?.data ?? res
    quote.value = data
    selectedShipping.value = (data?.shipping?.selected ?? null) as ShippingKey | null
  } catch (e: any) {
    quoteError.value = e?.message || 'Failed to calculate shipping'
  } finally {
    quoteLoading.value = false
  }
}

watch([qty, selectedCountryId], () => {
  if (product.value && selectedCountryId.value) fetchBuyNowQuote()
})
watch(selectedShipping, () => {
  if (!quote.value || !selectedShipping.value) return
  const opt = quote.value.shipping.options.find(o => o.key === selectedShipping.value)
  if (!opt || opt.disabled) return
  quote.value.shipping.selected = selectedShipping.value
  quote.value.shipping.price = opt.price
  quote.value.summary.shipping = opt.price
  quote.value.summary.total = +(lineTotal.value + opt.price).toFixed(2)
})

/* Validation + totals + submit */
const validEmail = computed(() => /\S+@\S+\.\S+/.test(email.value.trim()))
const allRequiredFilled = computed(() => {
  return (
    validEmail.value &&
    fullName.value.trim().length > 5 &&
    selectedCountryId.value !== '' &&
    city.value.trim().length > 3 &&
    streetAddress.value.trim().length > 8 &&
    postalCode.value.trim().length > 0 &&
    phone.value.trim().length > 6
  )
})
const canPlaceOrder = computed(() =>
  allRequiredFilled.value && !loadingProduct.value && !countriesLoading.value && !quoteLoading.value && !productError.value && !countriesError.value && !quoteError.value
)

/* Show shipping as 0.00 until quote exists */
const displayedShipping = computed(() => quote.value?.summary.shipping ?? 0)

/* Subtotal (products + shipping) */
const subtotal = computed(() => +(lineTotal.value + displayedShipping.value).toFixed(2))
/* 3% fee for card & PayPal */
const feeRate = computed(() => (paymentMethod.value === 'card' || paymentMethod.value === 'paypal') ? 0.03 : 0)
const paymentFee = computed(() => +(subtotal.value * feeRate.value).toFixed(2))
const grandTotal = computed(() => +(subtotal.value + paymentFee.value).toFixed(2))

function markInvalid(v: string | number | '') {
  return submitAttempted.value && (!v || String(v).trim() === '')
}

function handlePlaceOrder() {
  submitAttempted.value = true
  if (!allRequiredFilled.value) {
    alerts.error(t('checkout.missingFields'))
    return
  }
  const payload = {
    product_id: product.value?.id,
    quantity: qty.value,
    contact: {
      email: email.value.trim(),
      full_name: fullName.value.trim(),
      phone: phone.value.trim()
    },
    address: {
      country_id: selectedCountryId.value,
      city: city.value.trim(),
      street: streetAddress.value.trim(),
      postal_code: postalCode.value.trim()
    },
    shipping: {
      method: selectedShipping.value,
      price: displayedShipping.value
    },
    amounts: {
      unit: unitPrice.value,
      line: lineTotal.value,
      shipping: displayedShipping.value,
      payment_fee: paymentFee.value,
      subtotal: subtotal.value,
      total: grandTotal.value
    },
    payment_method: paymentMethod.value as PayMethod,
    serial: serialFromQuery || null
  }

  console.log('Checkout payload:', payload)
  alerts.success(t('checkout.orderCreated'))
}

onMounted(async () => {
  await Promise.all([fetchProduct(), fetchCountries()])
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- LEFT -->
      <section class="lg:col-span-2">
        <div class="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div class="p-6 border-b border-gray-100 flex items-center gap-4">
            <img src="/images/logo/techno-lock-desktop-logo.webp" alt="Logo" class="h-16" />
            <h1 class="text-2xl font-semibold text-gray-900">{{ t('dashboard.checkout') }}</h1>
          </div>

          <div class="p-6 space-y-6">
            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="text-sm text-gray-600">{{ t('common.email') }} <span class="text-red-500">*</span></label>
                <input
                  type="email"
                  v-model="email"
                  required
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  :class="validEmail ? 'border-gray-300' : (submitAttempted ? 'border-red-400' : 'border-gray-300')"
                  :placeholder="t('common.emailAddress')"
                />
                <p v-if="submitAttempted && !validEmail" class="text-xs text-red-600 mt-1">{{ t('checkout.missingFields') }}</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-gray-600">{{ t('auth.register.fullName') }} <span class="text-red-500">*</span></label>
                  <input
                    type="text"
                    v-model="fullName"
                    required
                    class="mt-1 w-full rounded-lg border px-3 py-2"
                    :class="markInvalid(fullName) ? 'border-red-400' : 'border-gray-300'"
                    placeholder="First Last"
                  />
                </div>
                <div>
                  <label class="text-sm text-gray-600">{{ t('auth.register.phone') }} <span class="text-red-500">*</span></label>
                  <input
                    type="tel"
                    v-model="phone"
                    required
                    class="mt-1 w-full rounded-lg border px-3 py-2"
                    :class="markInvalid(phone) ? 'border-red-400' : 'border-gray-300'"
                    placeholder="+1 555 555 5555"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-gray-600">{{ t('checkout.country') }} <span class="text-red-500">*</span></label>
                  <select
                    v-model.number="selectedCountryId"
                    required
                    class="mt-1 w-full rounded-lg border px-3 py-2"
                    :class="markInvalid(selectedCountryId) ? 'border-red-400' : 'border-gray-300'"
                    :disabled="loadingProduct || countriesLoading || !!productError"
                  >
                    <option value="">{{ countriesLoading ? t('common.loading') : t('checkout.selectCountry') }}</option>
                    <option v-for="c in countries" :key="c.id" :value="c.id">{{ nameOf(c) }}</option>
                  </select>
                  <p v-if="countriesError" class="text-xs text-red-600 mt-1">{{ countriesError }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-600">{{ t('checkout.city') }} <span class="text-red-500">*</span></label>
                  <input
                    type="text"
                    v-model="city"
                    required
                    class="mt-1 w-full rounded-lg border px-3 py-2"
                    :class="markInvalid(city) ? 'border-red-400' : 'border-gray-300'"
                    :placeholder="t('checkout.city')"
                  />
                </div>
              </div>

              <div>
                <label class="text-sm text-gray-600">{{ t('checkout.street') }} <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  v-model="streetAddress"
                  required
                  class="mt-1 w-full rounded-lg border px-3 py-2"
                  :class="markInvalid(streetAddress) ? 'border-red-400' : 'border-gray-300'"
                  :placeholder="t('checkout.address')"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-2">
                  <label class="text-sm text-gray-600">{{ t('checkout.postalCode') }} <span class="text-red-500">*</span></label>
                  <input
                    type="text"
                    v-model="postalCode"
                    required
                    class="mt-1 w-full rounded-lg border px-3 py-2"
                    :class="markInvalid(postalCode) ? 'border-red-400' : 'border-gray-300'"
                    :placeholder="t('checkout.postalCode')"
                  />
                </div>

                <div>
                  <label class="text-sm text-gray-600">{{ t('product.quantity') }}</label>
                  <input type="number" min="1" v-model.number="qty" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
              </div>

              <!-- Shipping methods -->
              <div class="mt-2">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-600">{{ t('checkout.shippingMethod') }}</span>
                </div>

                <div v-if="quoteLoading" class="h-20 rounded bg-gray-100 animate-pulse"></div>
                <div v-else-if="productError" class="rounded border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
                  {{ productError }}
                </div>
                <div v-else-if="quoteError" class="rounded border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
                  {{ quoteError }}
                </div>
                <div v-else-if="quote?.shipping?.options?.length" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label
                    v-for="opt in quote.shipping.options"
                    :key="opt.key"
                    class="rounded-2xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
                    :class="selectedShipping === opt.key ? 'ring-2 ring-emerald-500' : ''"
                  >
                    <input type="radio" class="sr-only" :value="opt.key" v-model="selectedShipping" :disabled="opt.disabled" />
                    <div class="font-bold text-xs">{{ opt.label }}</div>
                    <div class="mt-2 text-sm" v-if="!opt.disabled">{{ formatMoney(opt.price) }}</div>
                    <div class="text-xs text-gray-400" v-else>—</div>
                  </label>
                </div>

                <!-- When no country selected yet we still show 0.00 in the summary (right side);
                     here we can keep the area empty or add a helper line if you later add a key -->
              </div>

              <!-- Payment methods (+ 3% note) -->
              <div class="mt-4">
                <div class="flex items-center justify-between">
                  <div class="text-sm text-gray-600 mb-2">{{ t('checkout.paymentMethod') }}</div>
                  <div class="text-xs text-gray-500">{{ t('checkout.paymentSurcharge') }}</div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label class="rounded-xl border p-3 cursor-pointer text-center hover:shadow-sm flex flex-col items-center justify-center space-y-2"
                         :class="paymentMethod==='card' ? 'ring-2 ring-orange-500' : ''">
                    <input class="sr-only" type="radio" value="card" v-model="paymentMethod" />
                    <span class="text-2xl">💳</span>
                    <div class="font-medium text-sm">Card</div>
                  </label>

                  <label class="rounded-xl border p-3 cursor-pointer text-center hover:shadow-sm flex flex-col items-center justify-center space-y-2"
                         :class="paymentMethod==='paypal' ? 'ring-2 ring-orange-500' : ''">
                    <input class="sr-only" type="radio" value="paypal" v-model="paymentMethod" />
                    <span class="text-2xl">🅿️</span>
                    <div class="font-medium text-sm">PayPal</div>
                  </label>

                  <label class="rounded-xl border p-3 cursor-pointer text-center hover:shadow-sm flex flex-col items-center justify-center space-y-2"
                         :class="paymentMethod==='transfer' ? 'ring-2 ring-orange-500' : ''">
                    <input class="sr-only" type="radio" value="transfer" v-model="paymentMethod" />
                    <span class="text-2xl">🏦</span>
                    <div class="font-medium text-sm">{{ t('checkout.bankTransfer') }}</div>
                  </label>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <!-- RIGHT: Summary -->
      <aside class="lg:sticky lg:top-32 h-fit">
        <div class="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ t('cart.summary') }}</h2>

          <div v-if="loadingProduct" class="h-24 bg-gray-100 rounded animate-pulse"></div>
          <div v-else-if="productError" class="rounded border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            {{ productError }}
          </div>

          <div v-else-if="product" class="space-y-4">
            <div class="flex gap-3">
              <img :src="imageSrc" :alt="product.title" class="h-16 w-16 rounded object-cover border" />
              <div class="flex-1">
                <div class="text-md font-medium text-gray-900 line-clamp-2">{{ product.title }}</div>
                <div v-if="product.sku" class="text-sm text-green-700 text-bold">{{ t('cart.sku') }} {{ product.sku }}</div>
                <div class="mt-2 text-md text-gray-600">{{ t('product.quantity') }}: {{ qty }}</div>
              </div>
              <div class="text-md text-red-600 font-semibold">{{ formatMoney(unitPrice) }}</div>
            </div>

            <div class="border-t border-gray-100 pt-3 space-y-1 text-sm">
              <div class="flex justify-between"><span>{{ t('cart.unit') }}</span><span>{{ formatMoney(unitPrice) }}</span></div>
              <div class="flex justify-between"><span>{{ t('checkout.subtotal') }}</span><span>{{ formatMoney(lineTotal) }}</span></div>
              <div class="flex justify-between text-gray-700">
                <span>{{ t('checkout.shipping') }}</span><span>{{ formatMoney(displayedShipping) }}</span>
              </div>
              <div v-if="paymentFee > 0" class="flex justify-between text-gray-700">
                <span>{{ t('checkout.paymentSurcharge') }}</span><span>{{ formatMoney(paymentFee) }}</span>
              </div>
              <div class="flex justify-between text-lg font-semibold text-red-900 pt-1">
                <span>{{ t('checkout.total') }}</span><span>{{ formatMoney(grandTotal) }}</span>
              </div>
            </div>

            <div class="pt-2">
              <button
                type="button"
                class="w-full block rounded-xl bg-emerald-600 py-3 font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!canPlaceOrder"
                @click="handlePlaceOrder"
              >
                {{ t('checkout.createOrder') }}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
