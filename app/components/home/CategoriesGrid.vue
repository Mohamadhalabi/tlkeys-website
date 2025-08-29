<script setup lang="ts">
interface Category { title: string; href: string; image: string }

const props = withDefaults(defineProps<{
  title?: string
  items?: Category[]
  rows?: number | (() => number)
  perRow?: number
  containerClass?: string
}>(), {
  title: 'Browse Categories',
  items: () => [],
  rows: 1,
  perRow: 5,
  containerClass: 'max-w-screen-2xl'
})

const rowsResolved = computed<number>(() => {
  const r = typeof props.rows === 'function' ? (props.rows as any)() : props.rows
  return Number(r || 1)
})

const limit = computed(() => rowsResolved.value * (props.perRow ?? 5))
const visible = computed(() => (props.items || []).slice(0, limit.value))
</script>

<template>
  <section class="mt-8">
    <div class="mx-auto w-full" :class="containerClass">
      <h2 class="text-lg sm:text-xl font-bold mb-4 px-3 sm:px-4 text-center">
        {{ title }}
      </h2>

      <div class="px-3 sm:px-4">
        <div
          class="grid gap-2 sm:gap-1 md:gap-3
                 grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6"
        >
          <NuxtLinkLocale
            v-for="cat in visible"
            :key="cat.href + cat.title"
            :to="cat.href"
            class="group block h-full rounded-2xl bg-white/95 ring-1 ring-black/5 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <!-- Centered layout -->
            <div class="flex h-full flex-col items-center justify-center gap-3 px-5 py-5 md:px-6 md:py-6 text-center">
              <div
                class="relative shrink-0 size-20 md:size-24 rounded-xl overflow-hidden ring-1 ring-black/5
                       bg-gradient-to-br from-gray-50 to-white"
              >
                <NuxtImg
                  :src="cat.image"
                  alt=""
                  class="absolute inset-0 h-full w-full object-contain p-2"
                />
              </div>

              <p class="font-semibold text-gray-900 tracking-tight sm:text-base md:text-md leading-snug line-clamp-2">
                {{ cat.title }}
              </p>
            </div>
          </NuxtLinkLocale>
        </div>
      </div>
    </div>
  </section>
</template>
