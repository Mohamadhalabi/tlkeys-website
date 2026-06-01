<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  mpn: { type: String, required: true },
  height: { type: Number, default: 12 },   // tweak to match SKU text
  color:  { type: String, default: '#1d4ed8' },
})

const dataUrl = ref('')
const imgH = ref(0)
const copied = ref(false)

function render() {
  if (typeof document === 'undefined') return
  const text = (props.mpn || '').trim()
  if (!text) { dataUrl.value = ''; return }

  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const fontSize = props.height
  const font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`

  const measure = document.createElement('canvas').getContext('2d')
  measure.font = font
  const padX = 1
  const cssW = Math.ceil(measure.measureText(text).width) + padX * 2
  const cssH = Math.ceil(fontSize * 1.25)

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(cssW * dpr)
  canvas.height = Math.ceil(cssH * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.font = font
  ctx.fillStyle = props.color
  ctx.textBaseline = 'middle'
  ctx.fillText(text, padX, cssH / 2)

  dataUrl.value = canvas.toDataURL('image/png')
  imgH.value = cssH
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(props.mpn)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy MPN', err)
  }
}

onMounted(render)
watch(() => [props.mpn, props.height, props.color], render)
</script>

<template>
  <div
    data-nosnippet
    class="relative inline-flex items-center justify-center cursor-pointer group"
    @click.prevent="copyToClipboard"
    title="Click to copy part number"
  >
    <img
      v-if="dataUrl"
      :src="dataUrl"
      :style="{ height: imgH + 'px', width: 'auto' }"
      alt="part number"
      decoding="async"
      class="block select-none transition-opacity group-hover:opacity-80"
      draggable="false"
    />

    <span
      v-if="copied"
      class="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap z-50 pointer-events-none"
    >
      Copied!
    </span>
  </div>
</template>