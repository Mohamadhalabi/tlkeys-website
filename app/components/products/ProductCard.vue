<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCart } from '~/composables/useCart'
import { useCurrency } from '~/composables/useCurrency'
import { computeUnitPrice, type PriceTableRow as TRow } from '~/utils/pricing'

type Product = {
  id: number | string
  slug?: string
  name: string
  image: string
  price: number | string
  regular_price?: number | string | null
  sale_price?: number | string | null
  table_price?: TRow[] | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | string | null
  discount_start_date?: string | null
  discount_end_date?: string | null
  oldPrice?: number | null
  badgeText?: string | null
  href?: string
  sku?: string | null
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
const { formatMoney } = useCurrency()

const qty = ref(1)
const cardEl = ref<HTMLElement | null>(null)

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
const unit = computed(() => computeUnitPrice(asProductLike.value, qty.value).unit)

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
const discountAmount = computed(() => Math.max(0, unitBefore.value - unit.value))

/* ---------- animated OFF amount ---------- */
const offAnim = ref(0)
let rafId: number | null = null
function animateOff(to: number, duration = 900) {
  if (!hasDiscount.value) { offAnim.value = 0; return }
  const from = offAnim.value
  const start = performance.now()
  if (rafId) cancelAnimationFrame(rafId)
  const tick = (t: number) => {
    const p = Math.min(1, (t - start) / duration)
    const eased = 1 - Math.pow(1 - p, 3)
    offAnim.value = from + (to - from) * eased
    if (p < 1) rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

let visIO: IntersectionObserver | null = null

/* ---------------- discount timer ---------------- */
const endTs = computed<number | null>(() => {
  const d = props.product.discount_end_date
  const t = d ? Date.parse(d) : NaN
  return Number.isFinite(t) ? t : null
})
const now = ref(Date.now())
let tick: number | undefined

const remainingMs = computed(() => endTs.value ? Math.max(0, endTs.value - now.value) : 0)
const hasTimer = computed(() => !!endTs.value && remainingMs.value > 0)

function parts(ms: number) {
  const s = Math.floor(ms / 1000)
  const days = Math.floor(s / 86400)
  const hrs = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  return { days, hrs, mins, secs }
}
const countdownTop = computed(() => 'DISCOUNT ENDS IN')
const countdownBottom = computed(() => {
  const { days, hrs, mins, secs } = parts(remainingMs.value)
  const hms = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  return days > 0 ? `${days} DAYS, ${hms}` : hms
})

onMounted(() => {
  tick = window.setInterval(() => { now.value = Date.now() }, 1000)

  visIO = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) animateOff(discountAmount.value)
  }, { threshold: 0.35 })
  if (cardEl.value) visIO.observe(cardEl.value)
})
onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (visIO && cardEl.value) visIO.unobserve(cardEl.value)
  if (tick) window.clearInterval(tick)
})
watch(discountAmount, (v) => animateOff(v))

/* ---------------- links ---------------- */
const linkTo = computed(() => props.product.href ?? `/products/${props.product.slug ?? props.product.id}`)

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
    priceSnapshot: unit.value
  })
}
</script>

<template>
  <div
    ref="cardEl"
    class="group h-full rounded-xl bg-white ring-1 ring-black/5 shadow-sm hover:shadow-md transition
           overflow-hidden flex flex-col"
  >
    <!-- IMAGE -->
    <NuxtLinkLocale :to="linkTo" class="relative block rounded-t-xl overflow-hidden bg-white">
      <div class="relative w-full aspect-[3/3]">
        <NuxtImg
          :src="product.image"
          :alt="product.name"
          loading="lazy"
          class="absolute inset-0 h-full w-full object-cover
                 filter drop-shadow-md md:drop-shadow-lg
                 transition-[filter] duration-300 group-hover:drop-shadow-xl"
        />
        <div class="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"></div>
      </div>

      <!-- badges -->
      <div class="absolute left-3 top-3 flex flex-col gap-1">
        <span
          v-if="hasDiscount"
          class="inline-flex items-center rounded-full bg-red-600 text-white ring-1 ring-white/70
                 px-2.5 py-1 text-[10px] font-extrabold tracking-wide shadow-sm"
        >
          {{ formatMoney(Number(offAnim.toFixed(2))) }} OFF
        </span>
        <span
          v-if="product.badgeText"
          class="inline-flex items-center rounded-full bg-green-100 text-green-800
                 ring-1 ring-green-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
        >
          {{ product.badgeText }}
        </span>
      </div>

      <!-- countdown -->
      <div
        v-if="hasTimer"
        class="absolute inset-x-0 bottom-0 px-3 py-2 sm:py-3 text-white text-center
               bg-gradient-to-t from-slate-900/80 to-slate-900/10 backdrop-blur-[1px]"
      >
        <div class="text-[11px] sm:text-xs font-semibold tracking-wide opacity-95">
          {{ countdownTop }}
        </div>
        <div class="text-[12px] sm:text-sm font-extrabold tracking-wide">
          {{ countdownBottom }}
        </div>
      </div>
    </NuxtLinkLocale>

    <!-- BODY -->
    <div class="px-4 pb-4 flex flex-col grow">
      <!-- top content (grows) -->
      <div class="mt-2 flex-1">
        <div class="flex justify-center gap-1 text-[11px] leading-tight whitespace-nowrap overflow-hidden">
          <span v-if="product.sku" class="font-bold text-sm text-green-800 shrink-0">
            {{ product.sku }}
          </span>
        </div>

        <!-- title -->
        <NuxtLinkLocale
          :to="linkTo"
          :aria-label="product.name"
          class="block mt-1 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300"
        >
          <h3
            class="text-[13px] sm:text-[15px] font-semibold text-gray-900/90 group-hover:text-gray-900
                   leading-5 sm:leading-6 tracking-tight hyphens-auto break-words
                   line-clamp-4 min-h-[3.75rem]
                   transition-colors group-hover:underline underline-offset-2 decoration-slate-300"
          >
            {{ product.name }}
          </h3>
        </NuxtLinkLocale>
      </div>

      <!-- bottom footer (pinned) -->
      <div class="mt-auto pt-3 w-full flex flex-col items-stretch gap-2">
        <!-- PRICE pinned at bottom, above qty -->
        <div class="flex items-end gap-2">
          <div class="text-lg sm:text-xl font-extrabold text-red-600">
            {{ formatMoney(unit) }}
          </div>
          <div v-if="hasDiscount" class="text-sm text-gray-400 line-through">
            {{ formatMoney(unitBefore) }}
          </div>
        </div>

        <!-- Qty -->
        <div v-if="showAdd && showQty" class="w-full flex items-center justify-center gap-2">
          <button
            type="button"
            class="w-10 h-10 rounded-md ring-1 ring-black/10 text-gray-700 hover:bg-gray-50 text-base"
            @click="qty = Math.max(1, qty - 1)"
            aria-label="Decrease quantity"
          >–</button>

          <input
            v-model.number="qty"
            type="number"
            min="1"
            class="w-16 h-10 rounded-md ring-1 ring-black/10 text-center text-sm"
          />

          <button
            type="button"
            class="w-10 h-10 rounded-md ring-1 ring-black/10 text-gray-700 hover:bg-gray-50 text-base"
            @click="qty = qty + 1"
            aria-label="Increase quantity"
          >+</button>
        </div>

        <!-- Add to cart -->
        <button
          v-if="showAdd"
          type="button"
          class="inline-flex items-center justify-center
                 w-full px-2 py-3 rounded-lg bg-red-600 text-white text-sm font-bold
                 hover:bg-red-700 active:bg-red-800 transition shadow-md"
          @click="onAdd"
        >
          ADD TO CART
        </button>
      </div>
    </div>
  </div>
</template>
