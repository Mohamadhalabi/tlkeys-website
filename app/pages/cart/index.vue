<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useNuxtApp, useRuntimeConfig } from '#imports'
import { useCart } from '~/composables/useCart'
import { useAuth } from '~/composables/useAuth'
import { useAlertStore } from '~/stores/alert'
import { useCurrency } from '~/composables/useCurrency'
import type { PriceTableRow as TRow, ProductLike } from '~/utils/pricing'
import { computeUnitPrice as priceCalc } from '~/utils/pricing'

type Id = number | string
type BasePrices = { price?: number | null; regular_price?: number | null; sale_price?: number | null }

type CartRow = {
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
  price: number
  price_before?: number | null
}

const { $customApi } = useNuxtApp()
const config = useRuntimeConfig()
const API_BASE_URL = config.public.API_BASE_URL as string

const cart = useCart()
const alerts = useAlertStore()
const auth = useAuth()
const isAuthed = computed(() => Boolean(auth.token.value))
const { formatMoney } = useCurrency()

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
function asProductLike(row: CartRow): ProductLike {
  return {
    price: n(row.base.price) ?? 0,
    regular_price: n(row.base.regular_price),
    sale_price: n(row.base.sale_price),
    table_price: Array.isArray(row.table_price) ? row.table_price : null,
    discount_type: (row.discount_type === 'percent' || row.discount_type === 'fixed') ? row.discount_type : null,
    discount_value: n(row.discount_value) ?? null,
  }
}
function recalcRow(row: CartRow) {
  const withPromo = priceCalc(asProductLike(row), row.quantity)
  row.price = withPromo.unit

  const forcedBase =
    (typeof row.base.regular_price === 'number' && row.base.regular_price > 0)
      ? row.base.regular_price
      : (typeof row.base.price === 'number' ? row.base.price : 0)

  const pNoPromo: any = { ...asProductLike(row), discount_type: null, discount_value: null, sale_price: null, price: forcedBase }
  const { unit: unitNoPromo } = priceCalc(pNoPromo, row.quantity)
  row.price_before = unitNoPromo
}

/* loaders */
async function loadServerCart(): Promise<CartRow[]> {
  const r = await $customApi('/v2/cart', { method: 'GET' })
  const arr = (r?.data ?? r?.items ?? r) as any[]
  if (!Array.isArray(arr)) return []

  return arr.map(i => {
    const base: BasePrices = { price: n(i?.price), regular_price: n(i?.regular_price), sale_price: n(i?.sale_price) }
    const dtype = i?.discount?.type ?? i?.discount_type ?? null
    const dval  = i?.discount?.value ?? i?.discount_value ?? null

    const row: CartRow = {
      product_id: i.product_id ?? i.id,
      quantity: Number(i.quantity ?? 1),
      title: i.title ?? i.name,
      image: i.image ?? i.images?.[0]?.src,
      sku: i.sku,
      slug: i.slug,
      table_price: Array.isArray(i?.table_price) ? i.table_price : null,
      base,
      discount_type: (dtype === 'fixed' || dtype === 'percent') ? dtype : null,
      discount_value: n(dval),
      price: 0
    }
    recalcRow(row)
    return row
  })
}
async function loadGuestCart(): Promise<CartRow[]> {
  const snaps = (cart.guestItems?.value || []) as any[]
  return snaps.map(s => {
    const base: BasePrices = { price: n(s?.price), regular_price: n(s?.regular_price), sale_price: n(s?.sale_price) }
    const row: CartRow = {
      product_id: s.product_id,
      quantity: Number(s.quantity ?? 1),
      title: s.title,
      image: s.image,
      sku: s.sku,
      slug: s.slug,
      table_price: Array.isArray(s?.table_price) ? s.table_price : null,
      base,
      discount_type: (s?.discount_type === 'fixed' || s?.discount_type === 'percent') ? s.discount_type : null,
      discount_value: n(s?.discount_value),
      price: 0
    }
    recalcRow(row)
    return row
  })
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
const subtotal = computed(() => rows.value.reduce((sum, r) => sum + (r.price || 0) * Number(r.quantity || 0), 0))
async function inc(row: CartRow) { await setQty(row, Number(row.quantity) + 1) }
async function dec(row: CartRow) { await setQty(row, Math.max(1, Number(row.quantity) - 1)) }
async function setQty(row: CartRow, qty: number) {
  row.quantity = qty
  recalcRow(row)
  try {
    await cart.setQuantity(row.product_id, qty)
  } catch (e: any) {
    alerts.showAlert({ type: 'error', title: 'Cart update failed', message: e?.message || 'Try again.' })
    await load()
  }
}
async function removeRow(row: CartRow) {
  const id = row.product_id
  rows.value = rows.value.filter(r => r.product_id !== id)
  try {
    await cart.remove(id)
    alerts.showAlert({ type: 'info', title: 'Removed from Cart', image: row.image, sku: row.sku })
    if (rows.value.length === 0) await load()
  } catch (e: any) {
    alerts.showAlert({ type: 'error', title: 'Remove failed', message: e?.message || 'Try again.' })
    await load()
  }
}
async function clearAll() {
  if (clearing.value) return
  if (!window.confirm('Clear all items from your cart?')) return
  clearing.value = true
  try {
    await cart.clear()
    rows.value = []
    alerts.showAlert({ type: 'info', title: 'Cart cleared' })
  } catch (e: any) {
    alerts.showAlert({ type: 'error', title: 'Clear cart failed', message: e?.message || 'Try again.' })
    await load()
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">Your Cart</h1>
      <button
        v-if="rows.length"
        type="button"
        class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        :disabled="clearing"
        @click="clearAll"
      >
        {{ clearing ? 'Clearing…' : 'Clear Cart' }}
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div class="h-20 bg-gray-100 rounded-xl animate-pulse" />
      <div class="h-20 bg-gray-100 rounded-xl animate-pulse" />
      <div class="h-20 bg-gray-100 rounded-xl animate-pulse" />
    </div>

    <div v-else-if="!rows.length" class="rounded-2xl border border-gray-200 p-8 text-center bg-white">
      <p class="text-gray-600">Your cart is empty.</p>
      <NuxtLinkLocale to="/" class="mt-3 inline-block px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700">
        Continue Shopping
      </NuxtLinkLocale>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Items -->
      <div class="lg:col-span-2 space-y-3">
        <div
          v-for="row in rows"
          :key="String(row.product_id)"
          class="flex items-center gap-4 p-4 rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <img :src="row.image || '/images/placeholder.webp'" alt="" class="h-20 w-20 rounded-xl object-cover" />
          <div class="min-w-0 flex-1">
            <div class="flex items-start gap-2">
              <NuxtLinkLocale
                v-if="row.slug"
                :to="`/products/${row.slug}`"
                class="font-medium hover:underline truncate"
                >{{ row.title }}</NuxtLinkLocale>
              <div v-else class="font-medium truncate">{{ row.title }}</div>
              <button class="ms-auto text-gray-400 hover:text-gray-600" @click="removeRow(row)">✕</button>
            </div>

            <!-- SKU in green -->
            <p v-if="row.sku" class="text-xs font-medium text-green-600">SKU: {{ row.sku }}</p>

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

              <!-- Pricing (big red current price, gray strikethrough old) -->
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
                  Unit:
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
          <h2 class="font-semibold text-gray-900">Order Summary</h2>
          <div class="flex items-center justify-between text-lg">
            <span>Subtotal</span>
            <span class="text-red-600">{{ formatMoney(subtotal) }}</span>
          </div>
          <p class="text-xs text-gray-500">Shipping is calculated at checkout.</p>

          <!-- Auth-aware CTA -->
          <template v-if="isAuthed">
            <button
              type="button"
              class="w-full mt-2 px-5 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700"
            >
              Checkout
            </button>
          </template>
          <template v-else>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <NuxtLinkLocale
                to="/login"
                class="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 text-center hover:bg-gray-50"
              >Log in</NuxtLinkLocale>
              <NuxtLinkLocale
                to="/register"
                class="px-5 py-3 rounded-xl bg-red-600 text-white text-center font-medium hover:bg-red-700"
              >Register</NuxtLinkLocale>
            </div>
            <p class="text-xs text-gray-500 mt-1 text-center">
              Log in or create an account to checkout.
            </p>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>