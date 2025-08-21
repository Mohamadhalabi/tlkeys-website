<script setup lang="ts">
import AlertContainer from '../app/components/common/AlertContainer.vue' // or the correct path
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="orange" height="10" />
    <NuxtPage />
    <AlertContainer />
  </NuxtLayout>
</template>
