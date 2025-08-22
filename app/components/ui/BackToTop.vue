<script setup lang="ts">
const show = ref(false)

// Show after you’ve scrolled X px
const THRESHOLD = 400

function onScroll() {
  const y = window.scrollY || window.pageYOffset
  show.value = y > THRESHOLD
}

function goTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <transition
    enter-active-class="transition duration-200"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <button
      v-if="show"
      @click="goTop"
      type="button"
      aria-label="Scroll to top"
      class="fixed left-4 bottom-4 z-50
             inline-flex items-center justify-center
             h-11 w-11 rounded-full
             bg-gray-600 text-white shadow-lg
             hover:bg-gray-700 active:bg-gray-800
             ring-1 ring-black/10
             focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300"
    >
      <!-- Up Arrow -->
      <svg viewBox="0 0 20 20" class="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd"
              d="M10 4.5a.75.75 0 01.53.22l4.75 4.75a.75.75 0 11-1.06 1.06L10.75 6.56V15a.75.75 0 01-1.5 0V6.56L5.78 10.53a.75.75 0 01-1.06-1.06l4.75-4.75A.75.75 0 0110 4.5z"
              clip-rule="evenodd" />
      </svg>
    </button>
  </transition>
</template>