<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watchEffect, watch } from 'vue'
import ProductGrid from '~/components/products/ProductGrid.vue'

type Product = Record<string, any>

const props = withDefaults(defineProps<{
  title?: string
  products: Product[]

  /* responsive rows / per-row */
  rowsBase?: number; rowsSm?: number; rowsMd?: number; rowsLg?: number; rowsXl?: number
  perRowBase?: number; perRowSm?: number; perRowMd?: number; perRowLg?: number; perRowXl?: number

  /* background */
  backgroundUrl?: string | null
  backgroundGradient?: string | null
  overlayClass?: string

  /* UI */
  showArrows?: boolean
  showDots?: boolean

  /* server pagination */
  serverPaging?: boolean
  currentPage?: number
  lastPage?: number

  /* direction (if null, auto-detect from <html dir>) */
  rtl?: boolean | null

  /* auto slide */
  autoSlide?: boolean
  autoSlideMs?: number
  pauseOnHover?: boolean

  /* page transition */
  transitionType?: 'slide' | 'fade' | 'none'
  transitionMs?: number
  transitionEasing?: string
}>(), {
  title: 'Products',
  rowsBase: 1, rowsSm: 1, rowsMd: 1, rowsLg: 1, rowsXl: 1,
  perRowBase: 2, perRowSm: 2, perRowMd: 3, perRowLg: 4, perRowXl: 5,
  backgroundUrl: null,
  backgroundGradient: null,
  overlayClass: 'bg-black/10',
  showArrows: true,
  showDots: true,
  serverPaging: false,
  currentPage: 1,
  lastPage: 1,
  rtl: null,
  autoSlide: true,
  autoSlideMs: 10000,
  pauseOnHover: true,
  transitionType: 'slide',
  transitionMs: 280,
  transitionEasing: 'ease-out'
})

const emit = defineEmits<{
  (e: 'request-page', page: number): void
  (e: 'add-to-cart', p: any): void
}>()

/* ---- direction ---- */
const isRTL = ref(false)
function detectDir() {
  if (props.rtl != null) { isRTL.value = !!props.rtl; return }
  if (typeof document !== 'undefined') {
    const dir = document.documentElement.getAttribute('dir') || (document as any).dir || 'ltr'
    isRTL.value = String(dir).toLowerCase() === 'rtl'
  }
}

/* ---- responsive (container width) ---- */
const rootEl = ref<HTMLElement | null>(null)
const perRow = ref(2)
const rows = ref(1)
const layoutReady = ref(false) // ✅ prevents the “two big cards” flash

let ro: ResizeObserver | null = null
const BP = { xsMicro: 340, sm: 640, md: 768, lg: 1024, xl: 1280 }

function computeLayout() {
  const w = rootEl.value?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024)
  if (w < BP.xsMicro) { perRow.value = 1; rows.value = 1; return }

  perRow.value =
    w < BP.sm ? Math.max(1, props.perRowBase)
  : w < BP.md ? Math.max(1, props.perRowSm)
  : w < BP.lg ? Math.max(1, props.perRowMd)
  : w < BP.xl ? Math.max(1, props.perRowLg)
              : Math.max(1, props.perRowXl)

  rows.value =
    w < BP.sm ? Math.max(1, props.rowsBase)
  : w < BP.md ? Math.max(1, props.rowsSm)
  : w < BP.lg ? Math.max(1, props.rowsMd)
  : w < BP.xl ? Math.max(1, props.rowsLg)
              : Math.max(1, props.rowsXl)

  if (perRow.value === 1) rows.value = 1
}

/* compute before first paint (client) */
if (typeof window !== 'undefined') {
  computeLayout()
  layoutReady.value = true
}

onMounted(() => {
  detectDir()
  if (!layoutReady.value) { computeLayout(); layoutReady.value = true }

  if (typeof window !== 'undefined' && 'ResizeObserver' in window && rootEl.value) {
    ro = new ResizeObserver(() => computeLayout())
    ro.observe(rootEl.value)
  }
  setupVisibilityPause(true)
  startAuto()
})

onBeforeUnmount(() => {
  ro?.disconnect()
  stopAuto()
  setupVisibilityPause(false)
})

watchEffect(() => {
  void props.perRowBase; void props.perRowSm; void props.perRowMd; void props.perRowLg; void props.perRowXl
  void props.rowsBase;   void props.rowsSm;   void props.rowsMd;   void props.rowsLg;   void props.rowsXl
})

/* ---- paging + smooth animation ---- */
const perPage = computed(() => Math.max(1, perRow.value) * Math.max(1, rows.value))
const pageClient = ref(0)
const totalPagesClient = computed(() =>
  Math.max(1, Math.ceil((props.products?.length || 0) / perPage.value))
)

const slicedClient = computed(() => {
  const start = pageClient.value * perPage.value
  return (props.products || []).slice(start, start + perPage.value)
})

const visibleServerSlice = computed(() => (props.products || []).slice(0, perPage.value))
const visibleProducts = computed(() => props.serverPaging ? visibleServerSlice.value : slicedClient.value)

watch([perPage, () => props.products?.length], () => {
  if (pageClient.value > totalPagesClient.value - 1) pageClient.value = 0
  restartAuto()
})

/* animation state */
const pageAnim = ref<'next' | 'prev' | null>(null)

function next() {
  pageAnim.value = 'next'
  if (props.serverPaging) {
    if ((props.currentPage || 1) < (props.lastPage || 1)) emit('request-page', (props.currentPage || 1) + 1)
  } else {
    pageClient.value = (pageClient.value + 1) % totalPagesClient.value
  }
}
function prev() {
  pageAnim.value = 'prev'
  if (props.serverPaging) {
    if ((props.currentPage || 1) > 1) emit('request-page', (props.currentPage || 1) - 1)
  } else {
    pageClient.value = (pageClient.value - 1 + totalPagesClient.value) % totalPagesClient.value
  }
}

/* auto advance (wrap on server) */
function advanceAuto() {
  if (props.serverPaging) {
    const cur = Number(props.currentPage || 1)
    const last = Number(props.lastPage || 1)
    pageAnim.value = 'next'
    emit('request-page', cur < last ? cur + 1 : 1)
  } else {
    pageAnim.value = 'next'
    pageClient.value = (pageClient.value + 1) % totalPagesClient.value
  }
}

/* remember last server page to pick direction */
const lastServerPage = ref(props.currentPage || 1)
watch(() => props.currentPage, (p) => {
  if (!props.serverPaging) return
  const cur = Number(p || 1)
  pageAnim.value = cur > lastServerPage.value ? 'next' : 'prev'
  lastServerPage.value = cur
  restartAuto()
})

/* computed transition name */
const transitionName = computed(() => {
  if (props.transitionType === 'none') return ''
  if (props.transitionType === 'fade') return 'pc-fade'
  // slide
  const isNext = pageAnim.value === 'next'
  // RTL flips directions
  const left = isRTL.value ? 'pc-slide-right' : 'pc-slide-left'
  const right = isRTL.value ? 'pc-slide-left' : 'pc-slide-right'
  return isNext ? left : right
})

/* ---- background ---- */
const hasBackground = computed(() => !!props.backgroundUrl || !!props.backgroundGradient)
const titleClasses = computed(() => hasBackground.value ? 'text-white' : 'text-black')
const sectionStyle = computed(() => {
  if (props.backgroundGradient) return { background: props.backgroundGradient } as any
  if (props.backgroundUrl) return { backgroundImage: `url(${props.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } as any
  return {}
})

/* ---- touch swipe ---- */
const tX = ref(0), tY = ref(0), tActive = ref(false)
function onTouchStart(e: TouchEvent) {
  if (!e.touches?.length) return
  tActive.value = true
  tX.value = e.touches[0].clientX
  tY.value = e.touches[0].clientY
  stopAuto()
}
function onTouchEnd(e: TouchEvent) {
  if (!tActive.value) return
  const t = e.changedTouches?.[0]; if (!t) return
  tActive.value = false
  const dx = t.clientX - tX.value
  const dy = t.clientY - tY.value
  if (Math.abs(dx) >= 32 && Math.abs(dx) >= Math.abs(dy)) {
    if (isRTL.value) { dx > 0 ? next() : prev() } else { dx < 0 ? next() : prev() }
  }
  resumeAutoSoon()
}

/* ---- autoslide timer ---- */
let timer: number | null = null
const isHovering = ref(false)

function startAuto() {
  if (!props.autoSlide || timer != null) return
  if (typeof window === 'undefined') return
  timer = window.setInterval(() => {
    if (document?.hidden) return
    if (props.pauseOnHover && isHovering.value) return
    advanceAuto()
  }, Math.max(1000, props.autoSlideMs || 5000))
}
function stopAuto() { if (timer != null) { clearInterval(timer); timer = null } }
function restartAuto() { stopAuto(); startAuto() }
function resumeAutoSoon(delay = 1200) { stopAuto(); setTimeout(() => startAuto(), delay) }

/* pause when tab hidden / resume when visible */
function onVisibilityChange() { if (document.hidden) stopAuto(); else resumeAutoSoon(300) }
function setupVisibilityPause(enable: boolean) {
  if (typeof document === 'undefined') return
  if (enable) document.addEventListener('visibilitychange', onVisibilityChange)
  else document.removeEventListener('visibilitychange', onVisibilityChange)
}
</script>

<template>
  <section
    ref="rootEl"
    class="relative my-8 rounded-none"
    :style="sectionStyle"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
    @mouseenter="() => { if (pauseOnHover) { isHovering.value = true; stopAuto() } }"
    @mouseleave="() => { if (pauseOnHover) { isHovering.value = false; resumeAutoSoon() } }"
  >
    <div v-if="hasBackground" class="absolute inset-0 pointer-events-none" :class="overlayClass"></div>

    <div class="relative mx-auto max-w-screen-2xl px-3 sm:px-4 py-6 sm:py-8">
      <!-- HEADER -->
      <div v-if="title" class="grid grid-cols-[1fr_auto_1fr] items-center mb-2">
        <div class="justify-self-start">
          <template v-if="isRTL">
            <slot name="title-action" />
          </template>
        </div>

        <h2 class="text-center font-extrabold tracking-wide uppercase text-base sm:text-lg" :class="titleClasses">
          {{ title }}
        </h2>

        <div class="justify-self-end">
          <template v-if="!isRTL">
            <slot name="title-action" />
          </template>
        </div>
      </div>

      <!-- Stage -->
      <div class="relative pc-stage">
        <!-- Prev -->
        <button
          v-if="showArrows"
          aria-label="Previous"
          @click="isRTL ? next() : prev()"
          :disabled="serverPaging && (currentPage || 1) <= 1"
          class="pc-arrow pc-arrow--prev grid place-items-center rounded-full bg-white/95 shadow ring-1 ring-black/5 hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed z-10"
        >‹</button>

        <!-- Smooth page transition -->
        <Transition :name="transitionName" mode="out-in">
          <!-- 🔑 key changes on page + layout → animates cleanly -->
          <div :key="(serverPaging ? (currentPage || 1) : pageClient) + '-' + perPage" class="will-change-transform">
            <ProductGrid
              v-if="layoutReady"
              :title="''"
              :products="visibleProducts"
              :rows="rows"
              :products-per-row="perRow"
              @add-to-cart="$emit('add-to-cart', $event)"
            />
          </div>
        </Transition>

        <!-- Next -->
        <button
          v-if="showArrows"
          aria-label="Next"
          @click="isRTL ? prev() : next()"
          :disabled="serverPaging && (currentPage || 1) >= (lastPage || 1)"
          class="pc-arrow pc-arrow--next grid place-items-center rounded-full bg-white/95 shadow ring-1 ring-black/5 hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed z-10"
        >›</button>
      </div>

      <!-- Dots -->
      <div v-if="showDots" class="mt-4 flex items-center justify-center gap-2">
        <template v-if="serverPaging">
          <button
            v-for="i in (lastPage || 1)"
            :key="`dot-s-${i}`"
            @click="$emit('request-page', i)"
            class="h-2.5 w-2.5 rounded-full transition"
            :class="currentPage === i ? 'bg-black' : 'bg-black/60 hover:bg-black/80'"
            :aria-label="`Go to page ${i}`"
          />
        </template>
        <template v-else>
          <button
            v-for="i in totalPagesClient"
            :key="`dot-c-${i}`"
            @click="pageClient = i - 1"
            class="h-2.5 w-2.5 rounded-full transition"
            :class="pageClient === i - 1 ? 'bg-black' : 'bg-black/60 hover:bg-black/80'"
            :aria-label="`Go to page ${i}`"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* --- arrow gutter system --- */
.pc-stage {
  /* base sizes */
  --pc-arrow-gap: 10px;  /* space from content edge */
  --pc-arrow-size: 38px; /* default; overridden by media queries */
  --pc-trans-ms: v-bind('transitionMs + "ms"');
  --pc-trans-ease: v-bind('transitionEasing');

  position: relative;
  padding-left: calc(var(--pc-arrow-size) + var(--pc-arrow-gap));
  padding-right: calc(var(--pc-arrow-size) + var(--pc-arrow-gap));
}

@media (min-width: 640px) { .pc-stage { --pc-arrow-size: 38px; --pc-arrow-gap: 12px; } } /* sm */
@media (min-width: 768px) { .pc-stage { --pc-arrow-size: 40px; --pc-arrow-gap: 14px; } } /* md */
@media (min-width: 1024px){ .pc-stage { --pc-arrow-size: 44px; --pc-arrow-gap: 16px; } } /* lg */
@media (min-width: 1280px){ .pc-stage { --pc-arrow-size: 48px; --pc-arrow-gap: 18px; } } /* xl */

.pc-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: var(--pc-arrow-size);
  height: var(--pc-arrow-size);
}
.pc-arrow--prev { left: var(--pc-arrow-gap); }
.pc-arrow--next { right: var(--pc-arrow-gap); }

@media screen and (max-width:640px){
  .pc-arrow--prev, .pc-arrow--next { display: none; }
}

/* ====== Page Transitions ====== */
/* Slide (direction aware via class name) */
.pc-slide-left-enter-active,
.pc-slide-left-leave-active,
.pc-slide-right-enter-active,
.pc-slide-right-leave-active {
  transition: transform var(--pc-trans-ms) var(--pc-trans-ease), opacity var(--pc-trans-ms) var(--pc-trans-ease);
  will-change: transform, opacity;
}
.pc-slide-left-enter-from  { transform: translateX(24px);  opacity: 0; }
.pc-slide-left-leave-to    { transform: translateX(-24px); opacity: 0; }
.pc-slide-right-enter-from { transform: translateX(-24px); opacity: 0; }
.pc-slide-right-leave-to   { transform: translateX(24px);  opacity: 0; }

/* Fade */
.pc-fade-enter-active,
.pc-fade-leave-active { transition: opacity var(--pc-trans-ms) var(--pc-trans-ease); }
.pc-fade-enter-from,
.pc-fade-leave-to { opacity: 0; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .pc-slide-left-enter-active,
  .pc-slide-left-leave-active,
  .pc-slide-right-enter-active,
  .pc-slide-right-leave-active,
  .pc-fade-enter-active,
  .pc-fade-leave-active {
    transition-duration: 120ms;
    transition-timing-function: linear;
  }
  .pc-slide-left-enter-from,
  .pc-slide-left-leave-to,
  .pc-slide-right-enter-from,
  .pc-slide-right-leave-to {
    transform: none;
  }
}
</style>
