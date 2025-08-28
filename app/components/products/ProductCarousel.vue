<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watchEffect, watch, nextTick } from 'vue'
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

  /* direction */
  rtl?: boolean | null
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
  rtl: null
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
    const dir = document.documentElement.getAttribute('dir') || document.dir || 'ltr'
    isRTL.value = String(dir).toLowerCase() === 'rtl'
  }
}

/* ---- responsive (container width) ---- */
const rootEl = ref<HTMLElement | null>(null)
const perRow = ref(2)
const rows = ref(1)

let ro: ResizeObserver | null = null
const BP = { xsMicro: 340, sm: 640, md: 768, lg: 1024, xl: 1280 }

function computeLayout() {
  const w = rootEl.value?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024)

  // Force 1×1 on very small screens
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

  // If 1-per-row, lock to a single row
  if (perRow.value === 1) rows.value = 1
}

onMounted(() => {
  detectDir()
  nextTick(computeLayout)
  if (typeof window !== 'undefined' && 'ResizeObserver' in window && rootEl.value) {
    ro = new ResizeObserver(() => computeLayout())
    ro.observe(rootEl.value)
  }
})
onBeforeUnmount(() => ro?.disconnect())

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

// with serverPaging, still cap visible items to viewport (tiny = 1 item)
const visibleServerSlice = computed(() => (props.products || []).slice(0, perPage.value))
const visibleProducts = computed(() => props.serverPaging ? visibleServerSlice.value : slicedClient.value)

watch([perPage, () => props.products?.length], () => {
  if (pageClient.value > totalPagesClient.value - 1) pageClient.value = 0
})

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

const lastServerPage = ref(props.currentPage || 1)
watch(() => props.currentPage, (p) => {
  if (!props.serverPaging) return
  const cur = Number(p || 1)
  pageAnim.value = cur > lastServerPage.value ? 'next' : 'prev'
  lastServerPage.value = cur
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
}
function onTouchEnd(e: TouchEvent) {
  if (!tActive.value) return
  tActive.value = false
  const t = e.changedTouches?.[0]; if (!t) return
  const dx = t.clientX - tX.value
  const dy = t.clientY - tY.value
  if (Math.abs(dx) < 32 || Math.abs(dx) < Math.abs(dy)) return
  if (isRTL.value) { dx > 0 ? next() : prev() } else { dx < 0 ? next() : prev() }
}
</script>

<template>
  <section
    ref="rootEl"
    class="relative my-8 rounded-none"
    :style="sectionStyle"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div v-if="hasBackground" class="absolute inset-0 pointer-events-none" :class="overlayClass"></div>

    <div class="relative mx-auto max-w-screen-2xl px-3 sm:px-4 py-6 sm:py-8">
      <h2 class="text-center font-extrabold tracking-wide uppercase text-base sm:text-lg mb-4" :class="titleClasses">
        {{ title }}
      </h2>

      <!-- Stage with reserved arrow gutters so cards never sit under buttons -->
      <div class="relative pc-stage">
        <!-- Prev -->
        <button
          v-if="showArrows"
          aria-label="Previous"
          @click="isRTL ? next() : prev()"
          :disabled="serverPaging && (currentPage || 1) <= 1"
          class="pc-arrow pc-arrow--prev grid place-items-center rounded-full bg-white/95 shadow ring-1 ring-black/5 hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed z-10"
        >‹</button>

        <!-- Smooth slide -->
        <Transition :name="(pageAnim === 'next') !== isRTL ? 'slide-left' : 'slide-right'" mode="out-in">
          <div :key="serverPaging ? (currentPage || 1)+'-'+perPage : pageClient+'-'+perPage" class="will-change-transform">
            <ProductGrid
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

      <!-- Dots (black) -->
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

  position: relative;
  padding-left: calc(var(--pc-arrow-size) + var(--pc-arrow-gap));
  padding-right: calc(var(--pc-arrow-size) + var(--pc-arrow-gap));
}

@media (min-width: 640px) { /* sm */
  .pc-stage { --pc-arrow-size: 38px; --pc-arrow-gap: 12px; }
}
@media (min-width: 768px) { /* md */
  .pc-stage { --pc-arrow-size: 40px; --pc-arrow-gap: 14px; }
}
@media (min-width: 1024px) { /* lg */
  .pc-stage { --pc-arrow-size: 44px; --pc-arrow-gap: 16px; }
}
@media (min-width: 1280px) { /* xl */
  .pc-stage { --pc-arrow-size: 48px; --pc-arrow-gap: 18px; }
}

/* arrow positions inside the gutter */
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
.pc-arrow--prev { width: 8vw; height: 8vw; left: -10px; }
.pc-arrow--next { width: 8vw; height: 8vw; right: -10px; }
}

/* smooth page transition */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 280ms ease-out, opacity 280ms ease-out;
}
.slide-left-enter-from   { transform: translateX(20px);  opacity: 0; }
.slide-left-leave-to     { transform: translateX(-20px); opacity: 0; }
.slide-right-enter-from  { transform: translateX(-20px); opacity: 0; }
.slide-right-leave-to    { transform: translateX(20px);  opacity: 0; }
</style>
