<template>
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
                   text-[15px] md:text-[16px] font-semibold transition-colors 
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            :class="[
              /* Active State */
              isActive(item.key) ? 'text-orange-700' : '',
              
              /* Specific Styling Logic */
              item.key === 'hot-deals' 
                ? (isActive(item.key) ? 'text-rose-700' : 'text-rose-600 hover:text-rose-800')
                : (item.key === 'new-arrival' ? 'text-orange-700 hover:text-orange-800' : 'text-gray-700 hover:text-gray-900')
            ]"
          >
            <Icon 
              :name="item.key" 
              class="w-[18px] h-[18px] shrink-0"
              :class="{ 'animate-pulse': item.key === 'hot-deals' }" 
              aria-hidden="true" 
            />
            
            <span class="whitespace-nowrap">{{ item.label }}</span>

            <span
              class="pointer-events-none absolute left-2 right-2 bottom-0 h-[2px]
                     rounded-full transition-opacity duration-200"
              :class="[
                isActive(item.key) ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                /* Change underline color for hot deals */
                item.key === 'hot-deals' ? 'bg-rose-500' : 'bg-orange-500'
              ]"
              aria-hidden="true"
            />
          </NuxtLinkLocale>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, h, defineComponent, computed } from 'vue'
import { useI18n, useRoute, useLocalePath } from '#imports'

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()

/* ----------------- Links (translated labels, same slugs) ------------- */
const items = computed(() => ([
  // 1. ADDED HOT DEALS HERE AT THE BEGINNING
  { key: 'hot-deals',     label: t('subnav.hotdeals',      'Hot Deals'),     to: '/shop?lowest-price-guaranteed' },
  { key: 'offers',        label: t('subnav.offers',        'Offers'),        to: '/shop?offers' },
  { key: 'promotion',     label: t('subnav.promotion',     'Promotion'),     to: '/shop?promotion' },
  { key: 'free-shipping', label: t('subnav.freeShipping',  'Free Shipping'), to: '/shop?free-shipping' },
  { key: 'bundled',       label: t('subnav.bundles',       'Bundles'),       to: '/shop?bundled' },
  { key: 'new-arrival',   label: t('subnav.newArrival',    'New Arrival'),   to: '/shop?new-arrival=&sort=newest&per_page=25' },
]))

/* ----------------- Active when on /shop and flag exists -------------- */
const isActive = (slug: string) =>
  route.path === localePath('/shop') && (slug in route.query)

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
const Icon = defineComponent({
  name: 'Icon',
  props: { name: { type: String, required: true } },
  setup(props, { attrs }) {
    const common = { fill: 'none', viewBox: '0 0 24 24', 'stroke-width': 1.7, stroke: 'currentColor' }

    return () => {
      switch (props.name) {
        
        /* 🔥 HOT DEALS ICON */
        case 'hot-deals':
          return h('svg', { ...common, ...attrs }, [
             // Fire/Flame shape
             h('path', { d: 'M12 2c0 0-3 2.5-3 6 0 2.5 2 4.5 4 4.5 1 0 1.5-.5 1.5-1 0 2.5-2.5 4-4.5 4-3 0-5.5-2.5-5.5-5.5 0-.5.05-1 .15-1.5-1.3.8-2.15 2.3-2.15 4 0 3.5 3 6.5 6.5 6.5s6.5-3 6.5-6.5c0-4-3.5-7-3.5-10.5z' })
          ])

        case 'offers':
          return h('svg', { ...common, ...attrs }, [
            h('circle', { cx: 12, cy: 12, r: 9 }),
            h('path', { d: 'M8.5 15.5l7-7' }),
            h('circle', { cx: 9, cy: 9, r: 1.25, fill: 'currentColor', stroke: 'none' }),
            h('circle', { cx: 15, cy: 15, r: 1.25, fill: 'currentColor', stroke: 'none' }),
          ])

        case 'promotion':
          return h('svg', { ...common, ...attrs }, [
            h('rect', { x: 3, y: 8.5, width: 18, height: 11, rx: 2 }),
            h('path', { d: 'M12 8.5v11M3 12.5h18' }),
            h('path', { d: 'M7.5 6c0-1.38 1.12-2.5 2.5-2.5S12 6 12 6s-2.5 0-4.5 0z' }),
            h('path', { d: 'M16.5 6c0-1.38-1.12-2.5-2.5-2.5S12 6 12 6s2.5 0 4.5 0z' }),
          ])

        case 'free-shipping':
          return h('svg', { ...common, ...attrs }, [
            h('path', { d: 'M2 13V6a2 2 0 0 1 2-2h9v9' }),
            h('path', { d: 'M13 9h5l3 4v4h-3' }),
            h('circle', { cx: 7, cy: 17, r: 2 }),
            h('circle', { cx: 17, cy: 17, r: 2 }),
            h('path', { d: 'M9 17h6' }),
          ])

        case 'bundled':
          return h('svg', { ...common, ...attrs }, [
            h('rect', { x: 3, y: 12, width: 8, height: 8, rx: 1.5 }),
            h('rect', { x: 13, y: 12, width: 8, height: 8, rx: 1.5 }),
            h('rect', { x: 8, y: 4, width: 8, height: 8, rx: 1.5 }),
            h('path', { d: 'M11 16h-4M21 16h-4M16 8h-4' }),
          ])

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