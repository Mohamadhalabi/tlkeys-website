<script setup lang="ts">
import { computed } from 'vue'
type VideoItem = { title?: string | null; url: string }
const props = defineProps<{ videos: VideoItem[] }>()

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v')
      return v ? `https://www.youtube.com/embed/${v}` : url
    }
    if (host === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`
    if (host === 'vimeo.com') return `https://player.vimeo.com/video/${u.pathname.replace('/', '')}`
    return url
  } catch { return url }
}
const normalized = computed(() => (props.videos || []).map(v => ({ ...v, src: toEmbedUrl(v.url) })))
</script>

<template>
  <div>
    <div v-if="normalized.length" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div v-for="(v, i) in normalized" :key="i" class="space-y-2">
        <div class="aspect-video overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <iframe
            class="h-full w-full"
            :src="v.src"
            title="video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
        <div v-if="v.title" class="text-sm text-gray-700">{{ v.title }}</div>
      </div>
    </div>
    <div v-else class="text-gray-500">No videos.</div>
  </div>
</template>
