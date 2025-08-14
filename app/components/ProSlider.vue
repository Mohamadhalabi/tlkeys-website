<template>
  <div
    class="relative group select-none w-full"
    :class="(dragging || activated) ? 'cursor-grabbing' : 'cursor-grab'"
    role="region"
    aria-roledescription="carousel"
    :aria-label="ariaLabel"
    tabindex="0"
    @keydown.left.prevent="prev"
    @keydown.right.prevent="next"
    @mouseenter="pause()"
    @mouseleave="resume()"
  >
    <!-- Viewport (anchors dots/progress + shows the radius) -->
    <div class="relative overflow-hidden" :class="rounded ? 'rounded-2xl' : ''">
      <!-- Slide effect -->
      <div
        v-if="effect === 'slide'"
        ref="trackEl"
        class="whitespace-nowrap will-change-transform"
        :class="transitioning ? 'transition-transform duration-600 ease-out' : ''"
        :style="{ transform: `translate3d(${translateX}px,0,0)`, touchAction: 'pan-y' }"
        @pointerdown.prevent="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="(dragging || activated) ? onPointerUp() : null"
      >
        <div v-for="(s, i) in items" :key="i" class="inline-block align-top w-full" :aria-hidden="active !== i">
          <NuxtLink :to="s.link || '#'" class="block" @click="onLinkClick">
            <NuxtImg
              v-if="useNuxtImg"
              :src="s.image"
              :alt="s.alt || s.title || ''"
              :sizes="imgSizes"
              :class="imgClass"
              :loading="i === active ? 'eager' : 'lazy'"
              decoding="async"
              :draggable="false"
            />
            <img
              v-else
              :src="s.image"
              :alt="s.alt || s.title || ''"
              :class="imgClass"
              :loading="i === active ? 'eager' : 'lazy'"
              decoding="async"
              draggable="false"
            />
          </NuxtLink>
        </div>
      </div>

      <!-- Fade effect -->
      <div
        v-else
        ref="trackEl"
        class="relative"
        :style="{ height: resolvedHeight, touchAction: 'pan-y' }"
        @pointerdown.prevent="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @pointerleave="(dragging || activated) ? onPointerUp() : null"
      >
        <div
          v-for="(s, i) in items"
          :key="`fade-${i}`"
          class="absolute inset-0 transition-opacity duration-700 ease-out"
          :class="i === active ? 'opacity-100 z-10' : 'opacity-0 z-0'"
          :aria-hidden="active !== i"
        >
          <NuxtLink :to="s.link || '#'" class="block h-full" @click="onLinkClick">
            <NuxtImg
              v-if="useNuxtImg"
              :src="s.image"
              :alt="s.alt || s.title || ''"
              :sizes="imgSizes"
              :class="imgClass + ' h-full'"
              :loading="i === active ? 'eager' : 'lazy'"
              decoding="async"
              :draggable="false"
            />
            <img
              v-else
              :src="s.image"
              :alt="s.alt || s.title || ''"
              :class="imgClass + ' h-full'"
              :loading="i === active ? 'eager' : 'lazy'"
              decoding="async"
              draggable="false"
            />
          </NuxtLink>
        </div>
      </div>

      <!-- Inset arrows -->
      <button
        v-if="showArrows"
        type="button"
        class="absolute inset-y-0 left-3 sm:left-4 my-auto h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/40 text-white grid place-items-center hover:bg-black/50 transition"
        aria-label="Previous slide"
        @click="prev"
      >‹</button>
      <button
        v-if="showArrows"
        type="button"
        class="absolute inset-y-0 right-3 sm:right-4 my-auto h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/40 text-white grid place-items-center hover:bg-black/50 transition"
        aria-label="Next slide"
        @click="next"
      >›</button>

      <!-- Dots (inset, responsive, scrollable if many) -->
      <div
        v-if="showDots"
        class="absolute inset-x-3 sm:inset-x-4 bottom-3 flex justify-center gap-2 overflow-x-auto no-scrollbar"
        role="tablist"
      >
        <div class="flex gap-2 flex-nowrap mx-auto">
          <button
            v-for="(_s, i) in items"
            :key="`dot-${i}`"
            class="rounded-full transition flex-shrink-0"
            :class="[
              dotSizeClass,
              i === active ? 'bg-white' : 'bg-white/50 hover:bg-white/70'
            ]"
            @click="go(i)"
            role="tab"
            :aria-selected="i === active"
            :aria-controls="`slide-${i}`"
          />
        </div>
      </div>

      <!-- Progress (inset) -->
      <div v-if="autoplay && showProgress" class="absolute left-3 right-3 sm:left-4 sm:right-4 bottom-0 h-1 bg-black/20 rounded-full overflow-hidden">
        <div class="h-full bg-white/80 transition-[width]" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'

type Slide = { image: string; link?: string; title?: string; alt?: string }

const props = withDefaults(defineProps<{
  items: Slide[]
  interval?: number
  effect?: 'slide' | 'fade'
  height?: string
  styleHeight?: string
  rounded?: boolean
  autoplay?: boolean
  loop?: boolean
  showArrows?: boolean
  showDots?: boolean
  showProgress?: boolean
  ariaLabel?: string
  useNuxtImg?: boolean
  imgSizes?: string
  imgClass?: string
  dragActivation?: 'immediate' | 'longpress'
  longPressDelay?: number
}>(), {
  interval: 5000,
  effect: 'slide',
  height: 'h-48 md:h-64',
  styleHeight: '',
  rounded: true,
  autoplay: true,
  loop: true,
  showArrows: true,
  showDots: true,
  showProgress: true,
  ariaLabel: 'Image carousel',
  useNuxtImg: true,
  imgSizes: '(min-width: 768px) 100vw, 100vw',
  imgClass: 'w-full h-full object-cover',
  dragActivation: 'immediate',   // ✅ was a number before by mistake
  longPressDelay: 0
})

const active = ref(0)
const trackEl = ref<HTMLElement | null>(null)
const progress = ref(0)
const transitioning = ref(false)

// drag state
const startX = ref(0)
const currentX = ref(0)
const dragging = ref(false)
const activated = ref(false)
const width = ref(0)

const wrapperClass = computed(() => props.height)
const resolvedHeight = computed(() => props.styleHeight || '')

const translateX = computed(() => {
  if (props.effect !== 'slide') return 0
  const base = -active.value * width.value
  if (!dragging.value) return base
  const delta = currentX.value - startX.value
  return base + delta
})

// dot size adapts to count
const dotSizeClass = computed(() =>
  (props.items?.length || 0) > 12 ? 'w-1.5 h-1.5 sm:w-2 sm:h-2' : 'w-2.5 h-2.5'
)

// sizing
function sizeTrack() { if (trackEl.value) width.value = trackEl.value.clientWidth }

// nav
function next() { active.value < props.items.length - 1 ? setActive(active.value + 1) : props.loop && setActive(0) }
function prev() { active.value > 0 ? setActive(active.value - 1) : props.loop && setActive(props.items.length - 1) }
function go(i: number) { setActive(i) }
function setActive(i: number) {
  transitioning.value = true
  active.value = i
  window.setTimeout(() => (transitioning.value = false), 600)
  resetProgress()
}

// autoplay
let rafId: number | null = null
function startAutoplay() {
  if (!props.autoplay || props.items.length <= 1) return
  stopAutoplay()
  const start = performance.now()
  const dur = Math.max(1200, props.interval)
  const step = (t: number) => {
    const elapsed = t - start
    progress.value = Math.min(100, (elapsed / dur) * 100)
    if (elapsed >= dur) { next(); startAutoplay(); return }
    rafId = requestAnimationFrame(step)
  }
  rafId = requestAnimationFrame(step)
}
function stopAutoplay() { progress.value = 0; if (rafId) cancelAnimationFrame(rafId); rafId = null }
function pause() { stopAutoplay() }
function resume() { startAutoplay() }
function resetProgress() {
  stopAutoplay()
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  startAutoplay()
}

// prevent navigation if dragging
function onLinkClick(e: MouseEvent) {
  if (activated.value || dragging.value) e.preventDefault()
}

// pointer handlers (immediate)
function onPointerDown(e: PointerEvent) {
  if (!trackEl.value) return
  startX.value = e.clientX
  currentX.value = e.clientX
  activated.value = true
  dragging.value = (props.effect === 'slide')
  trackEl.value.setPointerCapture(e.pointerId)
  pause()
}
function onPointerMove(e: PointerEvent) { currentX.value = e.clientX }
function onPointerUp() {
  if (activated.value) {
    const delta = currentX.value - startX.value
    if (props.effect === 'slide') {
      const threshold = Math.max(40, width.value * 0.15)
      if (delta > threshold) prev()
      else if (delta < -threshold) next()
      else setActive(active.value)
    } else {
      const threshold = 30
      if (delta > threshold) prev()
      else if (delta < -threshold) next()
    }
  }
  dragging.value = false
  activated.value = false
  resume()
}

// watchers & lifecycle
watch(() => props.items.length, () => {
  if (active.value > props.items.length - 1) active.value = 0
  nextTick(sizeTrack)
  resetProgress()
})
onMounted(() => {
  sizeTrack()
  window.addEventListener('resize', sizeTrack, { passive: true })
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume())
  if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) startAutoplay()
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', sizeTrack)
  stopAutoplay()
})
</script>

<style scoped>
.cursor-grab { cursor: grab; }
.cursor-grabbing { cursor: grabbing; }
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
:deep(img) { -webkit-user-drag: none; user-select: none; }
</style>
