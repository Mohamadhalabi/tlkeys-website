<script setup lang="ts">
const props = defineProps<{ canLoadMore:boolean; pending:boolean }>()
const emit = defineEmits<{ (e:'loadMore'):void }>()
const sentinel = ref<HTMLElement|null>(null)

onMounted(() => {
  const io = new IntersectionObserver((entries) => {
    const [entry] = entries
    if (!entry?.isIntersecting) return
    if (!props.canLoadMore || props.pending) return
    emit('loadMore')
  }, { rootMargin: '300px 0px 300px 0px' })
  if (sentinel.value) io.observe(sentinel.value)
  onBeforeUnmount(() => io.disconnect())
})
</script>

<template>
  <div class="mt-6 flex flex-col items-center gap-3">
    <div ref="sentinel" class="h-1 w-full"></div>
    <div v-if="pending" class="text-sm text-gray-500">Loading…</div>
    <button v-else-if="canLoadMore" class="px-4 py-2 border rounded-lg hover:bg-gray-50" @click="emit('loadMore')">
      Load more
    </button>
    <div v-else class="text-sm text-gray-500">No more</div>
  </div>
</template>
