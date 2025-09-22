<script setup lang="ts">
import AlertContainer from '../app/components/common/AlertContainer.vue'
import BackToTop from './components/ui/BackToTop.vue'
import FloatingCoupon from './components/ui/FloatingCoupon.vue'
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="orange" :height="10" />

    <div id="page-wrap" class="min-h-dvh overflow-x-clip">
      <NuxtPage />
    </div>

    <!-- Floating widgets -->
    <FloatingCoupon />
    <BackToTop />
    <AlertContainer />
  </NuxtLayout>
</template>

<style>
@supports not (overflow: clip) {
  #page-wrap { overflow-x: hidden; }
}
.pc-stage { overflow: hidden; }
img, svg, video, canvas { max-width: 100%; height: auto; display: block; }
</style>
