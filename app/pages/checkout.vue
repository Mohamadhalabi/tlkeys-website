<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n, useRouter, useNuxtApp, definePageMeta } from '#imports'

// If you want SSR, delete this and wrap the page with <ClientOnly>
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
  address?: string | null
  phone?: string | null
}
type ShippingOption = { key: 'dhl'|'fedex'|'aramex'|'ups'; label: string; price: number; disabled?: boolean }
type Quote = {
  products: QuoteProduct[]
  addresses: Address[]
  selected_address_id: number|null
  shipping: { options: ShippingOption[], selected: string|null, price: number }
  summary: { sub_total:number; discount:number; sub_after_coupon:number; shipping:number; total:number }
  weights: { total_weight_kg:number; zone_id:number|null }
}

/* ---------------- Setup ---------------- */
const { $customApi } = useNuxtApp()
const { t } = useI18n()
const router = useRouter()

/* ---------------- Helpers ---------------- */
const isString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const imgSrc = (v: unknown): string | null => (isString(v) ? v : null)
const money = (v: unknown): string => Number(v || 0).toFixed(2)

/* ---------------- State ---------------- */
const quote = ref<Quote | null>(null)
const loading = ref(false)

const coupon = ref<string>('')

const addresses = ref<Address[]>([])
const selectedAddressId = ref<number | null>(null)

const shippingOptions = computed<ShippingOption[]>(() => quote.value?.shipping?.options ?? [])
const selectedShipping = ref<string | null>(null)

const paymentMethod = ref<'card'|'paypal'|'transfer' | null>(null)
const acceptTerms = ref(false)

const shippingDisabled = computed(() => !selectedAddressId.value)
const paymentDisabled = computed(() => !selectedShipping.value)

const surchargePct = computed(() => (paymentMethod.value === 'card' || paymentMethod.value === 'paypal') ? 3 : 0)
const totalWithSurcharge = computed(() => {
  const base = quote.value?.summary?.total ?? 0
  return +(base * (1 + (surchargePct.value / 100))).toFixed(2)
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
      address: '',
      phone: '',
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
  // quote endpoint also returns addresses + selected id
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

    // keep local selections in sync on first load
    if (!selectedAddressId.value) selectedAddressId.value = res.selected_address_id ?? null
    if (!selectedShipping.value)  selectedShipping.value  = res.shipping?.selected ?? null
  } finally {
    loading.value = false
  }
}

async function saveAddress() {
  const body = { ...addressForm.value }
  if (!body.country_id || !body.address) {
    alert(t('checkout.countryAndAddressRequired') || 'Country and address are required.')
    return
  }

  let savedId: number | null = null

  if (isEditing.value) {
    await $customApi(`/addresses/${body.id}`, { method: 'PUT', body })
    savedId = Number(body.id)
  } else {
    const res = await $customApi<{ id: number }>(`/addresses`, { method: 'POST', body })
    // if your API returns the created address, grab its id; fallback refresh below
    savedId = (res as any)?.id ?? null
  }

  // If user ticked "Set as default", call the endpoint explicitly
  if (body.is_default && (savedId || body.id)) {
    const idToSet = Number(savedId || body.id)
    if (Number.isFinite(idToSet)) {
      await $customApi(`/addresses/${idToSet}/default`, { method: 'POST' })
      selectedAddressId.value = idToSet
    }
  }

  addressModalOpen.value = false
  await fetchAddresses()
  await fetchQuote()
}

async function deleteAddress(a: Address) {
  if (!confirm(t('checkout.deleteAddressConfirm') || 'Delete this address?')) return
  await $customApi(`/addresses/${a.id}`, { method: 'DELETE' })
  await fetchAddresses()
  if (selectedAddressId.value === a.id) {
    selectedAddressId.value = addresses.value[0]?.id ?? null
  }
  await fetchQuote()
}

async function createOrder() {
  if (!selectedAddressId.value) return alert(t('checkout.selectAddressFirst') || 'Please select an address')
  if (!selectedShipping.value)  return alert(t('checkout.selectShippingFirst') || 'Please choose a shipping method')
  if (!paymentMethod.value)     return alert(t('checkout.selectPaymentFirst') || 'Please select a payment method')
  if (!acceptTerms.value)       return alert(t('checkout.acceptTermsFirst') || 'Please accept Terms & Conditions')

  const res = await $customApi<any>('/checkout/orders', {
    method: 'POST',
    body: {
      address_id: selectedAddressId.value,
      shipping_method: selectedShipping.value,
      payment_method: paymentMethod.value,
      coupon: coupon.value || null
    }
  })

  if (paymentMethod.value === 'paypal' && res?.paypal_url) {
    window.location.href = res.paypal_url
  } else if (paymentMethod.value === 'card' && res?.card_url) {
    window.location.href = res.card_url
  } else {
    router.push({ path: '/complete-order', query: { orderId: res?.order?.order_id } })
  }
}

/* ---------------- Effects ---------------- */
onMounted(async () => {
  await fetchAddresses()
  await fetchQuote()
})

watch(selectedAddressId, async () => {
  selectedShipping.value = null // zone may change
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
                    :disabled="!coupon" @click="fetchQuote">
              {{ $t('checkout.applyCoupon') }}
            </button>
          </div>
        </div>

        <!-- Step 1: Address -->
        <div class="rounded-2xl border p-4 bg-white shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              <!-- user icon -->
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10z"/><path fill-rule="evenodd" d="M2 20a8 8 0 1116 0v1H2v-1z" clip-rule="evenodd"/>
              </svg>
              {{ $t('checkout.addrress') }}
            </h3>
            <button class="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" @click="openAddressForm()">
              + {{ $t('checkout.addAddress') }}
            </button>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <label
              v-for="a in addresses"
              :key="a.id"
              class="rounded-xl border p-3 cursor-pointer flex gap-3 items-start transition ring-offset-2 bg-white hover:shadow-sm"
              :class="selectedAddressId === a.id ? 'ring-2 ring-emerald-500' : ''"
            >
              <input type="radio" class="mt-1" :value="a.id" v-model="selectedAddressId" />
              <div class="w-full">
                <div class="font-medium">
                  {{ a.country_name || '—' }} <span v-if="a.city">— {{ a.city }}</span>
                </div>
                <div class="text-sm text-gray-500 break-words">{{ a.address }}</div>
                <div class="text-sm text-gray-500">☎ {{ a.phone }}</div>
                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                  <span v-if="a.is_default" class="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200">
                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>{{ $t('checkout.default') }}
                  </span>
                  <button class="px-2 py-1 rounded border hover:bg-gray-50" @click.stop="openAddressForm(a)">{{ $t('edit') }}</button>
                  <button class="px-2 py-1 rounded border hover:bg-gray-50" @click.stop="deleteAddress(a)">{{ $t('delete') }}</button>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Step 2: Shipping -->
        <div class="rounded-2xl border p-4 bg-white shadow-sm" :class="shippingDisabled ? 'opacity-50 pointer-events-none' : ''">
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <!-- truck icon -->
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
              class="rounded-xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
              :class="selectedShipping === opt.key ? 'ring-2 ring-emerald-500' : ''"
            >
              <input type="radio" class="sr-only" :value="opt.key" v-model="selectedShipping" :disabled="opt.disabled" />
              <div class="flex items-center justify-center gap-2">
                <!-- tiny brand badges (icons) -->
                <span v-if="opt.key==='dhl'" class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">DHL</span>
                <span v-else-if="opt.key==='fedex'" class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">FEDEX</span>
                <span v-else-if="opt.key==='aramex'" class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 border border-red-200">ARAMEX</span>
                <span v-else class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">UPS</span>
              </div>
              <div class="uppercase text-[13px] mt-1">{{ opt.label }}</div>
              <div class="text-sm mt-0.5" v-if="!opt.disabled">{{ money(opt.price) }}</div>
              <div class="text-xs text-gray-400" v-else>—</div>
            </label>
          </div>
        </div>

        <!-- Step 3: Payment -->
        <div class="rounded-2xl border p-4 bg-white shadow-sm" :class="paymentDisabled ? 'opacity-50 pointer-events-none' : ''">
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <!-- card icon -->
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v2H2V6z"/>
              <path d="M2 10h20v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8zm3 5h6v2H5v-2z"/>
            </svg>
            {{ $t('checkout.paymentMethod') }}
          </h3>

          <div class="grid sm:grid-cols-3 gap-3">
            <label class="rounded-xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
                   :class="paymentMethod === 'card' ? 'ring-2 ring-emerald-500' : ''">
              <input class="sr-only" type="radio" value="card" v-model="paymentMethod" />
              <div class="flex items-center justify-center gap-2">
                <!-- credit card icon -->
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6a2 2 0 012-2h14a2 2 0 012 2v2H3V6z"/><path d="M3 10h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8zm2 5h6v2H5v-2z"/></svg>
                <span class="font-medium">{{ $t('checkout.payCard') }}</span>
              </div>
            </label>

            <label class="rounded-xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
                   :class="paymentMethod === 'paypal' ? 'ring-2 ring-emerald-500' : ''">
              <input class="sr-only" type="radio" value="paypal" v-model="paymentMethod" />
              <div class="flex items-center justify-center gap-2">
                <!-- paypal P icon -->
                <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-600 text-white text-xs font-bold">P</span>
                <span class="font-medium">PayPal</span>
              </div>
            </label>

            <label class="rounded-xl border p-3 cursor-pointer text-center transition ring-offset-2 bg-white hover:shadow-sm"
                   :class="paymentMethod === 'transfer' ? 'ring-2 ring-emerald-500' : ''">
              <input class="sr-only" type="radio" value="transfer" v-model="paymentMethod" />
              <div class="flex items-center justify-center gap-2">
                <!-- bank/transfer icon -->
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

      <!-- RIGHT: Order Summary (sticky) -->
      <aside class="lg:col-span-4">
        <div class="rounded-2xl border p-4 bg-white shadow-sm lg:sticky lg:top-6">
          <h3 class="text-lg font-semibold mb-3">{{ $t('checkout.yourOrder') }}</h3>

          <ul class="divide-y">
            <li
              v-for="row in quote?.products ?? []"
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
              <div class="text-sm text-red-600 font-semibold">{{ money(row.line) }}</div>
            </li>
          </ul>

          <div class="mt-4 space-y-1 text-sm">
            <div class="flex justify-between"><span>{{ $t('checkout.subtotal') }}</span><span>{{ money(quote?.summary?.sub_total) }}</span></div>
            <div v-if="quote?.summary?.discount" class="flex justify-between text-emerald-700">
              <span>{{ $t('checkout.coupon') }}</span><span>-{{ money(quote?.summary?.discount) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ $t('checkout.shipping') }} ({{ selectedShipping || '-' }})</span>
              <span>{{ money(quote?.summary?.shipping) }}</span>
            </div>
            <div class="flex justify-between font-medium pt-2 border-t">
              <span>{{ $t('checkout.total') }}</span><span>{{ money(quote?.summary?.total) }}</span>
            </div>
            <div v-if="surchargePct" class="flex justify-between text-rose-700">
              <span>{{ $t('checkout.paymentSurcharge') }} ({{ surchargePct }}%)</span>
              <span>{{ money(totalWithSurcharge - (quote?.summary?.total ?? 0)) }}</span>
            </div>
            <div class="flex justify-between font-semibold text-lg pt-1">
              <span>{{ $t('checkout.grandTotal') }}</span><span class="text-red-600 font-bold">{{ money(totalWithSurcharge) }}</span>
            </div>
          </div>

          <!-- Terms + Submit moved here (green) -->
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
              class="w-full mt-3 rounded-xl bg-orange-500 text-white px-6 py-3 font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              :disabled="!selectedAddressId || !selectedShipping || !paymentMethod || !acceptTerms || loading"
              @click="createOrder"
            >
              {{ $t('checkout.createOrder') }}
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

    <!-- Address Modal (smaller, scrollable, includes "Set as default") -->
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
            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.countryId') }}</label>
              <input v-model.number="addressForm.country_id" type="number" class="w-full rounded-xl border px-3 py-2" required />
            </div>
            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.city') }}</label>
              <input v-model="addressForm.city" type="text" class="w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.address') }}</label>
              <textarea v-model="addressForm.address" rows="3" class="w-full rounded-xl border px-3 py-2" required></textarea>
            </div>
            <div>
              <label class="text-sm block mb-1">{{ $t('checkout.phone') }}</label>
              <input v-model="addressForm.phone" type="text" class="w-full rounded-xl border px-3 py-2" />
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
