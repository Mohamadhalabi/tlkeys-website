<template>
  <!-- Sits right under the main nav using its measured height -->
  <nav
    class="sticky z-40 border-b border-gray-200 text-gray-900 supports-[backdrop-filter]:bg-white/80 backdrop-blur-sm overflow-x-hidden"
    :class="scrolled ? 'bg-white/90 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]' : 'bg-white/70'"
    :style="{ top: 'var(--main-nav-h, 56px)' }"
  >
    <div class="container mx-auto px-3">
      <ul class="flex items-center justify-center gap-4 md:gap-6 py-1.5">
        <li v-for="item in items" :key="item.key">
          <NuxtLinkLocale
            :to="item.to"
            :aria-current="isActive(item.key) ? 'page' : undefined"
            class="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md
                   text-[15px] md:text-[16px] font-semibold text-gray-700 hover:text-gray-900
                   transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            :class="isActive(item.key) ? 'text-orange-700' : ''"
          >
            <!-- SVG icon -->
            <Icon :name="item.key" class="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
            <span class="whitespace-nowrap">{{ item.label }}</span>

            <!-- slim underline kept inside the link box -->
            <span
              class="pointer-events-none absolute left-2 right-2 bottom-0 h-[2px]
                     bg-orange-500 rounded-full transition-opacity duration-200"
              :class="isActive(item.key) ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'"
              aria-hidden="true"
            />
          </NuxtLinkLocale>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, h, defineComponent } from 'vue'
const route = useRoute()

/* ----------------- Links (no unlock/online services) ----------------- */
const items = [
  { key: 'offers',        label: 'Offers',        to: '/shop?offers' },
  { key: 'promotion',     label: 'Promotion',     to: '/shop?promotion' },
  { key: 'free-shipping', label: 'Free Shipping', to: '/shop?free-shipping' },
  { key: 'bundled',       label: 'Bundles',       to: '/shop?bundled' },
  { key: 'new-arrival',   label: 'New Arrival',   to: '/shop?new-arrival' },
]

/* ----------------- Active when on /shop and flag exists -------------- */
const isActive = (slug: string) => route.path === '/shop' && (slug in route.query)

/* ----------------- Scroll state (subtle bg/shadow) ------------------- */
const scrolled = ref(false)
let onScroll: ((e: Event) => void) | null = null
onMounted(() => {
  onScroll = () => { scrolled.value = window.scrollY > 8 }
  window.addEventListener('scroll', onScroll, { passive: true })
  scrolled.value = window.scrollY > 8
})
onBeforeUnmount(() => { if (onScroll) window.removeEventListener('scroll', onScroll) })

/* ----------------- Icon component (inline SVGs) ---------------------- */
/* stroke follows currentColor so it inherits the link color */
const Icon = defineComponent({
  name: 'Icon',
  props: { name: { type: String, required: true } },
  setup(props, { attrs }) {
    const common = { fill: 'none', viewBox: '0 0 24 24', 'stroke-width': 1.7, stroke: 'currentColor' }

    return () => {
      switch (props.name) {
        /* % badge = Offers */
        case 'offers':
          return h('svg', { ...common, ...attrs }, [
            h('circle', { cx: 12, cy: 12, r: 9 }),
            h('path', { d: 'M8.5 15.5l7-7' }),
            h('circle', { cx: 9, cy: 9, r: 1.25, fill: 'currentColor', stroke: 'none' }),
            h('circle', { cx: 15, cy: 15, r: 1.25, fill: 'currentColor', stroke: 'none' }),
          ])

        /* Gift = Promotion */
        case 'promotion':
          return h('svg', { ...common, ...attrs }, [
            h('rect', { x: 3, y: 8.5, width: 18, height: 11, rx: 2 }),
            h('path', { d: 'M12 8.5v11M3 12.5h18' }),
            h('path', { d: 'M7.5 6c0-1.38 1.12-2.5 2.5-2.5S12 6 12 6s-2.5 0-4.5 0z' }),
            h('path', { d: 'M16.5 6c0-1.38-1.12-2.5-2.5-2.5S12 6 12 6s2.5 0 4.5 0z' }),
          ])

        /* Truck = Free Shipping */
        case 'free-shipping':
          return h('svg', { ...common, ...attrs }, [
            h('path', { d: 'M2 13V6a2 2 0 0 1 2-2h9v9' }),
            h('path', { d: 'M13 9h5l3 4v4h-3' }),
            h('circle', { cx: 7, cy: 17, r: 2 }),
            h('circle', { cx: 17, cy: 17, r: 2 }),
            h('path', { d: 'M9 17h6' }),
          ])

        /* Stacked boxes = Bundles */
        case 'bundled':
          return h('svg', { ...common, ...attrs }, [
            h('rect', { x: 3, y: 12, width: 8, height: 8, rx: 1.5 }),
            h('rect', { x: 13, y: 12, width: 8, height: 8, rx: 1.5 }),
            h('rect', { x: 8, y: 4, width: 8, height: 8, rx: 1.5 }),
            h('path', { d: 'M11 16h-4M21 16h-4M16 8h-4' }),
          ])

        /* Sparkles = New Arrival */
        case 'new-arrival':
          return h('svg', { ...common, ...attrs }, [
            h('path', { d: 'M12 3l1.6 3.6L17 8.2l-3.4 1.6L12 13l-1.6-3.2L7 8.2l3.4-1.6L12 3z' }),
            h('path', { d: 'M18.5 14l.9 2 .9 2-2-.9-2-.9 2-.9 2-.9z' }),
            h('path', { d: 'M5.5 10l.8 1.6L8 13l-1.7.8L5.5 16 4.7 13.8 3 13l1.7-.8L5.5 10z' }),
          ])

        default:
          return h('svg', { ...common, ...attrs })
      }
    }
  }
})
</script>