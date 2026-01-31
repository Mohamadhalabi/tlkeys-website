<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useHead, useImage, useRequestURL } from '#imports'

type Img = { src: string; alt?: string; id?: number; w?: number; h?: number }

const props = defineProps<{
  images: Img[]
  maxWidth?: number
  maxHeight?: number
  discountEndsAt?: string | null
  discountAmount?: number | null
  sku?: string | null
  /** Absolute URL for the hero image (same as og:image / JSON-LD image[0]) */
  heroCanonical?: string | null
}>()

/* ========== Main gallery state ========== */
const activeIndex = ref(0)
const activeImage = computed(() => props.images?.[activeIndex.value])

const viewW = computed(() => props.maxWidth ?? 680)
const viewH = computed(() => props.maxHeight ?? 520)
const boxStyle = computed(() => ({ maxWidth: `${viewW.value}px`, height: `${viewH.value}px` }))
const thumbsStyle = computed(() => ({ maxWidth: `${viewW.value}px` }))

function nextImage(){ if (props.images?.length) activeIndex.value = (activeIndex.value + 1) % props.images.length }
function prevImage(){ if (props.images?.length) activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length }

/* ========== Responsive targets ========== */
const mainW = computed(() => Math.round(Math.min(Math.max(320, viewW.value), 1024)))
const mainH = computed(() => mainW.value)
const sizesAttrMain = computed(() => `(max-width: 640px) 90vw, ${mainW.value}px`)

const thumbW = 80, thumbH = 80
const lightboxW = 1000, lightboxH = 1000
const sizesAttrLightbox = '(max-width: 1200px) 90vw, 1000px'

/* ========== URL helpers & preload ========== */
const $img = useImage()
const { protocol, host } = useRequestURL()
const baseOrigin = `${protocol}//${host}`

function toAbsolute(href: string): string {
  if (!href) return href
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  return baseOrigin + (href.startsWith('/') ? href : `/${href}`)
}
function originOf(href: string): string | null {
  try { if (!href.startsWith('http')) return null; return new URL(href).origin } catch { return null }
}

/** Use canonical URL only for the first slide; otherwise swap to the active image src */
const mainSrc = computed(() => {
  const activeAbs = toAbsolute(activeImage.value?.src || '')
  if (props.heroCanonical && activeIndex.value === 0) return props.heroCanonical
  return activeAbs
})

/* Preload EXACT hero URL (canonical) for LCP */
useHead(() => {
  const href = (props.heroCanonical && props.heroCanonical.trim()) || ''
  if (!href) return {}
  const preconnectOrigin = originOf(href)
  const links: any[] = [{ rel: 'preload', as: 'image', href, fetchpriority: 'high' }]
  if (preconnectOrigin) links.unshift({ rel: 'preconnect', href: preconnectOrigin, crossorigin: '' })
  return { link: links }
})


/* ========== Accessibility label helpers ========== */
function fileBaseFromSrc(src?: string): string {
  if (!src) return ''
  try {
    const u = new URL(src, baseOrigin)
    const last = decodeURIComponent(u.pathname.split('/').pop() || '')
    return last.split(/[?#]/)[0]
  } catch {
    const last = decodeURIComponent((src || '').split('/').pop() || '')
    return last.split(/[?#]/)[0]
  }
}
function normalizeLabel(raw?: string, fallbackSrc?: string) {
  let s = (raw || '').trim()
  if (!s) s = fileBaseFromSrc(fallbackSrc)
  s = s.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[-_]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  if (s) s = s.charAt(0).toUpperCase() + s.slice(1)
  return s || 'Image'
}
const labelFor = (img?: Img | null) => normalizeLabel(img?.alt, img?.src)
const heroLabel = computed(() => labelFor(activeImage.value))

/* ========== Lightbox ========== */
const lightbox = ref(false)
function openLightbox(){ if (props.images?.length) lightbox.value = true }
function closeLightbox(){ lightbox.value = false }

function onKey(e: KeyboardEvent){
  if (!lightbox.value) return
  if (e.key === 'Escape') return closeLightbox()
  if (e.key === 'ArrowRight') return nextImage()
  if (e.key === 'ArrowLeft') return prevImage()
}
watch(lightbox, (v) => {
  if (v) {
    document.addEventListener('keydown', onKey)
    document.documentElement.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', onKey)
    document.documentElement.style.overflow = ''
  }
})
onUnmounted(() => { document.removeEventListener('keydown', onKey); document.documentElement.style.overflow = '' })

let sx = 0, sy = 0
function onTouchStart(e: TouchEvent){ sx = e.touches[0].clientX; sy = e.touches[0].clientY }
function onTouchEnd(e: TouchEvent){
  const dx = e.changedTouches[0].clientX - sx
  const dy = e.changedTouches[0].clientY - sy
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? nextImage() : prevImage()
}

/* ========== Thumbs scroller ========== */
const thumbWrapRef = ref<HTMLDivElement | null>(null)
const thumbRefs = ref<HTMLElement[]>([])
const canThumbPrev = ref(false)
const canThumbNext = ref(false)

function updateThumbNav(){
  const el = thumbWrapRef.value
  if (!el) { canThumbPrev.value = canThumbNext.value = false; return }
  canThumbPrev.value = el.scrollLeft > 2
  canThumbNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
}
function thumbsScroll(dir: -1 | 1){
  const el = thumbWrapRef.value; if (!el) return
  const step = Math.max(160, Math.floor(el.clientWidth * 0.9))
  el.scrollBy({ left: dir * step, behavior: 'smooth' })
  setTimeout(updateThumbNav, 350)
}
function onThumbScroll(){ updateThumbNav() }

onMounted(() => { updateThumbNav(); window.addEventListener('resize', updateThumbNav) })
onUnmounted(() => { window.removeEventListener('resize', updateThumbNav) })

watch(activeIndex, (idx) => {
  const el = thumbRefs.value[idx]
  el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
})
watch(() => props.images, () => {
  activeIndex.value = 0
  requestAnimationFrame(updateThumbNav)
})

/* ========== Discount overlay logic ========== */
const cardEl = ref<HTMLElement | null>(null)

const endTs = computed<number | null>(() => {
  const d = props.discountEndsAt
  const t = d ? Date.parse(d) : NaN
  return Number.isFinite(t) ? t : null
})
const now = ref(Date.now())
let timer: number | undefined
onMounted(() => { timer = window.setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { if (timer) window.clearInterval(timer) })

const remainingMs = computed(() => endTs.value ? Math.max(0, endTs.value - now.value) : 0)
const hasTimer = computed(() => !!endTs.value && remainingMs.value > 0)
function fmtParts(ms: number){
  const s = Math.floor(ms / 1000)
  const days = Math.floor(s / 86400)
  const hrs = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  return { days, hrs, mins, secs }
}
const countdownTop = computed(() => 'DISCOUNT ENDS IN')
const countdownBottom = computed(() => {
  const { days, hrs, mins, secs } = fmtParts(remainingMs.value)
  const hms = `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  return days > 0 ? `${days} DAYS, ${hms}` : hms
})

const offAnim = ref(0)
let rafId: number | null = null
function animateOff(to: number, duration = 900){
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
onMounted(() => {
  visIO = new IntersectionObserver(([entry]) => {
    const target = Number(props.discountAmount || 0)
    if (entry?.isIntersecting) animateOff(target)
  }, { threshold: 0.35 })
  if (cardEl.value) visIO.observe(cardEl.value)
})
onUnmounted(() => { if (rafId) cancelAnimationFrame(rafId); if (visIO && cardEl.value) visIO.unobserve(cardEl.value) })
watch(() => props.discountAmount, (v) => animateOff(Number(v || 0)))
const hasOffPill = computed(() => Number(props.discountAmount || 0) > 0)
</script>

<template>
  <div class="space-y-4">
    <div
      ref="cardEl"
      class="group relative mx-auto cursor-zoom-in overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      :style="boxStyle"
      @click="openLightbox"
    >
      <div v-if="props.sku" class="absolute top-3 left-1/2 -translate-x-1/2 z-10 lg:hidden">
        <span class="inline-flex items-center rounded-full bg-emerald-600 text-white px-2.5 py-1 text-[12px] font-bold tracking-wide ring-1 ring-white/70 shadow-sm">
          {{ props.sku }}
        </span>
      </div>

      <NuxtImg
        :src="mainSrc"
        :alt="heroLabel"
        :title="heroLabel"
        :width="mainW"
        :height="mainH"
        :sizes="sizesAttrMain"
        format="avif,webp,jpeg"
        fit="inside"
        quality="70"
        loading="eager"
        decoding="async"
        :fetchpriority="activeIndex === 0 ? 'high' : 'auto'"
        class="h-full w-full select-none object-contain transition-opacity duration-200"
      />

      <div class="absolute left-3 top-3 flex flex-col gap-1">
        <span
          v-if="hasOffPill"
          class="inline-flex items-center rounded-full bg-red-600 text-white ring-1 ring-white/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide shadow-sm"
        >
          {{ offAnim.toFixed(2) }}$ OFF
        </span>
      </div>

      <div
        v-if="hasTimer"
        class="absolute inset-x-0 bottom-0 px-3 py-2 sm:py-3 text-white text-center bg-gradient-to-t from-slate-900/80 to-slate-900/10 backdrop-blur-[1px]"
      >
        <div class="text-[11px] sm:text-xs font-semibold tracking-wide opacity-95">
          {{ countdownTop }}
        </div>
        <div class="text-[12px] sm:text-sm font-extrabold tracking-wide">
          {{ countdownBottom }}
        </div>
      </div>

      <button
        type="button"
        class="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
        aria-label="Previous image"
        @click.stop="prevImage"
      >‹</button>
      <button
        type="button"
        class="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
        aria-label="Next image"
        @click.stop="nextImage"
      >›</button>
    </div>

    <div class="relative mx-auto" :style="thumbsStyle">
      <button
        v-if="canThumbPrev"
        class="absolute left-0 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-white/90 shadow hover:bg-white"
        aria-label="Scroll thumbnails left"
        @click="thumbsScroll(-1)"
      >‹</button>

      <div ref="thumbWrapRef" class="overflow-x-auto scrollbar-hide" @scroll.passive="onThumbScroll">
        <div class="flex gap-3 py-1 pe-1">
          <button
            v-for="(img, idx) in images"
            :key="(img.id ?? idx) + '-' + img.src"
            :ref="el => (thumbRefs[idx] = el as unknown as HTMLElement)"
            type="button"
            class="shrink-0 rounded-xl border transition-all"
            :class="idx === activeIndex ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200 hover:border-gray-300'"
            @click="activeIndex = idx"
            :aria-label="`Show image ${idx+1}`"
          >
            <NuxtImg
              :src="img.src"
              :alt="labelFor(img)"
              :title="labelFor(img)"
              :width="thumbW"
              :height="thumbH"
              sizes="80px"
              fit="inside"
              format="avif,webp"
              quality="60"
              loading="lazy"
              decoding="async"
              class="h-20 w-20 rounded-xl bg-white object-contain"
            />
          </button>
        </div>
      </div>

      <button
        v-if="canThumbNext"
        class="absolute right-0 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-white/90 shadow hover:bg-white"
        aria-label="Scroll thumbnails right"
        @click="thumbsScroll(1)"
      >›</button>
    </div>

    <teleport to="body">
      <div
        v-if="lightbox"
        class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        @click.self="closeLightbox"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <button class="absolute right-4 top-4 rounded-full p-2 text-white/80 hover:text-white" aria-label="Close" @click="closeLightbox">✕</button>
        <button class="absolute left-3 top-1/2 -translate-y-1/2 p-4 text-5xl leading-none text-white/80 hover:text-white" aria-label="Previous" @click.stop="prevImage">‹</button>

        <div class="max-h-[90vh] max-w-[95vw]">
          <NuxtImg
            :src="activeImage?.src"
            :alt="heroLabel"
            :title="heroLabel"
            :width="lightboxW"
            :height="lightboxH"
            :sizes="sizesAttrLightbox"
            fit="inside"
            format="avif,webp"
            quality="75"
            class="h-[90vh] w-[95vw] select-none object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>

        <button class="absolute right-3 top-1/2 -translate-y-1/2 p-4 text-5xl leading-none text-white/80 hover:text-white" aria-label="Next" @click.stop="nextImage">›</button>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.scrollbar-hide { scrollbar-width: none; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
</style>