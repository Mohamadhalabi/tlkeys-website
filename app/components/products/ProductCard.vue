<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCart } from '~/composables/useCart'
import { useCurrency } from '~/composables/useCurrency'
import { useRuntimeConfig, useI18n } from '#imports'
import { computeUnitPrice, type PriceTableRow as TRow } from '~/utils/pricing'

/* --- Types --- */
type Product = {
  id: number | string
  slug?: string
  name: string
  part_number?: string | null 
  image: string
  gallery?: string[] 
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

/* --- Composables & Config --- */
const { t: _t } = (useI18n?.() as any) || { t: (s:string)=>s }
const cart = useCart()
const { formatMoney } = useCurrency()
const runtime = useRuntimeConfig()
const WHATSAPP_NUMBER = (runtime.public.WHATSAPP_NUMBER as string) || '971504429045'

/* --- State --- */
const qty = ref(1)
const serial = ref('')
const cardEl = ref<HTMLElement | null>(null)
const offAnim = ref(0)
const isHovered = ref(false) 
const activeImageIndex = ref(0)
const imageContainerRef = ref<HTMLElement | null>(null)

/* --- Helper: Get Filename from URL --- */
const getFilename = (url: string) => {
  if (!url) return ''
  try {
    const path = url.split('?')[0]
    return path.split('/').pop() || ''
  } catch (e) { return '' }
}

/* --- Clean Title Logic (Removes MPN, P/N:, and truncates) --- */
const cleanTitle = computed(() => {
  let t = props.product.name || ''
  const mpn = props.product.part_number
  
  if (mpn && t.includes(mpn)) {
    // Replace the MPN, and clean up any double spaces or leading/trailing hyphens left behind
    t = t.replace(mpn, '').replace(/\s{2,}/g, ' ').replace(/^-\s*/, '').trim()
  }
  
  // Strip out "P/N:" or "P/N" entirely
  t = t.replace(/\s*P\/N:?\s*/gi, ' ').trim()
  
  // Apply the 50 character truncation from your previous request
  return t.length > 70 ? t.substring(0, 80) + '...' : t
})

/* --- Gallery Logic (Smart Dedupe) --- */
const imageList = computed(() => {
  const mainImg = props.product.image || ''
  const imgs = [mainImg]

  if (props.product.gallery && Array.isArray(props.product.gallery) && props.product.gallery.length > 0) {
    const mainName = getFilename(mainImg)
    
    const unique = props.product.gallery.filter(g => {
      if (!g) return false
      const gName = getFilename(g)
      if (gName === mainName) return false 
      
      const cleanMain = mainName.replace('-min', '').replace('-primary', '')
      const cleanG = gName.replace('-min', '').replace('-primary', '')
      
      return cleanMain !== cleanG
    })
    imgs.push(...unique)
  }
  return imgs
})

const currentImage = computed(() => {
  const idx = Math.max(0, Math.min(activeImageIndex.value, imageList.value.length - 1))
  return imageList.value[idx]
})

/* --- Mouse Events for Gallery Scrubbing --- */
function onMouseMove(e: MouseEvent) {
  if (!imageContainerRef.value || imageList.value.length <= 1) return
  const { left, width } = imageContainerRef.value.getBoundingClientRect()
  const x = e.clientX - left 
  const percentage = Math.max(0, Math.min(1, x / width))
  const index = Math.floor(percentage * imageList.value.length)
  activeImageIndex.value = index
}

function onMouseLeave() {
  isHovered.value = false
  activeImageIndex.value = 0 
}

function onMouseEnter() {
  isHovered.value = true
}

/* --- Timer Logic --- */
const now = ref(Date.now())
let timerTick: any = null

const endTs = computed(() => {
  const d = props.product.discount_end_date
  return d ? new Date(d).getTime() : 0
})

const remainingMs = computed(() => Math.max(0, endTs.value - now.value))
const hasTimer = computed(() => !!endTs.value && remainingMs.value > 0)

const countdownString = computed(() => {
  const s = Math.floor(remainingMs.value / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  
  const hms = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return d > 0 ? `${d} DAYS, ${hms}` : hms
})

/* --- Price Logic --- */
const hidePrice = computed(() => Boolean((props.product as any).hide_price))
const requiresSerial = computed(() => Boolean((props.product as any).requires_serial))
const canAdd = computed(() => !requiresSerial.value || serial.value.trim().length > 0)
const linkTo = computed(() => props.product.href ?? `/products/${props.product.slug ?? props.product.id}`)

const n = (x: unknown): number | null => {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') { const v = Number(x.trim()); return Number.isFinite(v) ? v : null }
  return null
}

const waLink = computed(() => {
  const title = props.product.name || ''
  const sku = props.product.sku ? ` (SKU: ${props.product.sku})` : ''
  const msg = _t('search.askAboutProduct', 'Can I get more information and price for "{title}{sku}"?')
    .replace('{title}', title).replace('{sku}', sku)
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
})

const useEuro = computed(() => {
  const flag = (props.product as any).display_euro_price
  const euro = n((props.product as any).euro_price)
  return !!flag && euro != null
})

const formatDisplayMoney = (amount: number | null | undefined) => {
  if (useEuro.value) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(Number(amount || 0))
  }
  return formatMoney(amount)
}

const asProductLike = computed(() => ({
  price: n(props.product.price) ?? n(props.product.regular_price) ?? 0,
  regular_price: n(props.product.regular_price),
  sale_price: n(props.product.sale_price),
  table_price: Array.isArray(props.product.table_price) ? props.product.table_price : null,
  discount_type: (props.product.discount_type === 'percent' || props.product.discount_type === 'fixed') ? props.product.discount_type : null,
  discount_value: n(props.product.discount_value),
}))

const unit = computed(() => {
  if (useEuro.value) {
    const base = n((props.product as any).euro_price) ?? 0
    const type = props.product.discount_type
    const val = n(props.product.discount_value)
    if (!type || !val || val <= 0) return base
    if (type === 'fixed') return Math.max(0, base - val)
    if (type === 'percent') return Math.max(0, base * (1 - val / 100))
    return base
  }
  return computeUnitPrice(asProductLike.value, qty.value).unit
})

const unitBefore = computed(() => {
  if (useEuro.value) {
    const base = n((props.product as any).euro_price)
    const type = props.product.discount_type
    const val = n(props.product.discount_value)
    return (!base || !type || !val || val <= 0) ? null : base
  }
  const forcedBase = (typeof props.product.regular_price === 'number' && props.product.regular_price > 0)
      ? (props.product.regular_price as number)
      : (n(props.product.regular_price) ?? n(props.product.price) ?? 0)
  
  const pNoPromo: any = { ...asProductLike.value, discount_type: null, discount_value: null, sale_price: null, price: forcedBase, table_price: null }
  return computeUnitPrice(pNoPromo, qty.value).unit
})

const hasDiscount = computed(() => !!unitBefore.value && unitBefore.value > unit.value)
const discountAmount = computed(() => !hasDiscount.value ? 0 : Math.max(0, (unitBefore.value || 0) - unit.value))

/* --- Animation & Lifecycle --- */
let rafId: number | null = null
let visIO: IntersectionObserver | null = null

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

onMounted(() => {
  visIO = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) animateOff(discountAmount.value) }, { threshold: 0.35 })
  if (cardEl.value) visIO.observe(cardEl.value)
  
  timerTick = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (visIO && cardEl.value) visIO.unobserve(cardEl.value)
  if (timerTick) clearInterval(timerTick)
})

watch(discountAmount, (v) => animateOff(v))

async function onAdd() {
  if (requiresSerial.value && !serial.value.trim()) {
    const el = document.getElementById(`sn-${props.product.id}`)
    el?.classList.add('ring-2', 'ring-red-400')
    setTimeout(() => el?.classList.remove('ring-2', 'ring-red-400'), 600)
    return
  }
  const p = props.product
  await cart.add(p.id, qty.value, {
    title: p.name, image: p.image, sku: p.sku || undefined, slug: p.slug,
    price: unit.value, stock: p.stock, regular_price: n(p.regular_price), sale_price: n(p.sale_price),
    table_price: Array.isArray(p.table_price) ? p.table_price : null,
    discount_type: (p.discount_type === 'fixed' || p.discount_type === 'percent') ? p.discount_type : null,
    discount_value: n(p.discount_value),
    display_euro_price: (p as any).display_euro_price, euro_price: n((p as any).euro_price),
    ...(requiresSerial.value ? { serial_number: [serial.value.trim()] } : {})
  })
}
</script>

<template>
  <div
    data-nosnippet
    ref="cardEl"
    class="group relative flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-300"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <NuxtLinkLocale
      :to="linkTo"
      class="relative block w-full overflow-hidden bg-white aspect-[1/1] border-b border-gray-100"
    >
      <div 
        ref="imageContainerRef"
        class="relative w-full h-full"
        @mousemove="onMouseMove"
      >
        <NuxtImg
          :key="currentImage"
          :src="currentImage"
          :alt="product.name"
          :width="600" 
          :quality="90"
          loading="lazy"
          class="h-full w-full object-contain transition-transform duration-500 will-change-transform group-hover:scale-105"
        />

        <div 
          v-if="hasTimer && !hidePrice" 
          class="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center justify-end pb-3 pt-2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"
        >
          <span class="text-[9px] font-bold text-gray-200 uppercase tracking-widest mb-0.5 shadow-sm">
            {{ _t('product.ends', 'DISCOUNT ENDS IN') }}
          </span>
          <span class="text-[11px] sm:text-xs font-extrabold text-white tracking-wide shadow-sm font-sans">
            {{ countdownString }}
          </span>
        </div>

        <div 
          v-if="imageList.length > 1" 
          class="absolute left-0 right-0 flex justify-center gap-1.5 pb-1 z-20 transition-all duration-300"
          :class="hasTimer && !hidePrice ? 'bottom-11' : 'bottom-2'"
        >
          <span 
            v-for="(_, idx) in imageList" 
            :key="idx" 
            class="h-1.5 rounded-full transition-all duration-300 shadow-sm border border-black/10"
            :class="idx === activeImageIndex ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-gray-200/80'"
          ></span>
        </div>
      </div>
      
      <div v-if="hasDiscount && !hidePrice" class="absolute left-3 top-3 z-10 pointer-events-none">
        <span class="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
          {{ formatDisplayMoney(Number(offAnim.toFixed(2))) }} {{ _t('common.off', 'OFF') }}
        </span>
      </div>
    </NuxtLinkLocale>

    <div class="flex flex-1 flex-col px-4 pb-4 pt-4">
      
      <div class="mb-3 min-h-[15px] flex flex-col gap-2">
        <div v-if="product.sku" class="text-xs font-bold uppercase tracking-wider text-green-600" data-nosnippet>
          {{ product.sku }}
          <div v-if="product.part_number" class="w-max inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[12px] font-semibold text-blue-700">
            {{ product.part_number }}
          </div>
        </div>
      </div>

      <NuxtLinkLocale
        :to="linkTo"
        class="mb-3 block text-sm font-bold leading-snug text-gray-800 transition-colors hover:text-red-600 min-h-[2.5rem]"
        :title="product.name"
      >
        {{ cleanTitle }}
      </NuxtLinkLocale>

      <div class="mt-auto"></div>

      <div v-if="!hidePrice" class="mb-3 flex flex-wrap items-baseline gap-2">
        <span class="text-lg font-bold text-red-600">
          {{ formatDisplayMoney(unit) }}
        </span>
        <span v-if="hasDiscount" class="text-xs text-gray-400 line-through decoration-gray-400">
          {{ formatDisplayMoney(unitBefore) }}
        </span>
      </div>

      <div class="flex flex-col gap-2">
        <input
          v-if="requiresSerial && !hidePrice"
          :id="`sn-${product.id}`"
          v-model.trim="serial"
          type="text"
          placeholder="Enter Serial No."
          class="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 mb-2"
        />

        <div v-if="showAdd" class="flex items-center gap-2 h-9">
          <a
            v-if="hidePrice"
            :href="waLink"
            target="_blank"
            class="flex w-full items-center justify-center gap-2 rounded bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 transition shadow-sm"
          >
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            {{ _t('search.contactOnWhatsApp','Contact on WhatsApp') }}
          </a>

          <template v-else>
            <div v-if="showQty && !requiresSerial" class="flex h-full w-20 items-center overflow-hidden rounded border border-gray-200">
              <button
                type="button"
                class="flex h-full flex-1 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition"
                @click="qty = Math.max(1, qty - 1)"
              >-</button>
              <input
                v-model.number="qty"
                type="number"
                class="h-full w-8 bg-transparent text-center text-xs font-semibold text-gray-900 outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                class="flex h-full flex-1 items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition"
                @click="qty = qty + 1"
              >+</button>
            </div>

            <button
              type="button"
              class="flex-1 h-full rounded flex items-center justify-center text-white transition-all duration-300 bg-gradient-to-b from-red-600 to-red-700 hover:from-slate-700 hover:to-slate-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              :disabled="!canAdd"
              @click="onAdd"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>