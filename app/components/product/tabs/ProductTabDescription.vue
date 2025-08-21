<script setup lang="ts">
defineProps<{ html: string }>()
</script>

<template>
  <div>
    <div v-if="html" class="prose max-w-none" v-html="html"></div>
    <div v-else class="text-gray-500">No description.</div>
  </div>
</template>