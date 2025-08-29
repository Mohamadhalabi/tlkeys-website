<script setup lang="ts">
interface Category { title: string; href: string; image: string }
const props = defineProps<{ item: Category }>()
</script>

<template>
  <NuxtLinkLocale
    :to="item.href"
    :aria-label="`Browse ${item.title}`"
    class="block rounded-2xl bg-white/95 ring-1 ring-black/5 shadow-[0_1px_1px_rgba(0,0,0,0.05)]
           transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.12)]
           focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60"
  >
    <div class="flex items-center justify-between gap-4 px-5 py-4 md:px-6 md:py-5 min-h-[96px] md:min-h-[112px]">
      <!-- text -->
      <div class="min-w-0">
        <p class="font-semibold text-gray-900 tracking-tight text-[15px] sm:text-base ">
          {{ item.title }}
        </p>
      </div>

      <!-- image box: fixed width 100px, centered content -->
      <div
        class="shrink-0 w-[100px] h-16 md:h-20 rounded-xl overflow-hidden
               ring-1 ring-black/5 bg-gradient-to-br from-gray-50 to-white
               flex items-center justify-center"
      >
        <!-- If you don't use @nuxt/image, swap NuxtImg with img -->
        <NuxtImg
          :src="item.image"
          alt=""
          class="max-w-full max-h-full object-contain"
          width="125"
          height="125"
          loading="lazy"
        />
      </div>
    </div>
  </NuxtLinkLocale>
</template>
