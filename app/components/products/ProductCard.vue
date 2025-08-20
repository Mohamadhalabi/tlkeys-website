<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCart } from '~/composables/useCart'
import { computeUnitPrice, type PriceTableRow as TRow } from '~/utils/pricing'

type Product = {
  id: number | string
  slug?: string
  name: string
  image: string

  // pricing inputs
  price: number | string
  regular_price?: number | string | null
  sale_price?: number | string | null
  table_price?: TRow[] | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | string | null

  // OPTIONAL timer fields for discounts
  discount_start_date?: string | null
  discount_end_date?: string | null

  // misc
  oldPrice?: number | null
  badgeText?: string | null
  href?: string
  sku?: string | null
  category?: string | null
  categorySlug?: string | null
}

const props = withDefaults(defineProps<{
  product: Product
  showRewards?: boolean
  showQty?: boolean
  showAdd?: boolean
}>(), {
  showRewards: true,
  showQty: true,
  showAdd: true
})

const cart = useCart()
const qty = ref(1)

/* ---------------- helpers ---------------- */
const n = (x: unknown): number | null => {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') {
    const v = Number(x.trim())
    return Number.isFinite(v) ? v : null
  }
  return null
}

const asProductLike = computed(() => ({
  price: n(props.product.sale_price) ?? n(props.product.price) ?? n(props.product.regular_price) ?? 0,
  regular_price: n(props.product.regular_price),
  sale_price: n(props.product.sale_price),
  table_price: Array.isArray(props.product.table_price) ? props.product.table_price : null,
  discount_type: (props.product.discount_type === 'percent' || props.product.discount_type === 'fixed')
    ? props.product.discount_type : null,
  discount_value: n(props.product.discount_value),
}))

/* ---------------- prices for display ---------------- */
// current unit (tiers win; sale/discount applied)
const unit = computed(() => computeUnitPrice(asProductLike.value, qty.value).unit)

// "before" unit: ignore sale & discount, and force base to regular if present
const unitBefore = computed(() => {
  const forcedBase =
    (typeof props.product.regular_price === 'number' && props.product.regular_price > 0)
      ? (props.product.regular_price as number)
      : (n(props.product.regular_price) ?? n(props.product.price) ?? 0)

  const pNoPromo: any = {
    ...asProductLike.value,
    discount_type: null,
    discount_value: null,
    sale_price: null,
    price: forcedBase,
    table_price: Array.isArray(props.product.table_price)
      ? props.product.table_price.map(r => ({ ...r, sale_price: null }))
      : null,
  }
  return computeUnitPrice(pNoPromo, qty.value).unit
})

const hasDiscount = computed(() => unitBefore.value > unit.value)

/* ---------------- discount timer ---------------- */
const endTs = computed<number | null>(() => {
  const d = props.product.discount_end_date
  const t = d ? Date.parse(d) : NaN
  return Number.isFinite(t) ? t : null
})
const now = ref(Date.now())
let tick: number | undefined

onMounted(() => {
  tick = window.setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => { if (tick) window.clearInterval(tick) })

const remainingMs = computed(() =>
  endTs.value ? Math.max(0, endTs.value - now.value) : 0
)
const hasTimer = computed(() => !!endTs.value && remainingMs.value > 0)

function fmt(ms: number) {
  const s = Math.floor(ms / 1000)
  const days = Math.floor(s / 86400)
  const hrs = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (days > 0) return `${days}d ${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
}
const remainingText = computed(() => fmt(remainingMs.value))

/* ---------------- links ---------------- */
const linkTo = computed(() => props.product.href ?? `/p/${props.product.slug ?? props.product.id}`)
const categoryLink = computed(() =>
  props.product.categorySlug
    ? `/${props.product.categorySlug}`
    : (props.product.category ? `/${encodeURIComponent(props.product.category)}` : '#')
)

/* ---------------- actions ---------------- */
async function onAdd() {
  const p = props.product
  await cart.add(p.id, qty.value, {
    title: p.name,
    image: p.image,
    sku: p.sku || undefined,
    slug: p.slug,

    price: n(p.price) ?? 0,
    regular_price: n(p.regular_price),
    sale_price: n(p.sale_price),
    table_price: Array.isArray(p.table_price) ? p.table_price : null,
    discount_type: (p.discount_type === 'fixed' || p.discount_type === 'percent') ? p.discount_type : null,
    discount_value: n(p.discount_value),

    // snapshot of the unit price at the moment of adding (purely display)
    priceSnapshot: unit.value
  })
}
</script>

<template>
  <div
    class="group rounded-xl bg-white ring-1 ring-black/5 shadow-sm hover:shadow-md transition
           overflow-hidden flex flex-col">
    <!-- image -->
    <NuxtLink :to="linkTo" class="relative block bg-white">
      <NuxtImg
        :src="product.image"
        :alt="product.name"
        class="w-full h-[220px] object-contain p-6"
        loading="lazy"
      />
      <span
        v-if="product.badgeText"
        class="absolute left-3 top-3 text-[10px] font-bold uppercase tracking-wide
               px-2 py-1 rounded bg-green-100 text-green-700 ring-1 ring-green-200">
        {{ product.badgeText }}
      </span>

      <!-- discount timer badge (top-right on image) -->
      <span
        v-if="hasTimer"
        class="absolute right-3 top-3 text-[10px] font-bold tracking-wide
              px-2 py-1 rounded bg-red-100 text-red-700 ring-1 ring-red-200"
        title="Discount ends"
      >
        Ends in {{ remainingText }}
      </span> 
    </NuxtLink>

    <!-- body -->
    <div class="px-4 pb-4">
      <!-- Category (linked) & SKU -->
      <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-tight">
        <NuxtLink
          v-if="product.category"
          :to="categoryLink"
          class="uppercase tracking-wide text-gray-600 hover:underline"
        >
          {{ product.category }}
        </NuxtLink>
        <span v-if="product.sku" class="font-bold text-green-800">
          • {{ product.sku }}
        </span>
      </div>

      <!-- title -->
      <NuxtLink :to="linkTo" class="block min-h-[44px] mt-1">
        <h3 class="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:underline">
          {{ product.name }}
        </h3>
      </NuxtLink>

      <!-- price row -->
      <div class="mt-2 flex items-end gap-2">
        <div class="text-[15px] font-extrabold text-red-600">
          ${{ unit.toFixed(2) }}
        </div>
        <div v-if="hasDiscount" class="text-xs text-gray-400 line-through">
          ${{ unitBefore.toFixed(2) }}
        </div>
      </div>

      <!-- actions -->
      <div
        v-if="showAdd"
        class="mt-3 flex flex-nowrap items-center gap-2 min-w-0 whitespace-nowrap"
      >
        <button
          type="button"
          class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 md:px-5 md:py-3
                 rounded-lg bg-red-600 text-white text-xs md:text-sm font-bold
                 hover:bg-red-700 active:bg-red-800 transition shadow-md"
          @click="onAdd"
        >
          ADD TO CART
        </button>

        <div v-if="showQty" class="ml-auto flex items-center gap-1 shrink-0">
          <button
            type="button"
            class="w-6 h-6 rounded-md ring-1 ring-black/10 text-gray-700 hover:bg-gray-50 text-xs"
            @click="qty = Math.max(1, qty - 1)"
          >–</button>
          <input
            v-model.number="qty"
            type="number"
            min="1"
            class="w-10 h-6 rounded-md ring-1 ring-black/10 text-center text-xs"
          />
          <button
            type="button"
            class="w-6 h-6 rounded-md ring-1 ring-black/10 text-gray-700 hover:bg-gray-50 text-xs"
            @click="qty = qty + 1"
          >+</button>
        </div>
      </div>
    </div>
  </div>
</template>
