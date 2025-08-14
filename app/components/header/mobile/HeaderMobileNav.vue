<template>
  <div class="bg-gray-900 text-white">
    <div class="flex items-center justify-between px-4 py-3">
      <!-- Hamburger -->
      <button @click="drawerOpen = true" aria-label="Menu">
        ☰
      </button>
      <span class="text-lg font-semibold">{{ t('menu') }}</span>
      <div class="w-6"></div> <!-- spacer -->
    </div>

    <!-- Drawer -->
    <transition name="slide">
      <div
        v-if="drawerOpen"
        class="fixed inset-0 z-50 flex"
        @click.self="drawerOpen = false"
      >
        <!-- Side panel -->
        <div class="bg-white text-gray-900 w-72 max-w-full h-full shadow-lg overflow-y-auto p-4">
          <!-- Close -->
          <div class="flex justify-end mb-4">
            <button @click="drawerOpen = false">✕</button>
          </div>
          <!-- Menu links -->
          <ul class="space-y-4">
            <li><NuxtLink to="/" @click="close">{{ t('home') }}</NuxtLink></li>
            <li><NuxtLink to="/cars" @click="close">{{ t('cars') }}</NuxtLink></li>
            <li><NuxtLink to="/manufacturers" @click="close">{{ t('manufacturers') }}</NuxtLink></li>
            <li><NuxtLink to="/keys-remotes" @click="close">{{ t('keysRemotes') }}</NuxtLink></li>
            <li><NuxtLink to="/devices-machines" @click="close">{{ t('devicesMachines') }}</NuxtLink></li>
            <li><NuxtLink to="/accessories-tools" @click="close">{{ t('accessoriesTools') }}</NuxtLink></li>
            <li><NuxtLink to="/software-tokens" @click="close">{{ t('softwareTokens') }}</NuxtLink></li>
            <li><NuxtLink to="/downloads" @click="close">{{ t('downloads') }}</NuxtLink></li>
            <li><NuxtLink to="/pincode" @click="close">{{ t('pincode') }}</NuxtLink></li>
          </ul>
        </div>
        <!-- Backdrop -->
        <div class="flex-1 bg-black bg-opacity-50" @click="drawerOpen = false"></div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const drawerOpen = ref(false)

function close() {
  drawerOpen.value = false
}
</script>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: transform .2s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }
</style>
