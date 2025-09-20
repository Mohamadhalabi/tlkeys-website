<script setup lang="ts">
import type { NuxtError } from '#app'
import { useHead, clearError } from '#imports'

const props = defineProps<{ error: NuxtError }>()
const code = Number(props.error?.statusCode ?? 500)
const is404 = code === 404
const is410 = code === 410

const title =
  is404 ? 'Page not found'
: is410 ? 'This page is no longer available'
:         'Something went wrong'

const message =
  (props.error?.statusMessage as string)
  || (is404 ? 'We couldn’t find what you’re looking for.'
      : is410 ? 'This product is no longer available.'
      : 'Please try again in a moment.')

useHead({
  title,
  meta: [
    { name: 'robots', content: 'noindex, nofollow, noarchive' },
    { name: 'description', content: message }
  ]
})

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <!-- 👇 This makes the error page use layouts/default.vue -->
  <NuxtLayout name="default">
    <div class="min-h-[70vh] grid place-items-center px-6 py-16">
      <div class="max-w-xl text-center">
        <div
          class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium border"
          :class="[
            code === 404 ? 'bg-blue-50 text-blue-700 border-blue-200'
          : code === 410 ? 'bg-amber-50 text-amber-700 border-amber-200'
          :                 'bg-red-50 text-red-700 border-red-200'
          ]"
        >
          <span class="font-semibold">{{ code }}</span>
          <span v-if="code === 404">Not Found</span>
          <span v-else-if="code === 410">Gone</span>
          <span v-else>Error</span>
        </div>

        <h1 class="mt-6 text-3xl md:text-4xl font-semibold tracking-tight">
          {{ title }}
        </h1>

        <p class="mt-3 text-gray-600">
          {{ message }}
        </p>

        <div class="mt-8">
          <button
            type="button"
            class="rounded-xl bg-orange-500 text-white px-6 py-3 font-medium hover:bg-orange-600"
            @click="goHome"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
