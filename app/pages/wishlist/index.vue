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
  // snapshot + pricing inputs (keep all of these)
  price?: number | null
  regular_price?: number | null
  sale_price?: number | null
  table_price?: PriceTableRow[] | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | null
}

const { formatMoney } = useCurrency()
const { $customApi } = useNuxtApp()
const config = useRuntimeConfig()
const API_BASE_URL = config.public.API_BASE_URL as string

const wishlist = useWishlist()
const cart = useCart()
const alerts = useAlertStore()

const auth = useAuth()
const isAuthed = computed<boolean>(() => Boolean((auth as any)?.token?.value))

const loading = ref(true)
const rows = ref<WishRow[]>([])

/* ---------- helpers ---------- */
async function fetchProductsByIds(ids: Id[]) {
  if (!ids.length) return {}
  try {
    const bulkUrl = `${API_BASE_URL}/products/bulk?ids=${encodeURIComponent(ids.map(String).join(','))}`
    const r = await $customApi(bulkUrl)
    const list = (r?.data ?? r) as any[]
    const map: Record<string, any> = {}
    list?.forEach(p => { map[String(p.id)] = p })
    return map
  } catch {
    const out: Record<string, any> = {}
    for (const id of ids) {
      try {
        const r = await $customApi(`${API_BASE_URL}/products/${id}`)
        out[String(id)] = (r?.data ?? r)
      } catch { /* ignore */ }
    }
    return out
  }
}

async function loadServerWishlist(): Promise<WishRow[]> {
  // backend returns full rows (cart-like) OR just IDs; handle both
  const r = await $customApi('/v2/wishlist', { method: 'GET' })
  const data = r?.data ?? r

  if (Array.isArray(data) && data.length && (data[0]?.title || data[0]?.price != null)) {
    // already hydrated by backend
    return data.map((i: any) => ({
      product_id: i.product_id ?? i.id,
      title: i.title ?? i.name,
      image: i.image ?? i.images?.[0]?.src,
      sku: i.sku ?? null,
      price: Number(i.price ?? 0),
      regular_price: null,
      slug: i.slug
    }))
  }

  // fallback: hydrate by IDs
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
      price: Number(p.price ?? 0),
      regular_price: null,
      slug: p.slug
    }
  })
}

async function hydrateGuestWishlist(): Promise<WishRow[]> {
  // Use the guest snapshot exactly as it was stored by useWishlist()
  const list = (wishlist.guest?.value || [])
  return list.map(w => ({
    product_id: w.product_id,
    title: w.title,
    image: w.image,
    sku: w.sku,
    slug: (w as any).slug,

    price: typeof (w as any).price === 'number' ? (w as any).price : null,
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
  } finally {
    loading.value = false
  }
}

watch(() => wishlist.guest?.value, () => { if (!isAuthed.value) load() }, { deep: true })
onMounted(load)

function fmt(n?: number | null) { return formatMoney(n ?? 0) }

/* ---------- actions ---------- */
async function removeRow(row: WishRow) {
  const before = rows.value.slice()
  rows.value = rows.value.filter(r => String(r.product_id) !== String(row.product_id)) // optimistic
  try { await wishlist.remove(row.product_id, { title: row.title, image: row.image, sku: row.sku }) }
  catch { rows.value = before }
}

// pages/wishlist/index.vue — replace addRowToCart
async function addRowToCart(row: WishRow) {
  await cart.add(row.product_id, 1, {
    title: row.title,
    image: row.image,
    sku: row.sku,
    slug: row.slug,

    // Raw pricing inputs for computeUnitPrice()
    price: typeof row.regular_price === 'number'
            ? row.regular_price
            : (typeof row.price === 'number' ? row.price : 0),
    regular_price: typeof row.regular_price === 'number' ? row.regular_price : null,
    sale_price: typeof row.sale_price === 'number' ? row.sale_price : null,
    table_price: Array.isArray(row.table_price) ? row.table_price : null,
    discount_type: row.discount_type ?? null,
    discount_value: typeof row.discount_value === 'number' ? row.discount_value : null,

    // what the user saw on the wishlist card (display only)
    priceSnapshot: typeof row.price === 'number' ? row.price : undefined,
  })
}
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <h1 class="text-2xl font-semibold mb-6">Your Wishlist</h1>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-3">
      <div class="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      <div class="h-24 bg-gray-100 rounded-2xl animate-pulse" />
      <div class="h-24 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!rows.length" class="rounded-2xl border border-gray-200 p-8 text-center bg-white">
      <p class="text-gray-600">Your wishlist is empty.</p>
      <NuxtLink to="/" class="mt-3 inline-block px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700">
        Browse Products
      </NuxtLink>
    </div>

    <!-- Row list -->
    <ul v-else class="space-y-4">
      <li
        v-for="row in rows"
        :key="String(row.product_id)"
        class="group bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="p-4 md:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <!-- Image -->
          <NuxtLink
            v-if="row.slug"
            :to="`/products/${row.slug}`"
            class="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center"
          >
            <img :src="row.image || '/images/placeholder.webp'" alt="" class="max-h-full max-w-full object-contain" />
          </NuxtLink>
          <div
            v-else
            class="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center"
          >
            <img :src="row.image || '/images/placeholder.webp'" alt="" class="max-h-full max-w-full object-contain" />
          </div>

          <!-- Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start gap-3">
              <div class="min-w-0">
                <NuxtLink
                  v-if="row.slug"
                  :to="`/products/${row.slug}`"
                  class="font-medium text-gray-900 hover:underline line-clamp-2"
                >
                  {{ row.title }}
                </NuxtLink>
                <div v-else class="font-medium text-gray-900 line-clamp-2">{{ row.title }}</div>

                <p v-if="row.sku" class="mt-1 text-xs text-gray-500">SKU: {{ row.sku }}</p>
                <div class="mt-2 text-base font-semibold text-gray-900">
                  {{ fmt(row.price) }}
                </div>
              </div>

              <!-- Remove button (top-right on larger screens) -->
              <button
                class="ms-auto hidden sm:inline-flex p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 mt-auto mb-auto"
                @click="removeRow(row)"
                aria-label="Remove from wishlist"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 sm:ms-auto">
            <button
              type="button"
              class="px-5 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition shadow-sm"
              @click="addRowToCart(row)"
            >
              Add to Cart
            </button>

            <NuxtLink
              v-if="row.slug"
              :to="`/products/${row.slug}`"
              class="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Details
            </NuxtLink>

            <!-- Mobile remove button -->
            <button
              class="sm:hidden px-4 py-2.5 rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-50"
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
