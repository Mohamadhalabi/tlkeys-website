<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
type Img = { src: string; alt?: string; id?: number; w?: number; h?: number }

const props = defineProps<{ images: Img[]; maxWidth?: number; maxHeight?: number }>()
const activeIndex = ref(0)
const activeImage = computed(() => props.images?.[activeIndex.value])

const viewW = computed(() => props.maxWidth ?? 680)
const viewH = computed(() => props.maxHeight ?? 520)
const boxStyle = computed(() => ({ maxWidth: `${viewW.value}px`, height: `${viewH.value}px` }))
const thumbsStyle = computed(() => ({ maxWidth: `${viewW.value}px` }))

function nextImage() { if (!props.images?.length) return; activeIndex.value = (activeIndex.value + 1) % props.images.length }
function prevImage() { if (!props.images?.length) return; activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length }

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

let sx = 0, sy = 0
function onTouchStart(e: TouchEvent) { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - sx
  const dy = e.changedTouches[0].clientY - sy
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? nextImage() : prevImage()
}

/* thumbs */
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

watch(activeIndex, (idx) => { const el = thumbRefs.value[idx]; el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }) })
watch(() => props.images, () => { activeIndex.value = 0; requestAnimationFrame(updateThumbNav) })
</script>

<template>
  <div class="space-y-4">
    <!-- Main image -->
    <div
      class="group relative mx-auto cursor-zoom-in overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      :style="boxStyle"
      @click="openLightbox"
    >
      <NuxtImg
        :src="activeImage?.src"
        :alt="activeImage?.alt || 'image'"
        format="webp"
        class="h-full w-full select-none object-contain"
        loading="eager"
        draggable="false"
      />

      <!-- arrows -->
      <button
        type="button"
        class="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
        aria-label="Previous image"
        @click.stop="prevImage"
      >
        ‹
      </button>
      <button
        type="button"
        class="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-100"
        aria-label="Next image"
        @click.stop="nextImage"
      >
        ›
      </button>
    </div>

    <!-- Thumbnails -->
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
              :alt="img.alt || 'thumb'"
              class="h-20 w-20 rounded-xl bg-white object-contain"
              format="webp"
              loading="lazy"
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

    <!-- LIGHTBOX -->
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
          <NuxtImg :src="activeImage?.src" :alt="activeImage?.alt || 'image'" class="h-[90vh] w-[95vw] select-none object-contain" format="webp" draggable="false" />
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
