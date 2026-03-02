<template>
  <div v-if="isVisible" class="fixed bottom-0 left-0 w-full z-[9999] flex justify-center">
    <div class="w-full bg-white rounded-t-2xl shadow-[0_-4px_12px_rgba(0,0,0,0.1)] relative px-4 pt-6 pb-6 text-center font-sans">
      
      <button class="absolute top-2 right-3 bg-transparent border-none text-2xl text-gray-400 cursor-pointer hover:text-gray-600" @click="dismissModal" aria-label="Close">
        &times;
      </button>
      
      <div class="flex flex-col items-center">
        <p class="text-sm font-semibold text-gray-800 mb-4">{{ t('appModal.title') }}</p>
        
        <a :href="appLink" target="_blank" rel="noopener noreferrer" class="block w-full bg-orange-600 text-white no-underline text-sm font-bold py-3 rounded-lg text-center hover:bg-[#d96c15] transition-colors shadow-md">
          {{ t('appModal.button') }} 📲
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n' 

const { t } = useI18n() 

// Your actual app URLs
const IOS_LINK = 'https://apps.apple.com/app/techno-lock-keys/id6758512167'
const ANDROID_LINK = 'https://play.google.com/store/apps/details?id=com.technolockkeys.app'

const isVisible = ref(false)
const targetOS = ref<'iOS' | 'Android' | 'Other'>('Other')

// Dynamically set the link based on OS
const appLink = computed(() => targetOS.value === 'iOS' ? IOS_LINK : ANDROID_LINK)

onMounted(() => {
  // Check if user already dismissed it
  if (localStorage.getItem('bottomAppModalDismissed')) return

  // Detect OS on client-side
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera
  if (/android/i.test(ua)) {
    targetOS.value = 'Android'
  } else if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    targetOS.value = 'iOS'
  }
  // DELETED the temporary Mac testing code from here!

  // Only show the banner if they are actually on an iOS or Android device
  if (targetOS.value !== 'Other') {
    isVisible.value = true
  }
})

const dismissModal = () => {
  isVisible.value = false
  localStorage.setItem('bottomAppModalDismissed', 'true')
}
</script>