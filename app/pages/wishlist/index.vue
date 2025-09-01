<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useNuxtApp, useRuntimeConfig } from '#imports'
import { useWishlist } from '~/composables/useWishlist'
import { useAuth } from '~/composables/useAuth'
import { useCart } from '~/composables/useCart'
import { useAlertStore } from '~/stores/alert'
import { useCurrency } from '~/composables/useCurrency'

type Id = number | string
type PriceTableRow = { min_qty: number; max_qty?: number | null; price: number; sale_price?: number | null }
type WishRow = {
  product_id: Id
  title?: string
  image?: string
  sku?: string
  slug?: string
  price?: number | null
  regular_price?: number | null
  sale_price?: number | null
  table_price?: PriceTableRow[] | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | null
}

const { formatMoney } = useCurrency()
const { $customApi } = useNuxtApp()
const API_BASE_URL = useRuntimeConfig().public.API_BASE_URL as string

const wishlist = useWishlist()
const cart = useCart()
const alerts = useAlertStore()
const auth = useAuth()

const isAuthed = computed<boolean>(() => Boolean((auth as any)?.token?.value))
const loading = ref(true)
const rows = ref<WishRow[]>([])

/* ----- helpers ----- */
async function fetchProductsByIds(ids: Id[]) {
  if (!ids.length) return {}
  try {
    const r = await $customApi(`${API_BASE_URL}/products/bulk?ids=${encodeURIComponent(ids.map(String).join(','))}`)
    const list = (r?.data ?? r) as any[]
    const map: Record<string, any> = {}
    list?.forEach(p => { map[String(p.id)] = p })
    return map
  } catch {
    const out: Record<string, any> = {}
    for (const id of ids) {
      try { const r = await $customApi(`${API_BASE_URL}/products/${id}`); out[String(id)] = (r?.data ?? r) } catch {}
    }
    return out
  }
}

async function loadServerWishlist(): Promise<WishRow[]> {
  const r = await $customApi('/v2/wishlist', { method: 'GET' })
  const data = r?.data ?? r

  // If backend returns hydrated rows, use them
  if (Array.isArray(data) && data.length && (data[0]?.title || data[0]?.price != null)) {
    return data.map((i: any) => ({
      product_id: i.product_id ?? i.id,
      title: i.title ?? i.name,
      image: i.image ?? i.images?.[0]?.src,
      sku: i.sku ?? null,
      slug: i.slug ?? null,
      price: typeof i.price === 'number' ? i.price : (i.price ? Number(i.price) : null),
      regular_price: typeof i.regular_price === 'number' ? i.regular_price : null,
      sale_price: typeof i.sale_price === 'number' ? i.sale_price : null,
    }))
  }

  // Otherwise hydrate by ids
  const ids: string[] = Array.isArray(data?.data)
    ? data.data.map((x: any) => String(x?.product_id ?? x?.id ?? x))
    : Array.isArray(data) ? data.map((x: any) => String(x?.product_id ?? x?.id ?? x)) : []

  if (!ids.length) return []
  const map = await fetchProductsByIds(ids)
  return ids.map((id) => {
    const p = map[id] || {}
    return {
      product_id: id,
      title: p.title ?? p.name ?? `#${id}`,
      image: p.image ?? p.images?.[0]?.src,
      sku: p.sku ?? null,
      slug: p.slug,
      price: typeof p.sale_price === 'number' ? p.sale_price : (typeof p.price === 'number' ? p.price : null),
      regular_price: typeof p.price === 'number' ? p.price : null,
      sale_price: typeof p.sale_price === 'number' ? p.sale_price : null,
    }
  })
}

async function hydrateGuestWishlist(): Promise<WishRow[]> {
  const list = (wishlist.guest?.value || [])
  return list.map(w => ({
    product_id: w.product_id,
    title: w.title, image: w.image, sku: w.sku, slug: (w as any).slug,
    price: typeof (w as any).sale_price === 'number'
      ? (w as any).sale_price
      : (typeof (w as any).price === 'number' ? (w as any).price : null),
    regular_price: typeof (w as any).regular_price === 'number' ? (w as any).regular_price : null,
    sale_price: typeof (w as any).sale_price === 'number' ? (w as any).sale_price : null,
    table_price: Array.isArray((w as any).table_price) ? (w as any).table_price as PriceTableRow[] : null,
    discount_type: (w as any).discount_type ?? null,
    discount_value: typeof (w as any).discount_value === 'number' ? (w as any).discount_value : null,
  }))
}

async function load() {
  loading.value = true
  try {
    rows.value = isAuthed.value ? await loadServerWishlist() : await hydrateGuestWishlist()
  } finally { loading.value = false }
}

watch(() => wishlist.guest?.value, () => { if (!isAuthed.value) load() }, { deep: true })
onMounted(load)

function priceView(row: WishRow) {
  const current =
    typeof row.sale_price === 'number' && row.sale_price > 0 ? row.sale_price :
    typeof row.price === 'number' ? row.price : 0
  const old =
    typeof row.sale_price === 'number' &&
    typeof row.price === 'number' &&
    row.price > row.sale_price ? row.price : null
  return { current, old }
}
const fmt = (n?: number | null) => formatMoney(n ?? 0)

/* ----- actions ----- */
async function removeRow(row: WishRow) {
  const before = rows.value.slice()
  rows.value = rows.value.filter(r => String(r.product_id) !== String(row.product_id))
  try { await wishlist.remove(row.product_id, { title: row.title, image: row.image, sku: row.sku }) }
  catch { rows.value = before }
}

async function addRowToCart(row: WishRow) {
  await cart.add(row.product_id, 1, {
    title: row.title, image: row.image, sku: row.sku, slug: row.slug,
    price: typeof row.regular_price === 'number' ? row.regular_price : (typeof row.price === 'number' ? row.price : 0),
    regular_price: typeof row.regular_price === 'number' ? row.regular_price : null,
    sale_price: typeof row.sale_price === 'number' ? row.sale_price : null,
    table_price: Array.isArray(row.table_price) ? row.table_price : null,
    discount_type: row.discount_type ?? null,
    discount_value: typeof row.discount_value === 'number' ? row.discount_value : null,
    priceSnapshot: typeof row.price === 'number' ? row.price : undefined,
  })
}

async function clearAll() {
  if (!rows.value.length) return
  if (!confirm('Clear your wishlist?')) return
  try {
    await wishlist.clear()
    rows.value = []
    alerts.showAlert({ type: 'info', title: 'Wishlist cleared' })
  } catch (e: any) {
    alerts.showAlert({ type: 'error', title: 'Could not clear wishlist', message: e?.message || 'Try again.' })
    await load()
  }
}
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <div class="mb-6 flex items-center gap-3">
      <h1 class="text-2xl font-semibold">Your Wishlist</h1>
      <button
        v-if="rows.length"
        type="button"
        class="ms-auto px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
        @click="clearAll"
      >
        Clear Wishlist
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-3">
      <div class="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      <div class="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      <div class="h-24 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!rows.length" class="rounded-2xl border border-gray-200 p-8 text-center bg-white">
      <p class="text-gray-600">Your wishlist is empty.</p>
      <NuxtLinkLocale to="/" class="mt-3 inline-block px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700">
        Browse Products
      </NuxtLinkLocale>
    </div>

    <!-- List -->
    <ul v-else class="space-y-4">
      <li
        v-for="row in rows"
        :key="String(row.product_id)"
        class="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <!-- Image -->
          <NuxtLinkLocale
            v-if="row.slug"
            :to="`/products/${row.slug}`"
            class="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center"
          >
            <img :src="row.image || '/images/placeholder.webp'" alt="" class="max-h-full max-w-full object-contain" />
          </NuxtLinkLocale>
          <div
            v-else
            class="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center"
          >
            <img :src="row.image || '/images/placeholder.webp'" alt="" class="max-h-full max-w-full object-contain" />
          </div>

          <!-- Details -->
          <div class="min-w-0 flex-1">
            <div class="flex items-start gap-3">
              <div class="min-w-0">
                <NuxtLinkLocale
                  v-if="row.slug"
                  :to="`/products/${row.slug}`"
                  class="font-medium text-gray-900 hover:underline line-clamp-2"
                >
                  {{ row.title }}
                </NuxtLinkLocale>
                <div v-else class="font-medium text-gray-900 line-clamp-2">{{ row.title }}</div>

                <p v-if="row.sku" class="mt-1 text-md font-medium text-green-600">
                  SKU: {{ row.sku }}
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="sm:ms-auto flex gap-3">
            <button
              type="button"
              class="px-5 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition shadow-sm"
              @click="addRowToCart(row)"
            >
              Add to Cart
            </button>

            <NuxtLinkLocale
              v-if="row.slug"
              :to="`/products/${row.slug}`"
              class="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Details
            </NuxtLinkLocale>

            <button
              type="button"
              class="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-50"
              @click="removeRow(row)"
            >
              Remove
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
