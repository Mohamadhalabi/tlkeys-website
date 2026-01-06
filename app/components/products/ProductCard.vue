<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCart } from '~/composables/useCart'
import { useCurrency } from '~/composables/useCurrency'
import { useRuntimeConfig, useI18n } from '#imports'
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
  display_euro_price: boolean
  euro_price: number | string
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | string | null
  discount_start_date?: string | null
  discount_end_date?: string | null
  oldPrice?: number | null
  stock?: number | null
  badgeText?: string | null
  href?: string
  sku?: string | null
  freeShipping?: boolean
  hide_price?: boolean
  requires_serial?: boolean
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

const { t: _t } = (useI18n?.() as any) || { t: (s:string)=>s }
const cart = useCart()
const { formatMoney } = useCurrency()
const runtime = useRuntimeConfig()
const WHATSAPP_NUMBER = (runtime.public.WHATSAPP_NUMBER as string) || '971504429045'

const qty = ref(1)
const cardEl = ref<HTMLElement | null>(null)

/* --- flags --- */
const hidePrice = computed(() => Boolean((props.product as any).hide_price))
const requiresSerial = computed(() => Boolean((props.product as any).requires_serial))

/* --- serial input --- */
const serial = ref('')
const canAdd = computed(() => !requiresSerial.value || serial.value.trim().length > 0)

/* --- WhatsApp link --- */
const waLink = computed(() => {
  const title = props.product.name || ''
  const sku = props.product.sku ? ` (SKU: ${props.product.sku})` : ''
  const msg = _t('search.askAboutProduct', 'Can I get more information and price for "{title}{sku}"?')
    .replace('{title}', title).replace('{sku}', sku)
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
})

/* helpers */
const n = (x: unknown): number | null => {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') {
    const v = Number(x.trim())
    return Number.isFinite(v) ? v : null
  }
  return null
}

// --- Euro override flags & formatter ---
const useEuro = computed(() => {
  // accept boolean or 0/1 from backend
  const flag = (props.product as any).display_euro_price
  const euro = n((props.product as any).euro_price)
  return !!flag && euro != null
})

const formatDisplayMoney = (amount: number | null | undefined) => {
  if (useEuro.value) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(amount || 0))
  }
  return formatMoney(amount) // your existing formatter
}

const asProductLike = computed(() => ({
  // ✅ base: price -> fallback to regular_price
  price: n(props.product.price) ?? n(props.product.regular_price) ?? 0,
  regular_price: n(props.product.regular_price),
  sale_price: n(props.product.sale_price),
  table_price: Array.isArray(props.product.table_price) ? props.product.table_price : null,
  discount_type: (props.product.discount_type === 'percent' || props.product.discount_type === 'fixed')
    ? props.product.discount_type : null,
  discount_value: n(props.product.discount_value),
}))

/* prices for display */
const unit = computed(() => {
  if (useEuro.value) {
    const base = n((props.product as any).euro_price) ?? 0
    const type = props.product.discount_type
    const val = n(props.product.discount_value)

    if (!type || !val || val <= 0) {
      // no discount, just show base euro price
      return base
    }

    if (type === 'fixed') {
      // fixed amount discount in EUR
      return Math.max(0, base - val)
    }

    if (type === 'percent') {
      // percentage discount on EUR price
      return Math.max(0, base * (1 - val / 100))
    }

    return base
  }

  return computeUnitPrice(asProductLike.value, qty.value).unit
})

const unitBefore = computed(() => {
  // when forcing EUR display, show base euro price as "before" if discount is active
  if (useEuro.value) {
    const base = n((props.product as any).euro_price)
    const type = props.product.discount_type
    const val = n(props.product.discount_value)

    if (!base || !type || !val || val <= 0) {
      return null
    }

    return base
  }

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

const hasDiscount = computed(() => !!unitBefore.value && unitBefore.value > unit.value)
const discountAmount = computed(() => {
  if (!hasDiscount.value) return 0
  return Math.max(0, (unitBefore.value || 0) - unit.value)
})

/* animated OFF amount */
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

/* discount timer (for card badge) */
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
const countdownTop = computed(() => _t('product.discountEndsIn', 'DISCOUNT ENDS IN'))
const countdownBottom = computed(() => {
  const { days, hrs, mins, secs } = parts(remainingMs.value)
  const hms = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  return days > 0 ? `${days} ${_t('common.days', 'DAYS')}, ${hms}` : hms
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

/* links */
const linkTo = computed(() => props.product.href ?? `/products/${props.product.slug ?? props.product.id}`)

/* actions */
async function onAdd() {
  if (requiresSerial.value && !serial.value.trim()) {
    const el = document.getElementById(`sn-${props.product.id}`)
    el?.classList.add('ring-rose-400')
    setTimeout(() => el?.classList.remove('ring-rose-400'), 600)
    return
  }

  const p = props.product
  await cart.add(p.id, qty.value, {
    title: p.name,
    image: p.image,
    sku: p.sku || undefined,
    slug: p.slug,
    price: unit.value,
    stock: p.stock,
    regular_price: n(p.regular_price),
    sale_price: n(p.sale_price),
    table_price: Array.isArray(p.table_price) ? p.table_price : null,
    discount_type: (p.discount_type === 'fixed' || p.discount_type === 'percent') ? p.discount_type : null,
    discount_value: n(p.discount_value),
    discount_start_date: p.discount_start_date ?? null,
    discount_end_date: p.discount_end_date ?? null,
    priceSnapshot: unit.value,

    // ✅ carry these so the cart knows which rows are EUR
    display_euro_price: (p as any).display_euro_price,
    euro_price: n((p as any).euro_price),

    ...(requiresSerial.value ? { serial_number: [serial.value.trim()] } : {})
  })
}
</script>

<template>
  <div
    data-nosnippet
    ref="cardEl"
    class="group h-full rounded-xl bg-white ring-1 ring-black/5 shadow-sm hover:shadow-[0_35px_35px_rgba(0,0,0,0.15)] transition overflow-hidden flex flex-col"
  >
    <!-- IMAGE -->
    <NuxtLinkLocale :to="linkTo" class="relative block rounded-t-xl overflow-hidden bg-white">
      <div class="relative w-full aspect-[3/3]">
        <NuxtImg
          :src="product.image"
          :alt="product.name"
          loading="lazy"
          class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div class="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"></div>
      </div>

      <!-- badges -->
      <div class="absolute left-3 top-3 flex flex-col gap-1">
        <span
          v-if="hasDiscount && !hidePrice"
          class="inline-flex items-center rounded-full bg-red-600 text-white ring-1 ring-white/20 px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-lg"
        >
          {{ formatDisplayMoney(Number(offAnim.toFixed(2))) }} {{ _t('common.off', 'OFF') }}
        </span>
        <span
          v-if="product.freeShipping || product.badgeText"
          class="inline-flex items-center rounded-full bg-gray-700 text-white px-2.5 py-2 text-[10px] font-bold uppercase leading-none"
        >
          {{ product.badgeText || _t('badges.freeShipping','FREE SHIPPING') }}
        </span>
      </div>

      <!-- countdown -->
      <div
        v-if="hasTimer && !hidePrice"
        class="absolute inset-x-0 bottom-0 px-3 py-2 sm:py-3 text-white text-center bg-gradient-to-t from-slate-900/80 to-slate-900/10 backdrop-blur-[1px]"
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
      <div class="mt-2 flex-1">
        <div class="flex justify-center gap-1 text-[11px] leading-tight whitespace-nowrap overflow-hidden">
          <span v-if="product.sku" class="font-bold text-sm text-green-800 shrink-0">
            {{ product.sku }}
          </span>
        </div>

        <NuxtLinkLocale
          :to="linkTo"
          class="block mt-1 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300"
        >
          <span
            class="text-[13px] sm:text-[15px] font-semibold text-gray-900/90 group-hover:text-gray-900 leading-5 sm:leading-6 tracking-tight hyphens-auto break-words line-clamp-4 min-h-[3.75rem] transition-colors group-hover:underline underline-offset-2 decoration-slate-300"
          >
            {{ product.name }}
          </span>
        </NuxtLinkLocale>
      </div>

      <!-- footer -->
      <div class="mt-auto pt-3 w-full flex flex-col items-stretch gap-2">
        <!-- PRICE or WhatsApp -->
        <div v-if="!hidePrice" class="flex items-end gap-2">
          <div class="text-lg sm:text-xl font-extrabold text-red-600">
            {{ formatDisplayMoney(unit) }}
          </div>
          <div v-if="hasDiscount" class="text-sm text-gray-400 line-through">
            {{ formatDisplayMoney(unitBefore) }}
          </div>
        </div>

        <!-- WhatsApp when price hidden -->
        <a
          v-else
          :href="waLink"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center justify-center gap-2 bg-green-700 text-white ring-1 ring-green-600 hover:bg-green-800 hover:text-white font-semibold rounded-lg px-3 py-2"
          :aria-label="_t('search.contactOnWhatsApp','Contact on WhatsApp')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.94 11.94 0 0 0 12 0C5.39 0 0 5.39 0 12c0 2.11.55 4.1 1.61 5.89L0 24l6.26-1.64A11.96 11.96 0 0 0 12 24c6.61 0 12-5.39 12-12 0-3.2-1.25-6.21-3.48-8.52zM12 22a9.93 9.93 0 0 1-5.07-1.39l-.36-.21-3.71.97.99-3.62-.23-.37A9.93 9.93 0 0 1 2 12C2 6.49 6.49 2 12 2s10 4.49 10 10-4.49 10-10 10zm5.55-7.46c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.23-.65.08a8.2 8.2 0 0 1-2.41-1.49 9.05 9.05 0 0 1-1.68-2.08c-.17-.3 0-.46.13-.61.13-.13.3-.35.46-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.62-.93-2.22-.25-.6-.5-.51-.68-.51h-.58c-.2 0-.53.08-.83.38-.3.3-1.08 1.05-1.08 2.56 0 1.51 1.1 2.97 1.25 3.18.15.2 2.17 3.31 5.26 4.63.74.32 1.32.51 1.77.65.74.24 1.41.2 1.94.12.59-.09 1.78-.73 2.03-1.45.25-.73.25-1.35.18-1.48-.07-.13-.27-.2-.57-.35z"/></svg>
          {{ _t('search.contactOnWhatsApp','Contact on WhatsApp') }}
        </a>

        <!-- Serial Number (only when required) -->
        <div v-if="requiresSerial && !hidePrice" class="mt-2">
          <label class="sr-only" :for="`sn-${product.id}`">{{ _t('product.serialNumber','Serial number') }}</label>
          <input
            :id="`sn-${product.id}`"
            v-model.trim="serial"
            type="text"
            inputmode="text"
            :placeholder="_t('product.serialPlaceholder','Serial number (required)')"
            class="w-full rounded-md ring-1 ring-black/10 focus:ring-2 focus:ring-emerald-400 px-3 py-2 text-sm"
          />
        </div>

        <!-- Qty -->
        <div v-if="showAdd && showQty && !hidePrice && !requiresSerial" class="w-full flex items-center justify-center gap-2">
          <button
            type="button"
            class="w-10 h-10 rounded-md ring-1 ring-black/10 text-gray-700 hover:bg-gray-50 text-base"
            @click="qty = Math.max(1, qty - 1)"
            :aria-label="_t('common.decrease','Decrease quantity')"
          >
            –
          </button>
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
            :aria-label="_t('common.increase','Increase quantity')"
          >
            +
          </button>
        </div>

        <!-- Add to cart (never show when price is hidden) -->
        <button
          v-if="showAdd && !hidePrice"
          type="button"
          class="inline-flex items-center justify-center w-full px-2 py-3 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:bg-red-800 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!canAdd"
          @click="onAdd"
        >
          {{ _t('cart.addToCart','ADD TO CART') }}
        </button>
      </div>
    </div>
  </div>
</template>
