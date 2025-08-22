<script setup lang="ts">
import AlertContainer from '../app/components/common/AlertContainer.vue'
import BackToTop from './components/ui/BackToTop.vue';
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="orange" height="10" />
    <NuxtPage />
    <BackToTop />
    <AlertContainer />
  </NuxtLayout>
</template>
