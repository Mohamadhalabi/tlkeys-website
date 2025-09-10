<script setup lang="ts">
import AlertContainer from '../app/components/common/AlertContainer.vue'
import BackToTop from './components/ui/BackToTop.vue'
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="orange" height="10" />

    <!-- clamp horizontal overflow ONLY for page content -->
    <div id="page-wrap" class="min-h-dvh overflow-x-clip">
      <NuxtPage />
    </div>

    <BackToTop />
    <AlertContainer />
  </NuxtLayout>
</template>

<style>
/* keep viewport normal so sticky/positioned menus work */


/* fallback for browsers without overflow-clip */
@supports not (overflow: clip) {
  #page-wrap { overflow-x: hidden; }
}

/* extra guard for common offenders */
.pc-stage { overflow: hidden; }                 /* carousel stage */
img, svg, video, canvas { max-width: 100%; height: auto; display: block; }
</style>
