<template>
  <div class="bg py-3">
    <div class="mx-auto px-6 max-w-screen-xl flex items-center justify-between gap-6 relative">
      <!-- Logo -->
      <NuxtLink to="/" class="website-logo flex items-center justify-center">
        <NuxtImg
          src="/images/logo/techno-lock-desktop-logo.webp"
          alt="Logo"
          class="h-full object-contain"
        />
      </NuxtLink>

      <!-- Search with Category -->
      <div class="flex-1 max-w-3xl flex rounded-full overflow-hidden bg-white border border-gray-300">
        <input
          type="text"
          class="flex-1 px-4 py-2 text-sm focus:outline-none"
          :placeholder="typedText"
        />
        <button class="px-4 flex items-center justify-center bg-red-600 text-white">
          <MagnifyingGlassIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Wishlist / Account / Cart -->
      <div class="flex items-center gap-6 text-sm text-gray-700">
        <!-- Login / Account switch -->
        <NuxtLink
          v-if="!isAuthed"
          to="/auth/login-register"
          class="flex items-center gap-1"
        >
          <UserPlusIcon class="w-5 h-5" />
          <span>{{ t('logIn') }}</span>
        </NuxtLink>

        <NuxtLink
          v-else
          to="/account"
          class="flex items-center gap-1"
        >
          <UserPlusIcon class="w-5 h-5" />
          <span>{{ t('account') }}</span>
        </NuxtLink>

        <NuxtLink to="/wishlist" class="flex items-center gap-1">
          <HeartIcon class="w-5 h-5" />
          <span>{{ t('wishlist') }}</span>
        </NuxtLink>

        <NuxtLink to="/cart" class="flex items-center gap-1 relative">
          <ShoppingCartIcon class="w-5 h-5" />
          <span>{{ t('cart') }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '~/composables/useAuth'
import {
  HeartIcon,
  UserPlusIcon,
  ShoppingCartIcon,
  MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'

const { t, locale } = useI18n()
const auth = useAuth()

// ensure we have auth state after hard refresh (safe even if you also hydrate in a plugin)
onMounted(() => auth.hydrate?.())

const isAuthed = computed(() => auth.isAuthenticated?.value ?? false)

/* ---------- Typewriter placeholder ---------- */
// phrases react to locale changes
const phrases = computed(() => [
  t('searchPlaceholder'),
  t('carRemotes'),
  t('keyCuttingMachines'),
  t('accessoriesTools'),
])

const typedText = ref('')
let phraseIndex = 0
let charIndex = 0
let deleting = false
let timerId

function tick() {
  const list = phrases.value
  const current = list[phraseIndex] || ''
  if (!deleting) {
    typedText.value = current.substring(0, charIndex + 1)
    charIndex++
    if (charIndex >= current.length) {
      deleting = true
      timerId = setTimeout(tick, 1200)
      return
    }
  } else {
    typedText.value = current.substring(0, Math.max(0, charIndex - 1))
    charIndex--
    if (charIndex <= 0) {
      deleting = false
      phraseIndex = (phraseIndex + 1) % list.length
    }
  }
  timerId = setTimeout(tick, deleting ? 45 : 90)
}

function startTyping() {
  stopTyping()
  phraseIndex = 0
  charIndex = 0
  deleting = false
  tick()
}
function stopTyping() {
  if (timerId) clearTimeout(timerId)
  timerId = null
}

onMounted(startTyping)
onBeforeUnmount(stopTyping)

// restart on language change so text switches immediately
watch(() => locale.value, () => {
  startTyping()
})
</script>
