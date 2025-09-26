<!-- app.vue -->
<script setup lang="ts">
import { useHead, useLocaleHead } from '#imports'
import AlertContainer from '../app/components/common/AlertContainer.vue'
import BackToTop from './components/ui/BackToTop.vue'

const i18nHead = useLocaleHead({
  addDirAttribute: true,   // ✅ <html dir="ltr/rtl">
  addSeoAttributes: true,  // ✅ og:locale, alternates, etc.
})

useHead(() => ({
  // ✅ fixes Seobility “Language detected es, HTML says en”
  htmlAttrs: i18nHead.value.htmlAttrs,
  // ✅ correct, absolute hreflang alternates for every route
  link: i18nHead.value.link,
  meta: i18nHead.value.meta,
}))
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="orange" :height="10" />
    <div id="page-wrap" class="min-h-dvh overflow-x-clip">
      <NuxtPage />
    </div>
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
