<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watchEffect } from 'vue'
import ProductGrid from '~/components/products/ProductGrid.vue'

type Product = Record<string, any>

const props = withDefaults(defineProps<{
  title?: string
  products: Product[]                    // items for the CURRENT API page

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
  serverPaging?: boolean                 // when true, we fetch pages from API
  currentPage?: number                   // 1-based
  lastPage?: number                      // from API meta.last_page
}>(), {
  title: 'Products',

  // two per row on mobile by default
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
})

const emit = defineEmits<{
  (e: 'request-page', page: number): void
  (e: 'add-to-cart', p: any): void
}>()

/* ---------- responsive layout (grid width × rows high) ---------- */
const perRow = ref(2)
const rows = ref(1)

function computeLayout() {
  const w = window.innerWidth

  // Force 2-up on the smallest breakpoint; otherwise respect props
  perRow.value =
    w < 640  ? 2
  : w < 768  ? props.perRowSm
  : w < 1024 ? props.perRowMd
  : w < 1280 ? props.perRowLg
             : props.perRowXl

  rows.value =
    w < 640  ? props.rowsBase
  : w < 768  ? props.rowsSm
  : w < 1024 ? props.rowsMd
  : w < 1280 ? props.rowsLg
             : props.rowsXl
}

function onResize() { computeLayout() }
onMounted(() => {
  computeLayout()
  window.addEventListener('resize', onResize, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

// keep layout in sync if parent changes props at runtime
watchEffect(() => {
  // no-op read to create deps → computeLayout already runs on resize
  void props.perRowBase; void props.perRowSm; void props.perRowMd; void props.perRowLg; void props.perRowXl
  void props.rowsBase;   void props.rowsSm;   void props.rowsMd;   void props.rowsLg;   void props.rowsXl
})

/* ---------- client mode pagination (when serverPaging = false) ---------- */
const perPageClient = computed(() => Math.max(1, perRow.value) * Math.max(1, rows.value))
const pageClient = ref(0) // 0-based
const totalPagesClient = computed(() =>
  Math.max(1, Math.ceil((props.products?.length || 0) / perPageClient.value))
)
const slicedClient = computed(() => {
  const start = pageClient.value * perPageClient.value
  return (props.products || []).slice(start, start + perPageClient.value)
})

/* ---------- controls ---------- */
function next() {
  if (props.serverPaging) {
    if ((props.currentPage || 1) < (props.lastPage || 1)) emit('request-page', (props.currentPage || 1) + 1)
  } else {
    pageClient.value = (pageClient.value + 1) % totalPagesClient.value
  }
}
function prev() {
  if (props.serverPaging) {
    if ((props.currentPage || 1) > 1) emit('request-page', (props.currentPage || 1) - 1)
  } else {
    pageClient.value = (pageClient.value - 1 + totalPagesClient.value) % totalPagesClient.value
  }
}

/* ---------- visuals ---------- */
const hasBackground = computed(() => !!props.backgroundUrl || !!props.backgroundGradient)
const titleClasses = computed(() => hasBackground.value ? 'text-white' : 'text-black')
const sectionStyle = computed(() => {
  if (props.backgroundGradient) {
    return { background: props.backgroundGradient } as any
  }
  if (props.backgroundUrl) {
    return { backgroundImage: `url(${props.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } as any
  }
  return {}
})
</script>

<template>
  <section class="relative my-8 rounded-none" :style="sectionStyle">
    <div v-if="hasBackground" class="absolute inset-0 pointer-events-none" :class="overlayClass"></div>

    <div class="relative mx-auto max-w-screen-2xl px-3 sm:px-4 py-6 sm:py-8">
      <h2 class="text-center font-extrabold tracking-wide uppercase text-base sm:text-lg mb-4" :class="titleClasses">
        {{ title }}
      </h2>

      <div class="relative">
        <!-- arrows (hidden on small screens) -->
        <button
          v-if="showArrows"
          aria-label="Previous"
          @click="prev"
          :disabled="serverPaging && (currentPage || 1) <= 1"
          class="hidden md:flex items-center justify-center absolute -left-3 top-1/2 -translate-y-1/2 z-10
                 h-8 w-8 rounded-full bg-white/95 shadow ring-1 ring-black/5 hover:bg-white transition
                 disabled:opacity-50 disabled:cursor-not-allowed"
        >‹</button>

        <!-- grid body -->
        <ProductGrid
          :title="''"
          :products="serverPaging ? products : slicedClient"
          :rows="rows"
          :products-per-row="perRow"
          @add-to-cart="$emit('add-to-cart', $event)"
        />

        <button
          v-if="showArrows"
          aria-label="Next"
          @click="next"
          :disabled="serverPaging && (currentPage || 1) >= (lastPage || 1)"
          class="hidden md:flex items-center justify-center absolute -right-3 top-1/2 -translate-y-1/2 z-10
                 h-8 w-8 rounded-full bg-white/95 shadow ring-1 ring-black/5 hover:bg-white transition
                 disabled:opacity-50 disabled:cursor-not-allowed"
        >›</button>
      </div>

      <!-- dots -->
      <div v-if="showDots" class="mt-4 flex items-center justify-center gap-2">
        <template v-if="serverPaging">
          <button
            v-for="i in (lastPage || 1)"
            :key="`dot-s-${i}`"
            @click="$emit('request-page', i)"
            class="h-2.5 w-2.5 rounded-full transition"
            :class="currentPage === i ? 'bg-white' : 'bg-white/60 hover:bg-white/80'"
            :aria-label="`Go to page ${i}`"
          />
        </template>
        <template v-else>
          <button
            v-for="i in totalPagesClient"
            :key="`dot-c-${i}`"
            @click="pageClient = i - 1"
            class="h-2.5 w-2.5 rounded-full transition"
            :class="pageClient === i - 1 ? 'bg-white' : 'bg-white/60 hover:bg-white/80'"
            :aria-label="`Go to page ${i}`"
          />
        </template>
      </div>
    </div>
  </section>
</template>
