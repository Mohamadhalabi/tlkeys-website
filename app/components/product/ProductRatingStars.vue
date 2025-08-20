<script setup lang="ts">
const props = defineProps<{ value: number }>()
const stars = computed(() => Math.max(0, Math.min(5, Math.round(props.value))))
</script>

<template>
  <div class="flex items-center gap-1" :aria-label="`Rating: ${stars} out of 5`">
    <svg
      v-for="i in 5"
      :key="i"
      xmlns="http://www.w3.org/2000/svg"
      class="w-4 h-4"
      :class="i <= stars ? 'fill-yellow-400' : 'fill-gray-300'"
      viewBox="0 0 20 20"
    >
      <path
        d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.036a1 1 0 00-1.176 0l-2.802 2.036c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81H6.93a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  </div>
</template>
