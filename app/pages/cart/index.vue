<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useNuxtApp, useHead } from '#imports'  // ⬅️ add useHead
import { useCart } from '~/composables/useCart'
import { useAuth } from '~/composables/useAuth'
import { useAlertStore } from '~/stores/alert'
import { useCurrency } from '~/composables/useCurrency'
import type { PriceTableRow as TRow, ProductLike } from '~/utils/pricing'
import { computeUnitPrice as priceCalc } from '~/utils/pricing'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { $customApi } = useNuxtApp()

const cart = useCart()
const alerts = useAlertStore()
const auth = useAuth()
const isAuthed = computed(() => Boolean(auth.token.value))
const { formatMoney } = useCurrency()
const downloading = ref(false)

useHead({
  title: t('cart.title') + ' | Techno Lock Keys', // dynamic i18n title
  meta: [
    {
      name: 'description',
      content: 'View and manage the items in your shopping cart. Update quantities, review prices, and proceed to checkout securely with Techno Lock Keys.'
    },
    {
      property: 'og:title',
      content: t('cart.title')
    },
    {
      property: 'og:description',
      content: 'Easily review your selected products, manage quantities, and proceed to a secure checkout.'
    }
  ]
})
type Id = number | string
type BasePrices = { price?: number | null; regular_price?: number | null; sale_price?: number | null }

type CartRow = {
  /** Final unit price already decided (PDP snapshot or server lock). */
  locked?: boolean
  product_id: Id
  quantity: number
  title?: string
  image?: string
  sku?: string
  slug?: string
  base: BasePrices
  table_price?: TRow[] | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | null
  discount_start_date?: string | null
  discount_end_date?: string | null
  price: number
  price_before?: number | null
  stock?: number | null
  serial_number?: string[] | null
}

const loading = ref(true)
const rows = ref<CartRow[]>([])
const clearing = ref(false)

/* helpers */
function n(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') {
    const v = Number(x.trim())
    return Number.isFinite(v) ? v : null
  }
  return null
}

/** Build a ProductLike for the pricing helper. If the row is "locked",
 *  we must NOT pass any sale/discount/tier information — otherwise
 *  it would get discounted again. */
function asProductLike(row: CartRow): ProductLike {
  const snapshot = n(row.base.price) ?? 0

  if (row.locked) {
    // Lock SALES/DISCOUNTS only; allow tiers to recalc by qty
    return {
      price: snapshot,
      regular_price: null,
      sale_price: null,
      table_price: Array.isArray(row.table_price) ? row.table_price : null,
      discount_type: null,
      discount_value: null,
    }
  }

  return {
    price: n(row.base.price) ?? 0,
    regular_price: n(row.base.regular_price),
    sale_price: n(row.base.sale_price),
    table_price: Array.isArray(row.table_price) ? row.table_price : null,
    discount_type:
      row.discount_type === 'percent' || row.discount_type === 'fixed'
        ? row.discount_type
        : null,
    discount_value: n(row.discount_value) ?? null,
  }
}

function recalcRow(row: CartRow) {
  const prodLike: ProductLike = asProductLike(row)

  // A) Normal calculation (tiers/sales/discounts as provided by asProductLike)
  const withPromo = priceCalc(prodLike, row.quantity)
  let unit = withPromo.unit

  // B) Baseline without promos (for strike-through & comparison)
  const forcedBase =
    (typeof row.base.regular_price === 'number' && row.base.regular_price > 0)
      ? row.base.regular_price
      : (typeof row.base.price === 'number' ? row.base.price : 0)

  const pNoPromo: ProductLike = {
    ...prodLike,
    discount_type: null,
    discount_value: null,
    sale_price: null,
    price: forcedBase,
    table_price: Array.isArray(row.table_price)
      ? row.table_price.map(r => ({ ...r, sale_price: null as any }))
      : null,
  }
  const { unit: unitNoPromo } = priceCalc(pNoPromo, row.quantity)

  // C) Manual discount if helper didn’t apply (not expected when locked, but safe)
  const dtype = row.discount_type
  const dval  = Number(row.discount_value ?? 0)
  const hasActiveDiscount = (dtype === 'fixed' || dtype === 'percent') && dval > 0
  const helperDidNotApply = unit >= unitNoPromo - 1e-9
  if (hasActiveDiscount && helperDidNotApply) {
    if (dtype === 'fixed')   unit = Math.max(0, unit - dval)
    if (dtype === 'percent') unit = Math.max(0, unit * (1 - dval / 100))
  }

  row.price = unit
  row.price_before = unitNoPromo
}

/* NEW: shortage helpers */
const isShort = (row: CartRow) =>
  row.stock != null && Number(row.quantity || 0) > Number(row.stock || 0)

const hasAnyShortage = computed(() => rows.value.some(isShort))
const shortageSkus = computed(() =>
  rows.value
    .filter(isShort)
    .map(r => r.sku)
    .filter(Boolean) as string[]
)

/* loaders (server + guest) */
async function loadServerCart(): Promise<CartRow[]> {
  const r = await $customApi('/v2/cart', { method: 'GET' })
  const arr = (r?.data ?? r?.items ?? r) as any[]
  if (!Array.isArray(arr)) return []

  return arr.map(i => {
    const lockedUnit = n(i?.locked_unit) // if backend sent a locked final unit
    const row: CartRow = {
      product_id: i.product_id ?? i.id,
      quantity: Number(i.quantity ?? 1),
      title: i.title ?? i.name,
      image: i.image ?? i.images?.[0]?.src,
      sku: i.sku,
      slug: i.slug,
      table_price: Array.isArray(i?.table_price) ? i.table_price : null,
      base: {
        // prefer locked unit; otherwise server-calculated price
        price: lockedUnit ?? n(i?.price),
        // keep regular_price so we can show the original MSRP as strike-through
        regular_price: n(i?.regular_price),
        sale_price: n(i?.sale_price)
      },
      locked: lockedUnit != null,
      discount_type: (i?.discount?.type === 'fixed' || i?.discount?.type === 'percent')
        ? i.discount.type
        : (i?.discount_type === 'fixed' || i?.discount_type === 'percent') ? i.discount_type : null,
      discount_value: n(i?.discount?.value ?? i?.discount_value),
      discount_start_date: i?.discount?.start_date ?? i?.discount_start_date ?? null,
      discount_end_date:   i?.discount?.end_date   ?? i?.discount_end_date   ?? null,
      price: 0,
      serial_number: Array.isArray(i?.serial_number) ? i.serial_number : null,
      stock: n(i?.stock ?? i?.available_quantity ?? i?.quantity_available ?? i?.inventory?.quantity)
    }
    recalcRow(row)
    return row
  })
}

async function loadGuestCart(): Promise<CartRow[]> {
  const snaps = (cart.guestItems?.value || []) as any[]
  return snaps.map(s => {
    const snapshot = n(s?.priceSnapshot) ?? n(s?.price) // final unit calculated on PDP
    const row: CartRow = {
      product_id: s.product_id,
      quantity: Number(s.quantity ?? 1),
      title: s.title,
      image: s.image,
      sku: s.sku,
      slug: s.slug,
      table_price: Array.isArray(s?.table_price) ? s.table_price : null,
      base: {
        price: snapshot,
        // keep original regular (e.g., 210) so we can strike-through it
        regular_price: n(s?.regular_price),
        // ignore sale when using snapshot to avoid re-discount
        sale_price: null
      },
      locked: snapshot != null,
      discount_type: (s?.discount_type === 'fixed' || s?.discount_type === 'percent') ? s.discount_type : null,
      discount_value: n(s?.discount_value),
      discount_start_date: s?.discount_start_date ?? null,
      discount_end_date: s?.discount_end_date ?? null,
      price: 0,
      stock: n(s?.stock),
      serial_number: Array.isArray(s?.serial_number) ? s.serial_number : null,
    }
    recalcRow(row)
    return row
  })
}

async function downloadPdf() {
  if (!rows.value.length || downloading.value) return
  downloading.value = true
  try {
    const token = auth.token.value
    const fileName = `Cart-Quote_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`

    let resp: any
    if (token) {
      // Logged-in: GET /api/v2/cart/pdf
      resp = await $customApi('/v2/cart/cart/pdf', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
        responseType: 'blob',      // or: raw:true if your wrapper returns Response
      })
    } else {
      // Guest: POST snapshot to /api/v2/cart/pdf/guest
      const body = {
        items: rows.value.map(r => ({
          product_id: r.product_id,
          quantity: r.quantity,
          serial_number: r.serial_number ?? []
        }))
      }
      resp = await $customApi('/v2/cart/cart/pdf/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
        body: JSON.stringify(body),
        responseType: 'blob',      // or: raw:true
      })
    }

    // Normalize to Blob whether resp is Blob or Response
    const blob: Blob = resp instanceof Blob ? resp : await resp.blob?.()
    if (!(blob instanceof Blob)) throw new Error('Unexpected response')

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e:any) {
    alerts.showAlert({ type:'error', title:'PDF error', message: e?.message ?? 'Failed to generate PDF' })
  } finally {
    downloading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    rows.value = isAuthed.value ? await loadServerCart() : await loadGuestCart()
  } finally {
    loading.value = false
  }
}

/* effects */
watch(() => cart.guestItems?.value, () => { if (!isAuthed.value) load() }, { deep: true })
onMounted(load)

/* actions */
const subtotal = computed(() =>
  rows.value.reduce((sum, r) => sum + (r.price || 0) * Number(r.quantity || 0), 0)
)

async function inc(row: CartRow) { await setQty(row, Number(row.quantity) + 1) }
async function dec(row: CartRow) { await setQty(row, Math.max(1, Number(row.quantity) - 1)) }

async function setQty(row: CartRow, qty: number) {
  row.quantity = qty
  recalcRow(row)
  try {
    await cart.setQuantity(row.product_id, qty)
  } catch (e: any) {
    alerts.showAlert({ type: 'error', title: t('cart.alert.updateFailedTitle'), message: e?.message || t('common.tryAgain') })
    await load()
  }
}

async function removeRow(row: CartRow) {
  const id = row.product_id
  const qty = Number(row.quantity || 1)            // <— grab current qty
  rows.value = rows.value.filter(r => r.product_id !== id)
  try {
    await cart.remove(id, qty)                     // <— pass qtyHint
    alerts.showAlert({ type: 'info', title: t('cart.alert.removedTitle'), image: row.image, sku: row.sku })
    if (rows.value.length === 0) await load()
  } catch (e: any) {
    alerts.showAlert({ type: 'error', title: t('cart.alert.removeFailedTitle'), message: e?.message || t('common.tryAgain') })
    await load()
  }
}

async function clearAll() {
  if (clearing.value) return
  if (!window.confirm(t('cart.confirm.clearAll'))) return
  clearing.value = true
  try {
    await cart.clear()
    rows.value = []
    alerts.showAlert({ type: 'info', title: t('cart.alert.clearedTitle') })
  } catch (e: any) {
    alerts.showAlert({ type: 'error', title: t('cart.alert.clearFailedTitle'), message: e?.message || t('common.tryAgain') })
    await load()
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">{{ t('cart.title') }}</h1>
      <button
        v-if="rows.length"
        type="button"
        class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        :disabled="clearing"
        @click="clearAll"
      >
        {{ clearing ? t('cart.clearing') : t('cart.clear') }}
      </button>
      <button
        v-if="rows.length"
        type="button"
        class="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
        :disabled="downloading"
        @click="downloadPdf"
      >
        {{ downloading ? 'Preparing…' : 'Download PDF' }}
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div class="h-20 bg-gray-100 rounded-xl animate-pulse" />
      <div class="h-20 bg-gray-100 rounded-xl animate-pulse" />
      <div class="h-20 bg-gray-100 rounded-xl animate-pulse" />
    </div>

    <div v-else-if="!rows.length" class="rounded-2xl border border-gray-200 p-8 text-center bg-white">
      <p class="text-gray-600">{{ t('cart.empty') }}</p>
      <NuxtLinkLocale to="/" class="mt-3 inline-block px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700">
        {{ t('cart.continueShopping') }}
      </NuxtLinkLocale>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Items -->
      <div class="lg:col-span-2 space-y-3">
        <div
          v-for="row in rows"
          :key="String(row.product_id)"
          class="flex items-center gap-4 p-4 rounded-2xl border bg-white shadow-sm"
          :class="isShort(row) ? 'border-red-400 ring-1 ring-red-200/60' : 'border-gray-200'"
        >
          <NuxtImg :src="row.image || '/images/placeholder.webp'" alt="" class="h-20 w-20 rounded-xl object-cover" />
          <div class="min-w-0 flex-1 pl-5">
            <div class="flex items-start gap-2">
              <NuxtLinkLocale
                v-if="row.slug"
                :to="`/products/${row.slug}`"
                class="font-medium hover:underline truncate"
                >{{ row.title }}
              </NuxtLinkLocale>
              <div v-else class="font-medium truncate">{{ row.title }}</div>
              <button class="ms-auto text-gray-400 hover:text-gray-600" @click="removeRow(row)">✕</button>
            </div>

            <!-- SKU -->
            <p v-if="row.sku" class="text-md font-medium text-green-700">
              {{ t('cart.sku') }} {{ row.sku }}
            </p>
            <p v-if="row.serial_number?.length" class="text-md text-red-700 text-gray-600">
              {{ t('cart.serial_number') }}: <span class="font-medium">{{ row.serial_number.join(', ') }}</span>
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-4">
              <div class="inline-flex items-center rounded-xl border border-gray-300 overflow-hidden">
                <button type="button" class="px-3 py-2 hover:bg-gray-50" @click="dec(row)">−</button>
                <input
                  class="w-16 text-center py-2 outline-none"
                  type="number"
                  min="1"
                  v-model.number="row.quantity"
                  @change="setQty(row, Number(row.quantity || 1))"
                />
                <button type="button" class="px-3 py-2 hover:bg-gray-50" @click="inc(row)">+</button>
              </div>
              <!-- Pricing -->
              <div class="ms-auto text-right">
                <div class="text-2xl font-extrabold text-red-600">
                  {{ formatMoney((row.price || 0) * (row.quantity || 1)) }}
                </div>
                <div
                  v-if="row.price_before != null && row.price_before > (row.price || 0)"
                  class="text-sm text-gray-500 line-through"
                >
                  {{ formatMoney((row.price_before || 0) * (row.quantity || 1)) }}
                </div>
                <div class="text-xs">
                  {{ t('cart.unit') }}
                  <span
                    v-if="row.price_before != null && row.price_before > (row.price || 0)"
                    class="line-through text-gray-400 mr-1"
                  >
                    {{ formatMoney(row.price_before || 0) }}
                  </span>
                  <span class="font-semibold text-red-600">{{ formatMoney(row.price || 0) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <aside class="lg:col-span-1">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 class="font-semibold text-gray-900">{{ t('cart.summary') }}</h2>

          <div
            v-if="hasAnyShortage"
            class="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700"
          >
            <strong class="block mb-1">{{ t('cart.limitedAvailability') }}</strong>
            <span>
              {{ t('cart.shortNote', { sku: shortageSkus.join(', ') }) }}
            </span>
          </div>

          <div class="flex items-center justify-between text-lg">
            <span>{{ t('cart.subtotal') }}</span>
            <span class="text-red-600">{{ formatMoney(subtotal) }}</span>
          </div>
          <p class="text-xs text-gray-500">{{ t('cart.shippingNote') }}</p>

          <!-- Auth-aware CTA -->
          <template v-if="isAuthed">
            <NuxtLinkLocale
              to="/checkout"
              class="block w-full mt-2 px-5 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 text-center"
            >
              {{ t('cart.checkout') }}
            </NuxtLinkLocale>
          </template>

          <template v-else>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <NuxtLinkLocale
                to="/auth/login-register"
                class="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 text-center hover:bg-gray-50"
              >{{ t('auth.login.title') }}</NuxtLinkLocale>
              <NuxtLinkLocale
                to="/auth/login-register"
                class="px-5 py-3 rounded-xl bg-red-600 text-white text-center font-medium hover:bg-red-700"
              >{{ t('auth.register.title') }}</NuxtLinkLocale>
            </div>
            <p class="text-xs text-gray-500 mt-1 text-center">
              {{ t('cart.loginNotice') }}
            </p>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>
