<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRuntimeConfig, useNuxtApp, definePageMeta } from '#imports'
import { useAlertStore } from '~/stores/alert'
import { computeUnitPrice } from '~/utils/pricing'
import { useCurrency } from '~/composables/useCurrency'

definePageMeta({ ssr: false })

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

const route = useRoute()
const { $customApi } = useNuxtApp()
const cfg = useRuntimeConfig()
const alerts = useAlertStore()
const { formatMoney } = useCurrency()

const pid   = computed(() => String(route.query.pid || ''))
const pslug = computed(() => String(route.query.pslug || ''))  // ✅ from product page
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
      // ✅ your API supports this
      await use(`/products/slug/${encodeURIComponent(pslug.value)}?include=images,table_price,discount`)
    } else {
      // fallbacks when only id is available
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

onMounted(async () => {
  await Promise.all([fetchProduct(), fetchCountries()])
  // If you want an initial country selected, set selectedCountryId.value here.
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- LEFT -->
      <section class="lg:col-span-2">
        <div class="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div class="p-6 border-b border-gray-100 flex items-center gap-3">
            <img src="/images/logo/techno-lock-desktop-logo.webp" alt="Logo" class="h-8" />
            <span class="text-sm text-gray-400">Buy Now</span>
          </div>

          <div class="p-6 space-y-6">
            <div>
              <div class="text-sm text-gray-600 mb-2">Paypal Express Checkout</div>
              <button type="button" class="w-full rounded-md border border-yellow-400 bg-yellow-400/90 px-4 py-3 font-semibold text-gray-900 hover:bg-yellow-400">
                PayPal
              </button>
            </div>

            <div class="relative h-px bg-gray-200"><span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-xs text-gray-500">OR</span></div>

            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="text-sm text-gray-600">Email</label>
                <input type="email" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="you@example.com" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-2">
                  <label class="text-sm text-gray-600">Country</label>
                  <select
                    v-model.number="selectedCountryId"
                    class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    :disabled="loadingProduct || countriesLoading || !!productError"
                  >
                    <option value="">{{ countriesLoading ? 'Loading…' : 'Select a country' }}</option>
                    <option v-for="c in countries" :key="c.id" :value="c.id">{{ nameOf(c) }}</option>
                  </select>
                  <p v-if="countriesError" class="text-xs text-red-600 mt-1">{{ countriesError }}</p>
                </div>

                <div>
                  <label class="text-sm text-gray-600">Qty</label>
                  <input type="number" min="1" v-model.number="qty" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </div>
              </div>

              <div class="mt-2">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-600">Shipping Method</span>
                  <button
                    type="button"
                    class="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                    :disabled="!product || !selectedCountryId || quoteLoading"
                    @click="fetchBuyNowQuote"
                  >
                    {{ quote ? 'Recalculate' : 'Calculate' }}
                  </button>
                </div>

                <div v-if="quoteLoading" class="h-20 rounded bg-gray-100 animate-pulse"></div>
                <div v-else-if="productError" class="rounded border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
                  {{ productError }}
                </div>
                <div v-else-if="!product" class="rounded border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
                  Loading product…
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
              </div>

              <div class="flex items-center justify-between pt-2">
                <button type="button" class="text-sm text-gray-600 hover:underline" @click="history.back()">Back</button>
                <button
                  type="button"
                  class="rounded-xl bg-orange-500 px-6 py-3 font-medium text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
                  :disabled="!quote || !selectedShipping"
                >
                  Continue to Shipping
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- RIGHT: Summary -->
      <aside>
        <div class="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

          <div v-if="loadingProduct" class="h-24 bg-gray-100 rounded animate-pulse"></div>
          <div v-else-if="productError" class="rounded border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            {{ productError }}
          </div>

          <div v-else-if="product" class="space-y-4">
            <div class="flex gap-3">
              <img :src="imageSrc" :alt="product.title" class="h-16 w-16 rounded object-cover border" />
              <div class="flex-1">
                <div class="text-sm font-medium text-gray-900 line-clamp-2">{{ product.title }}</div>
                <div v-if="product.sku" class="text-xs text-gray-500">SKU: {{ product.sku }}</div>
                <div class="mt-1 text-xs text-gray-500" v-if="serialFromQuery">Serial: {{ serialFromQuery }}</div>
                <div class="mt-2 text-sm text-gray-600">Qty: {{ qty }}</div>
              </div>
              <div class="text-sm font-semibold">{{ formatMoney(unitPrice) }}</div>
            </div>

            <div class="border-t border-gray-100 pt-3 space-y-1 text-sm">
              <div class="flex justify-between"><span>Product Price</span><span>{{ formatMoney(unitPrice) }}</span></div>
              <div class="flex justify-between"><span>Line</span><span>{{ formatMoney(lineTotal) }}</span></div>
              <div class="flex justify-between text-gray-500"><span>Shipping</span><span>{{ quote ? formatMoney(quote.summary.shipping) : '—' }}</span></div>
              <div class="flex justify-between font-semibold text-gray-900 pt-1"><span>Total</span><span>{{ quote ? formatMoney(quote.summary.total) : formatMoney(lineTotal) }}</span></div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
