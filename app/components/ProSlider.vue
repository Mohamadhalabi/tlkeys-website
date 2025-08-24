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
    @keydown.enter.prevent="openLink(items[active]?.link)"
    @mouseenter="pause()"
    @mouseleave="resume()"
  >
    <!-- Viewport -->
    <div class="relative overflow-hidden" :class="rounded ? 'rounded-2xl' : ''">
      <!-- Slide effect -->
      <div
        v-if="effect === 'slide'"
        ref="trackEl"
        class="whitespace-nowrap will-change-transform"
        :class="transitioning ? 'transition-transform duration-600 ease-out' : ''"
        :style="{ transform: `translate3d(${translateX}px,0,0)`, touchAction: 'pan-y' }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @pointerleave="onPointerLeave"
      >
        <div
          v-for="(s, i) in items"
          :key="i"
          class="inline-block align-top w-full"
          :aria-hidden="active !== i"
        >
          <!-- Just the image; navigation handled in pointerup -->
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
        </div>
      </div>

      <!-- Fade effect -->
      <div
        v-else
        ref="trackEl"
        class="relative"
        :style="{ height: resolvedHeight, touchAction: 'pan-y' }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @pointerleave="onPointerLeave"
      >
        <div
          v-for="(s, i) in items"
          :key="`fade-${i}`"
          class="absolute inset-0 transition-opacity duration-700 ease-out"
          :class="i === active ? 'opacity-100 z-10' : 'opacity-0 z-0'"
          :aria-hidden="active !== i"
        >
          <NuxtImg
            v-if="useNuxtImg"
            :src="s.image"
            :alt="s.alt || s.title || ''"
            :sizes="imgSizes"
            :class="imgClass + ' h-full w-full'"
            :loading="i === active ? 'eager' : 'lazy'"
            decoding="async"
            :draggable="false"
          />
          <img
            v-else
            :src="s.image"
            :alt="s.alt || s.title || ''"
            :class="imgClass + ' h-full w-full'"
            :loading="i === active ? 'eager' : 'lazy'"
            decoding="async"
            draggable="false"
          />
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

      <!-- Dots -->
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
            :class="[ dotSizeClass, i === active ? 'bg-white' : 'bg-white/50 hover:bg-white/70' ]"
            @click="go(i)"
            role="tab"
            :aria-selected="i === active"
            :aria-controls="`slide-${i}`"
          />
        </div>
      </div>

      <!-- Progress -->
      <div v-if="autoplay && showProgress" class="absolute left-3 right-3 sm:left-4 sm:right-4 bottom-0 h-1 bg-black/20 rounded-full overflow-hidden">
        <div class="h-full bg-white/80 transition-[width]" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useRouter } from '#imports'

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
  dragActivation: 'immediate',
  longPressDelay: 0
})

const router = useRouter()

const active = ref(0)
const trackEl = ref<HTMLElement | null>(null)
const progress = ref(0)
const transitioning = ref(false)

// drag / tap state
const startX = ref(0)
const startY = ref(0)
const currentX = ref(0)
const currentY = ref(0)
const dragging = ref(false)
const activated = ref(false)
const isPointerDown = ref(false)
const moved = ref(false)
const width = ref(0)
const downTime = ref(0)

// thresholds
const CLICK_MOVE_PX = 8
const CLICK_TIME_MS = 350

const wrapperClass = computed(() => props.height)
const resolvedHeight = computed(() => props.styleHeight || '')

const translateX = computed(() => {
  if (props.effect !== 'slide') return 0
  const base = -active.value * width.value
  if (!dragging.value) return base
  const delta = currentX.value - startX.value
  return base + delta
})

const dotSizeClass = computed(() =>
  (props.items?.length || 0) > 12 ? 'w-1.5 h-1.5 sm:w-2 sm:h-2' : 'w-2.5 h-2.5'
)

function sizeTrack() {
  if (trackEl.value) width.value = trackEl.value.clientWidth
}

// nav
function next() {
  active.value < props.items.length - 1 ? setActive(active.value + 1) : props.loop && setActive(0)
}
function prev() {
  active.value > 0 ? setActive(active.value - 1) : props.loop && setActive(props.items.length - 1)
}
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

// link opening
function isInternal(href?: string) {
  if (!href) return false
  return !/^https?:\/\//i.test(href) && !href.startsWith('//')
}
function openLink(href?: string) {
  if (!href || href === '#') return
  if (isInternal(href)) router.push(href)
  else window.location.assign(href)
}

// pointer handlers
function onPointerDown(e: PointerEvent) {
  if (!trackEl.value) return
  isPointerDown.value = true
  moved.value = false
  startX.value = e.clientX
  startY.value = e.clientY
  currentX.value = e.clientX
  currentY.value = e.clientY
  downTime.value = performance.now()
  activated.value = true
  dragging.value = (props.effect === 'slide')
  trackEl.value.setPointerCapture?.(e.pointerId)
  pause()
}

function onPointerMove(e: PointerEvent) {
  if (!isPointerDown.value) return
  currentX.value = e.clientX
  currentY.value = e.clientY
  if (!moved.value) {
    const dx = currentX.value - startX.value
    const dy = currentY.value - startY.value
    if (Math.hypot(dx, dy) > CLICK_MOVE_PX) moved.value = true
  }
}

function onPointerUp(e: PointerEvent) {
  if (!isPointerDown.value) return
  const dx = currentX.value - startX.value
  const adx = Math.abs(dx)
  const ady = Math.abs(currentY.value - startY.value)
  const duration = performance.now() - downTime.value

  // Swipe behavior
  if (props.effect === 'slide') {
    const swipeThreshold = Math.max(40, width.value * 0.15)
    if (adx > CLICK_MOVE_PX) {
      // treat as drag/swipe
      if (dx > swipeThreshold) prev()
      else if (dx < -swipeThreshold) next()
      else setActive(active.value)
    } else {
      // no horizontal movement → possible tap
      if (adx < CLICK_MOVE_PX && ady < CLICK_MOVE_PX && duration < CLICK_TIME_MS) {
        openLink(props.items[active.value]?.link)
      }
    }
  } else {
    // fade: allow slight horizontal swipe too
    const swipeThreshold = 30
    if (dx > swipeThreshold) prev()
    else if (dx < -swipeThreshold) next()
    else if (adx < CLICK_MOVE_PX && ady < CLICK_MOVE_PX && duration < CLICK_TIME_MS) {
      openLink(props.items[active.value]?.link)
    }
  }

  dragging.value = false
  activated.value = false
  isPointerDown.value = false
  resume()
}

function onPointerCancel() {
  dragging.value = false
  activated.value = false
  isPointerDown.value = false
  resume()
}
function onPointerLeave() {
  if (!isPointerDown.value) return
  onPointerUp(new PointerEvent('pointerup'))
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
