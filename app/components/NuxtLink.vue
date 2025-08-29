<!-- components/NuxtLink.vue -->
<template>
  <!-- use RouterLink to avoid recursion -->
  <RouterLink v-bind="$attrs" :to="finalTo"><slot /></RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useLocalePath } from '#i18n'

// make sure Nuxt registers this as "NuxtLink"
defineOptions({ name: 'NuxtLink' })

type To =
  | string
  | { name?: string; path?: string; params?: any; query?: any; hash?: string }

const props = defineProps<{ to: To }>()

const localePath = useLocalePath()

const isExternal = (to: To) =>
  typeof to === 'string' &&
  (/^(https?:)?\/\//i.test(to) || /^(mailto:|tel:)/i.test(to))

const alreadyLocalized = (p: string) =>
  /^\/(en|ar|es|fr|ru|de)(\/|$)/.test(p)

const finalTo = computed<To>(() => {
  const to = props.to
  if (isExternal(to)) return to

  if (typeof to === 'string') {
    if (!to || to.startsWith('#')) return to
    if (alreadyLocalized(to)) return to
    return localePath(to)
  }
  // route object is fine to pass to localePath
  return localePath(to as any)
})
</script>
