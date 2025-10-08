<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useNuxtApp, useHead } from '#imports'
import { useCart } from '~/composables/useCart'
import { useAuth } from '~/composables/useAuth'
import { useAlertStore } from '~/stores/alert'
import { useCurrency } from '~/composables/useCurrency'
import type { PriceTableRow as TRow, ProductLike } from '~/utils/pricing'
import { computeUnitPrice as priceCalc } from '~/utils/pricing'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { $customApi } = useNuxtApp()

const cart   = useCart()
const alerts = useAlertStore()
const auth   = useAuth()
const isAuthed = computed(() => Boolean(auth.token.value))

// currency helpers: we will convert per-row into active currency for subtotal
const { formatMoney, convert, currency } = useCurrency()

const downloading = ref(false)
const loading = ref(true)
const rows = ref<CartRow[]>([])
const clearing = ref(false)

useHead({
  title: t('cart.title') + ' | Techno Lock Keys',
  meta: [
    { name: 'description', content: 'View and manage the items in your shopping cart. Update quantities, review prices, and proceed to checkout securely with Techno Lock Keys.' },
    { property: 'og:title', content: t('cart.title') },
    { property: 'og:description', content: 'Easily review your selected products, manage quantities, and proceed to a secure checkout.' }
  ]
})

type Id = number | string
type BasePrices = { price?: number | null; regular_price?: number | null; sale_price?: number | null }

type CartRow = {
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
  display_euro_price?: boolean
  euro_price?: number | null
}

/* ----------------- helpers ----------------- */

function n(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') {
    const v = Number(x.trim())
    return Number.isFinite(v) ? v : null
  }
  return null
}

const useEuroFor = (row: CartRow) =>
  !!row.display_euro_price && n(row.euro_price) != null

const formatRowMoney = (row: CartRow, amount: number | null | undefined) => {
  if (useEuroFor(row)) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' })
      .format(Number(amount || 0))
  }
  return formatMoney(Number(amount || 0)) // active site currency (e.g., USD)
}

/* ----------------- pricing ----------------- */
function asProductLike(row: CartRow): ProductLike {
  const snapshot = n(row.base.price) ?? 0
  if (row.locked) {
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
    discount_type: row.discount_type === 'percent' || row.discount_type === 'fixed' ? row.discount_type : null,
    discount_value: n(row.discount_value) ?? null,
  }
}

function recalcRow(row: CartRow) {
  // If product is flagged to display Euro and has a euro_price, pin the unit to that (no strike-through).
  if (useEuroFor(row)) {
    row.price = n(row.euro_price) || 0
    row.price_before = null
    return
  }
  const prodLike: ProductLike = asProductLike(row)
  const withPromo = priceCalc(prodLike, row.quantity)
  let unit = withPromo.unit

  // compute "no-promo" unit for strike-through
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

  // backstop: if helper didn’t apply active discount, apply here
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

/* ----------------- shortage helpers ----------------- */
const isShort = (row: CartRow) =>
  row.stock != null && Number(row.quantity || 0) > Number(row.stock || 0)

const hasAnyShortage = computed(() => rows.value.some(isShort))
const shortageSkus = computed(() =>
  rows.value.filter(isShort).map(r => r.sku).filter(Boolean) as string[]
)

function readCartArray(resp: any): any[] {
  // accept: [] | {items: []} | {data: []} | {data: {items: []}}
  const root = resp?.data ?? resp
  if (Array.isArray(root)) return root
  if (Array.isArray(root?.items)) return root.items
  if (Array.isArray(resp?.items)) return resp.items
  return []
}

// local merge (the one you had in useCart.ts isn't visible here)
function mergeByProductIdLocal(rows: any[]): any[] {
  const map = new Map<string, any>()
  for (const r of rows) {
    const pid = String(r.product_id ?? r.product?.id ?? r.id)
    const prev = map.get(pid)
    if (!prev) { map.set(pid, { ...r }); continue }
    // sum qty
    prev.quantity = Number(prev.quantity || 0) + Number(r.quantity || 0)
    // merge serials
    const a = Array.isArray(prev.serial_number) ? prev.serial_number : []
    const b = Array.isArray(r.serial_number) ? r.serial_number : []
    const set = new Set([...a, ...b].map(s => String(s || '').trim()).filter(Boolean))
    prev.serial_number = set.size ? Array.from(set) : null
    // keep EUR flag if any row has it
    if (r.display_euro_price) {
      prev.display_euro_price = r.display_euro_price
      prev.euro_price = r.euro_price
    }
  }
  return Array.from(map.values())
}
/* ----------------- loaders ----------------- */
async function loadServerCart(): Promise<CartRow[]> {
  const resp = await $customApi('/v2/cart', { method: 'GET' })
  const raw = readCartArray(resp)            // ← parse any shape
  if (!raw.length) return []                 // nothing on server

  const merged = mergeByProductIdLocal(raw)  // ← avoid dup lines

  return merged.map(i => {
    const lockedUnit = n(i?.locked_unit)
    const row: CartRow = {
      product_id: i.product_id ?? i.id,
      quantity: Number(i.quantity ?? 1),
      title: i.title ?? i.name,
      image: i.image ?? i.images?.[0]?.src,
      sku: i.sku,
      slug: i.slug,
      table_price: Array.isArray(i?.table_price) ? i.table_price : null,
      base: {
        price: lockedUnit ?? n(i?.price),
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
      stock: n(i?.stock ?? i?.available_quantity ?? i?.quantity_available ?? i?.inventory?.quantity),
      display_euro_price: Number(i?.display_euro_price ?? 0) === 1,
      euro_price: n(i?.euro_price),
    }
    recalcRow(row)
    return row
  })
}


async function loadGuestCart(): Promise<CartRow[]> {
  const snaps = (cart.guestItems?.value || []) as any[]
  return snaps.map(s => {
    const snapshot = n(s?.priceSnapshot) ?? n(s?.price)
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
        regular_price: n(s?.regular_price),
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
      // ✅ keep Euro display flags from guest cart
      display_euro_price: Number(s?.display_euro_price ?? 0) === 1 || s?.display_euro_price === true,
      euro_price: n(s?.euro_price),
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
      resp = await $customApi('/v2/cart/cart/pdf', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
        responseType: 'blob',
      })
    } else {
      const body = {
        items: rows.value.map(r => ({
          product_id: r.product_id,
          quantity: r.quantity,
          serial_number: r.serial_number ?? []
        }))
      }
      resp = await $customApi('/v2/cart/pdf/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
        body: JSON.stringify(body),
        responseType: 'blob',
      })
    }

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

/* ----------------- effects ----------------- */
watch(() => cart.guestItems?.value, () => { if (!isAuthed.value) load() }, { deep: true })
onMounted(load)

/* ----------------- actions + totals ----------------- */

// Subtotal in ACTIVE currency (e.g., USD). Each row total is converted if it’s EUR.
const subtotal = computed(() =>
  rows.value.reduce((sum, r) => {
    const rowTotal = (r.price || 0) * Number(r.quantity || 0)
    const fromCode = useEuroFor(r) ? 'EUR' : 'USD'
    return sum + convert(rowTotal, fromCode as any, currency.value as any)
  }, 0)
)

const formatSubtotal = (amount: number) => formatMoney(amount)

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
  const qty = Number(row.quantity || 1)
  rows.value = rows.value.filter(r => r.product_id !== id)
  try {
    await cart.remove(id, qty)
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
    <!-- Header row: title left, actions grouped right -->
    <div class="mb-4 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">{{ t('cart.title') }}</h1>

      <div class="flex items-center gap-2">
        <button
          v-if="rows.length"
          type="button"
          class="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          :disabled="clearing"
          @click="clearAll"
        >
          {{ clearing ? t('cart.clearing') : t('cart.clear') }}
        </button>


        <div v-if="rows.length" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-white disabled:opacity-60"@click="downloadPdf">
          <svg id='PDF_48' width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'><rect width='48' height='48' stroke='none' fill='#000000' opacity='0'/>
          <g transform="matrix(0.92 0 0 0.92 24 24)" >
          <g style="" >
          <g transform="matrix(1 0 0 1 0 0)" >
          <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,87,34); fill-rule: nonzero; opacity: 1;" transform=" translate(-24, -24)" d="M 40 45 L 8 45 L 8 3 L 30 3 L 40 13 z" stroke-linecap="round" />
          </g>
          <g transform="matrix(1 0 0 1 9.75 -14.75)" >
          <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(251,233,231); fill-rule: nonzero; opacity: 1;" transform=" translate(-33.75, -9.25)" d="M 38.5 14 L 29 14 L 29 4.5 z" stroke-linecap="round" />
          </g>
          <g transform="matrix(1 0 0 1 0.49 4.02)" >
          <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,235,238); fill-rule: nonzero; opacity: 1;" transform=" translate(-24.49, -28.02)" d="M 15.81 29.5 L 15.81 33 L 13.8 33 L 13.8 23.047 L 17.191000000000003 23.047 C 18.175000000000004 23.047 18.961000000000002 23.353 19.546000000000003 23.963 C 20.131000000000004 24.573 20.424000000000003 25.366 20.424000000000003 26.342000000000002 C 20.424000000000003 27.318000000000005 20.134000000000004 28.087000000000003 19.556000000000004 28.653000000000002 C 18.978000000000005 29.219 18.175 29.5 17.149 29.5 L 15.81 29.5 z M 15.81 27.825 L 17.191 27.825 C 17.573999999999998 27.825 17.869999999999997 27.7 18.08 27.448999999999998 C 18.29 27.197999999999997 18.394 26.834 18.394 26.354999999999997 C 18.394 25.857999999999997 18.287 25.462999999999997 18.072999999999997 25.167999999999996 C 17.858999999999998 24.874999999999996 17.571999999999996 24.725999999999996 17.211999999999996 24.720999999999997 L 15.81 24.720999999999997 L 15.81 27.825 z M 21.764 33 L 21.764 23.047 L 24.396 23.047 C 25.558 23.047 26.485 23.416 27.174 24.154 C 27.865 24.892 28.217 25.904 28.230999999999998 27.189 L 28.230999999999998 28.802 C 28.230999999999998 30.11 27.884999999999998 31.137 27.195999999999998 31.881 C 26.504 32.628 25.553 33 24.341 33 L 21.764 33 z M 23.773 24.722 L 23.773 31.332 L 24.375 31.332 C 25.045 31.332 25.517 31.155 25.79 30.802 C 26.063 30.448999999999998 26.207 29.84 26.221 28.974 L 26.221 27.245 C 26.221 26.315 26.091 25.667 25.831 25.301000000000002 C 25.570999999999998 24.934 25.128999999999998 24.741000000000003 24.505 24.723000000000003 L 23.773 24.723000000000003 z M 34.807 28.939 L 31.683000000000003 28.939 L 31.683000000000003 33 L 29.673000000000002 33 L 29.673000000000002 23.047 L 35.183 23.047 L 35.183 24.722 L 31.683 24.722 L 31.683 27.272000000000002 L 34.807 27.272000000000002 L 34.807 28.939 z" stroke-linecap="round" />
          </g>
          </g>
          </g>
          </svg>
        </div>
      </div>
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
              >{{ row.title }}</NuxtLinkLocale>
              <div v-else class="font-medium truncate">{{ row.title }}</div>
              <button class="ms-auto text-gray-400 hover:text-gray-600" @click="removeRow(row)">✕</button>
            </div>

            <p v-if="row.sku" class="text-md font-medium text-green-700">
              {{ t('cart.sku') }} {{ row.sku }}
            </p>
            <p v-if="row.serial_number?.length" class="text-md text-red-700 text-gray-600">
              {{ t('cart.serial_number') }}:
              <span class="font-medium">{{ row.serial_number.join(', ') }}</span>
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

              <div class="ms-auto text-right">
                <div class="text-2xl font-extrabold text-red-600">
                  {{ formatRowMoney(row, (row.price || 0) * (row.quantity || 1)) }}
                </div>

                <div v-if="row.price_before != null && row.price_before > (row.price || 0)"
                    class="text-sm text-gray-500 line-through">
                  {{ formatRowMoney(row, (row.price_before || 0) * (row.quantity || 1)) }}
                </div>

                <div class="text-xs">
                  {{ t('cart.unit') }}
                  <span v-if="row.price_before != null && row.price_before > (row.price || 0)"
                        class="line-through text-gray-400 mr-1">
                    {{ formatRowMoney(row, row.price_before || 0) }}
                  </span>
                  <span class="font-semibold text-red-600">
                    {{ formatRowMoney(row, row.price || 0) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
    <aside class="lg:col-span-1 lg:sticky lg:top-32 self-start">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 class="font-semibold text-gray-900">{{ t('cart.summary') }}</h2>

          <div v-if="hasAnyShortage" class="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
            <strong class="block mb-1">{{ t('cart.limitedAvailability') }}</strong>
            <span>{{ t('cart.shortNote', { sku: shortageSkus.join(', ') }) }}</span>
          </div>

          <div class="flex items-center justify-between text-lg">
            <span>{{ t('cart.subtotal') }}</span>
            <span class="text-red-600">{{ formatSubtotal(subtotal) }}</span>
          </div>
          <p class="text-xs text-gray-500">{{ t('cart.shippingNote') }}</p>

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
