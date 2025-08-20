<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

type Img = { src: string; alt?: string; id?: number; w?: number; h?: number }

const props = defineProps<{
  images: Img[]
  maxWidth?: number
  maxHeight?: number
}>()

/* ---- core state ---- */
const activeIndex = ref(0)
const activeImage = computed(() => props.images?.[activeIndex.value])

/* ---- sizes ---- */
const viewW = computed(() => props.maxWidth ?? 680)
const viewH = computed(() => props.maxHeight ?? 520)
const boxStyle = computed(() => ({ maxWidth: `${viewW.value}px`, height: `${viewH.value}px` }))
const thumbsStyle = computed(() => ({ maxWidth: `${viewW.value}px` }))

/* ---- main image nav ---- */
function nextImage() {
  if (!props.images?.length) return
  activeIndex.value = (activeIndex.value + 1) % props.images.length
}
function prevImage() {
  if (!props.images?.length) return
  activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length
}

/* ---- lightbox ---- */
const lightbox = ref(false)
function openLightbox() { if (props.images?.length) lightbox.value = true }
function closeLightbox() { lightbox.value = false }

function onKey(e: KeyboardEvent) {
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
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.documentElement.style.overflow = ''
})

/* ---- touch swipe in lightbox ---- */
let sx = 0, sy = 0
function onTouchStart(e: TouchEvent) { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - sx
  const dy = e.changedTouches[0].clientY - sy
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? nextImage() : prevImage()
}

/* ---- THUMB CAROUSEL (no visible scrollbar) ---- */
const thumbWrapRef = ref<HTMLDivElement | null>(null)
const thumbRefs = ref<HTMLElement[]>([])
const canThumbPrev = ref(false)
const canThumbNext = ref(false)

function updateThumbNav() {
  const el = thumbWrapRef.value
  if (!el) { canThumbPrev.value = canThumbNext.value = false; return }
  canThumbPrev.value = el.scrollLeft > 2
  canThumbNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
}

function thumbsScroll(dir: -1 | 1) {
  const el = thumbWrapRef.value
  if (!el) return
  const step = Math.max(160, Math.floor(el.clientWidth * 0.9))
  el.scrollBy({ left: dir * step, behavior: 'smooth' })
  // re-evaluate after the smooth scroll
  setTimeout(updateThumbNav, 350)
}

function onThumbScroll() { updateThumbNav() }

onMounted(() => {
  updateThumbNav()
  window.addEventListener('resize', updateThumbNav)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateThumbNav)
})

/* center active thumb when it changes */
watch(activeIndex, (idx) => {
  const el = thumbRefs.value[idx]
  el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
})
watch(() => props.images, () => {
  // reset if images change
  activeIndex.value = 0
  requestAnimationFrame(updateThumbNav)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Main image -->
    <div
      class="relative group rounded-2xl overflow-hidden bg-white border border-gray-200 mx-auto shadow-sm cursor-zoom-in"
      :style="boxStyle"
      @click="openLightbox"
    >
      <NuxtImg
        :src="activeImage?.src"
        :alt="activeImage?.alt || 'image'"
        format="webp"
        class="w-full h-full object-contain select-none"
        loading="eager"
        draggable="false"
      />

      <!-- inline arrows -->
      <button
        type="button"
        class="absolute top-1/2 -translate-y-1/2 start-3 rounded-full p-2 bg-white/90 hover:bg-white shadow"
        aria-label="Previous image"
        @click.stop="prevImage"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01.02 1.06L9.11 10l3.7 3.71a.75.75 0 11-1.06 1.06l-4.24-4.25a.75.75 0 010-1.06l4.24-4.24a.75.75 0 011.06.01z" clip-rule="evenodd"/></svg>
      </button>
      <button
        type="button"
        class="absolute top-1/2 -translate-y-1/2 end-3 rounded-full p-2 bg-white/90 hover:bg-white shadow"
        aria-label="Next image"
        @click.stop="nextImage"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 5.23a.75.75 0 011.06-.02l4.24 4.24c.29.29.29.77 0 1.06l-4.24 4.25a.75.75 0 11-1.06-1.06L10.89 10 7.21 6.29a.75.75 0 01-.02-1.06z" clip-rule="evenodd"/></svg>
      </button>
    </div>

    <!-- Thumbnails with chevrons (no visible scrollbar) -->
    <div class="relative mx-auto" :style="thumbsStyle">
      <button
        v-if="canThumbPrev"
        class="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 md:h-9 md:w-9 rounded-full bg-white/90 shadow hover:bg-white"
        aria-label="Scroll thumbnails left"
        @click="thumbsScroll(-1)"
      >‹</button>

      <div
        ref="thumbWrapRef"
        class="overflow-x-auto scrollbar-hide"
        @scroll.passive="onThumbScroll"
      >
        <div class="flex gap-3 py-1 pe-1">
          <button
            v-for="(img, idx) in images"
            :key="(img.id ?? idx) + '-' + img.src"
            :ref="el => (thumbRefs[idx] = el as unknown as HTMLElement)"
            type="button"
            class="rounded-xl border transition-all shrink-0"
            :class="idx === activeIndex ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200 hover:border-gray-300'"
            @click="activeIndex = idx"
            :aria-label="`Show image ${idx+1}`"
          >
            <NuxtImg
              :src="img.src"
              :alt="img.alt || 'thumb'"
              class="w-20 h-20 object-contain bg-white rounded-xl"
              format="webp"
              loading="lazy"
            />
          </button>
        </div>
      </div>

      <button
        v-if="canThumbNext"
        class="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 md:h-9 md:w-9 rounded-full bg-white/90 shadow hover:bg-white"
        aria-label="Scroll thumbnails right"
        @click="thumbsScroll(1)"
      >›</button>
    </div>

    <!-- LIGHTBOX -->
    <teleport to="body">
      <div
        v-if="lightbox"
        class="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center"
        @click.self="closeLightbox"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <button class="absolute top-4 end-4 text-white/80 hover:text-white p-2" aria-label="Close" @click="closeLightbox">✕</button>

        <button class="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-4 md:p-5 text-5xl md:text-6xl leading-none" aria-label="Previous" @click.stop="prevImage">‹</button>

        <div class="max-w-[95vw] max-h-[90vh]">
          <NuxtImg :src="activeImage?.src" :alt="activeImage?.alt || 'image'" class="object-contain w-[95vw] h-[90vh] select-none" format="webp" draggable="false" />
        </div>

        <button class="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-4 md:p-5 text-5xl md:text-6xl leading-none" aria-label="Next" @click.stop="nextImage">›</button>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
/* Hide native horizontal scrollbar for thumbnails */
.scrollbar-hide {
  scrollbar-width: none;           /* Firefox */
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;                   /* WebKit */
}
</style>