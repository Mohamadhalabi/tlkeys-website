<script setup lang="ts">
interface Category { title: string; href: string; image: string }

const props = withDefaults(defineProps<{
  title?: string
  items?: Category[]
  rows?: number | (() => number) // can accept computed from parent
  perRow?: number
  containerClass?: string
}>(), {
  title: 'Browse Categories',
  items: () => [],
  rows: 1,
  perRow: 5, // default to 5 per row
  containerClass: 'max-w-screen-2xl'
})

// figure out how many to show
const rowsResolved = computed<number>(() => {
  const r = typeof props.rows === 'function' ? (props.rows as any)() : props.rows
  return Number(r || 1)
})

const limit = computed(() => rowsResolved.value * (props.perRow ?? 5))
const visible = computed(() => (props.items || []).slice(0, limit.value))
</script>

<template>
  <section class="mt-8">
    <!-- Centered container -->
    <div class="mx-auto w-full" :class="containerClass">
      <h2 class="text-lg sm:text-xl font-bold mb-4 px-3 sm:px-4 text-center">
        {{ title }}
      </h2>

      <!-- Grid: 2/3/4/5 columns across breakpoints -->
      <div class="px-3 sm:px-4">
        <div
          class="grid gap-3 sm:gap-4 md:gap-5
                 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4"
        >
          <NuxtLink
            v-for="cat in visible"
            :key="cat.href + cat.title"
            :to="cat.href"
            class="group block rounded-2xl bg-white/95 ring-1 ring-black/5 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div class="flex items-center justify-between gap-4 px-5 py-4 md:px-6 md:py-5">
              <p class="font-semibold text-gray-900 tracking-tight text-[15px] sm:text-base md:text-lg leading-snug line-clamp-2">
                {{ cat.title }}
              </p>

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
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
