<template>
  <div class="bg-white py-2 shadow-sm">
    <div class="mx-auto px-4 flex items-center justify-between">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center">
        <NuxtImg
          src="/images/logo/techno-lock-desktop-logo.webp"
          alt="Logo"
          class="h-8 object-contain"
        />
      </NuxtLink>

      <!-- Right side: Search + Account + Cart -->
      <div class="flex items-center gap-3">
        <!-- Search icon -->
        <button @click="toggleSearch" aria-label="Search">
          <MagnifyingGlassIcon class="w-6 h-6 text-gray-700" />
        </button>

        <!-- Account -->
        <NuxtLink to="/account" class="flex items-center">
          <UserPlusIcon class="w-6 h-6 text-gray-700" />
        </NuxtLink>

        <!-- Cart -->
        <NuxtLink to="/cart" class="relative flex items-center">
          <ShoppingCartIcon class="w-6 h-6 text-gray-700" />
        </NuxtLink>
      </div>
    </div>

    <!-- Search overlay -->
    <transition name="fade">
      <div v-if="searchOpen" class="absolute inset-0 bg-white z-50 p-4 flex items-center gap-2">
        <input
          v-model="searchTerm"
          type="text"
          :placeholder="t('searchPlaceholder')"
          class="flex-1 px-3 py-2 border border-gray-300 rounded"
        />
        <button class="px-3 py-2 bg-red-600 text-white rounded" @click="doSearch">
          {{ t('search') }}
        </button>
        <button @click="searchOpen = false" class="px-2 py-2">
          ✕
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  ShoppingCartIcon,
} from '@heroicons/vue/24/outline'

const { t } = useI18n()
const searchOpen = ref(false)
const searchTerm = ref('')

function toggleSearch() {
  searchOpen.value = !searchOpen.value
}
function doSearch() {
  if (!searchTerm.value.trim()) return
  navigateTo(`/search?q=${encodeURIComponent(searchTerm.value)}`)
  searchOpen.value = false
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
