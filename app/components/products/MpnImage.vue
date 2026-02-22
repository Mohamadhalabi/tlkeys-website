<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  mpn: {
    type: String,
    required: true
  }
})

// State for the copy tooltip
const copied = ref(false)

// Function to copy text silently
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.mpn)
    copied.value = true
    
    // Reset tooltip after 2 seconds
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy MPN', err)
  }
}

// Generate the invisible text image
const mpnDataUri = computed(() => {
  const estimatedWidth = Math.max(30, props.mpn.length * 8 + 4)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${estimatedWidth}" height="16">
                 <text x="0" y="12" fill="#1d4ed8" font-family="system-ui, -apple-system, sans-serif" font-size="12px" font-weight="600">${props.mpn}</text>
               </svg>`
  const encodedSvg = encodeURIComponent(svg)
  return `data:image/svg+xml;charset=utf-8,${encodedSvg}`
})
</script>

<template>
  <div 
    class="relative inline-flex items-center justify-center cursor-pointer group"
    @click.prevent="copyToClipboard"
  >
    <img :src="mpnDataUri" alt="" class="block h-[16px] w-auto transition-opacity group-hover:opacity-80" />
    
    <span 
      v-if="copied" 
      class="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap z-50 pointer-events-none"
    >
      Copied!
    </span>
  </div>
</template>