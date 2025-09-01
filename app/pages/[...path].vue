<script setup lang="ts">
import { setHeader, setResponseStatus } from 'h3'

// Only for server requests (SSR)
if (process.server) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, 410, 'Gone')
    setHeader(event, 'x-robots-tag', 'noindex, nofollow')
  }
}

useSeoMeta({
  title: '410 — Gone',
  description: 'This page has been removed or is no longer available.',
  robots: 'noindex, nofollow',
  ogTitle: '410 — Gone',
  ogDescription: 'This page has been removed or is no longer available.',
  ogType: 'website'
})
</script>

<template>
  <main class="min-h-[70vh] grid place-items-center px-6 py-16">
    <div class="text-center">
      <p class="text-7xl font-bold tracking-tight">410</p>
      <h1 class="mt-3 text-2xl font-semibold">Gone</h1>
      <p class="mt-2 text-gray-500">
        This page has been removed or is no longer available.
      </p>
      <NuxtLink
        to="/"
        class="mt-6 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
      >
        Go back home
      </NuxtLink>
    </div>
  </main>
</template>
