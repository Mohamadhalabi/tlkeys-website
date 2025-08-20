<script setup lang="ts">
import { ref, computed } from 'vue'

type Img = { src: string; alt?: string; id?: number; w?: number; h?: number }

const props = defineProps<{
  images: Img[]
  maxWidth?: number
  maxHeight?: number
}>()

const activeIndex = ref(0)
const activeImage = computed(() => props.images?.[activeIndex.value])

function nextImage() {
  if (!props.images?.length) return
  activeIndex.value = (activeIndex.value + 1) % props.images.length
}
function prevImage() {
  if (!props.images?.length) return
  activeIndex.value = (activeIndex.value - 1 + props.images.length) % props.images.length
}

const boxStyle = computed(() => {
  const w = props.maxWidth ?? 680
  const h = props.maxHeight ?? 520
  return { maxWidth: w + 'px', height: h + 'px' }
})
</script>

<template>
  <div class="space-y-4">
    <div class="relative group rounded-2xl overflow-hidden bg-white border border-gray-200 mx-auto shadow-sm" :style="boxStyle">
      <NuxtImg
        :src="activeImage?.src"
        :alt="activeImage?.alt || 'image'"
        format="webp"
        class="w-full h-full object-contain"
        loading="eager"
      />
      <button
        type="button"
        class="absolute top-1/2 -translate-y-1/2 start-3 rounded-full p-2 bg-white/90 hover:bg-white shadow"
        aria-label="Previous image"
        @click="prevImage"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01.02 1.06L9.11 10l3.7 3.71a.75.75 0 11-1.06 1.06l-4.24-4.25a.75.75 0 010-1.06l4.24-4.24a.75.75 0 011.06.01z" clip-rule="evenodd"/></svg>
      </button>
      <button
        type="button"
        class="absolute top-1/2 -translate-y-1/2 end-3 rounded-full p-2 bg-white/90 hover:bg-white shadow"
        aria-label="Next image"
        @click="nextImage"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 5.23a.75.75 0 011.06-.02l4.24 4.24c.29.29.29.77 0 1.06l-4.24 4.25a.75.75 0 11-1.06-1.06L10.89 10 7.21 6.29a.75.75 0 01-.02-1.06z" clip-rule="evenodd"/></svg>
      </button>
    </div>

    <div class="flex gap-3 overflow-auto py-1 pe-1">
      <button
        v-for="(img, idx) in images"
        :key="(img.id ?? idx) + '-' + img.src"
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
</template>

<style scoped>
::-webkit-scrollbar { height: 8px; }
::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 9999px; }
</style>
