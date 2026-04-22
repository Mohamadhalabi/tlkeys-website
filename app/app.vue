<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from '#imports'
import { useHead, useLocaleHead } from '#imports'
import AlertContainer from '../app/components/common/AlertContainer.vue'
import BackToTop from './components/ui/BackToTop.vue'

const route = useRoute()

// Update these numbers manually every few weeks/months
const googleRating = ref(4.5)
const googleReviewCount = ref(99)

const { refreshRates } = useCurrency()
if (process.client) {
  onMounted(() => {
    refreshRates()
  })
}

const i18nHead = useLocaleHead({
  addDirAttribute: true,
  addSeoAttributes: true,
})
useScriptGoogleTagManager({
  id: 'GTM-PWSSMVC7'
})
useHead(() => {
  const pageParam = Number(route.query.page || 1)
  return {
    htmlAttrs: i18nHead.value.htmlAttrs,
    link: pageParam <= 1 ? i18nHead.value.link : [],
    meta: pageParam <= 1 ? i18nHead.value.meta : []
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="orange" :height="10" />
    <div id="page-wrap" class="min-h-dvh overflow-x-clip relative">
      <NuxtPwaAssets />
      <NuxtPage />

      <a 
        href="https://g.page/r/CfkHNOyn0dXBEAE/review" 
        target="_blank"
        class="fixed z-40 flex items-center bg-white shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-gray-100 transition-all duration-200 hover:scale-105 hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]
               top-[180px] right-0 rounded-l-full pl-2.5 pr-1.5 py-1.5 gap-1
               sm:top-auto sm:bottom-36 sm:right-6 sm:rounded-full sm:px-3 sm:py-2.5"
        title="See our reviews on Google"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="w-4 h-4 sm:w-5 sm:h-5 sm:mr-1">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        
        <span class="font-bold text-gray-800 text-[13px] sm:text-[15px] leading-none">{{ googleRating }}</span>
        
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FBBC05" class="w-3.5 h-3.5 sm:w-4 sm:h-4 mb-[1px] sm:mb-[2px]">
          <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/>
        </svg>
        
        <span class="hidden sm:inline text-[13px] text-gray-500 hover:text-blue-600 underline ml-0.5 leading-none">({{ googleReviewCount }})</span>
      </a>

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