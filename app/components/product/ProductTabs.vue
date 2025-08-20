<script setup lang="ts">
import ProductRatingStars from './ProductRatingStars.vue'

type Review = { id: number | string; author_name: string; rating: number; content: string; created_at?: string }
type FAQ = { q: string; a: string }

const props = defineProps<{
  description?: string | null
  faq: FAQ[]
  reviews: Review[]
}>()

const current = ref<'description' | 'faq' | 'reviews'>('description')
</script>

<template>
  <div class="border border-gray-200 rounded-2xl overflow-hidden">
    <div class="overflow-x-auto">
      <div class="flex gap-2 p-2 bg-gray-50">
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-sm font-medium transition"
          :class="current === 'description' ? 'bg-white border border-gray-200 shadow' : 'hover:bg-white/60'"
          @click="current = 'description'"
        >
          Description
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-sm font-medium transition"
          :class="current === 'faq' ? 'bg-white border border-gray-200 shadow' : 'hover:bg-white/60'"
          @click="current = 'faq'"
        >
          FAQ
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-sm font-medium transition"
          :class="current === 'reviews' ? 'bg-white border border-gray-200 shadow' : 'hover:bg-white/60'"
          @click="current = 'reviews'"
        >
          Reviews
        </button>
      </div>
    </div>

    <div class="p-4 bg-white">
      <!-- Description -->
      <div v-if="current === 'description'">
        <div class="prose max-w-none" v-if="description" v-html="description"></div>
        <div v-else class="text-gray-500">No description.</div>
      </div>

      <!-- FAQ -->
      <div v-else-if="current === 'faq'">
        <div v-if="faq.length" class="divide-y divide-gray-200">
          <details v-for="(item, i) in faq" :key="'faq-'+i" class="py-3">
            <summary class="cursor-pointer font-medium text-gray-800">
              {{ item.q }}
            </summary>
            <div class="mt-2 text-gray-700" v-html="item.a"></div>
          </details>
        </div>
        <div v-else class="text-gray-500">No FAQs yet.</div>
      </div>

      <!-- Reviews -->
      <div v-else>
        <div v-if="reviews.length" class="space-y-4">
          <article v-for="rev in reviews" :key="rev.id" class="border border-gray-200 rounded-xl p-4">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold">{{ rev.author_name }}</h4>
              <ProductRatingStars :value="rev.rating" />
            </div>
            <p class="mt-2 text-gray-700 whitespace-pre-line">{{ rev.content }}</p>
            <p v-if="rev.created_at" class="mt-2 text-xs text-gray-500">
              {{ new Date(rev.created_at).toLocaleDateString() }}
            </p>
          </article>
        </div>
        <div v-else class="text-gray-500">No reviews yet.</div>
      </div>
    </div>
  </div>
</template>
