<script setup lang="ts">
/* ---------------- Types ---------------- */
type Review = {
  id: number | string
  author_name?: string | null
  rating?: number | null
  content?: string | null
  created_at?: string | null
}

const props = defineProps<{ reviews: Review[] }>()

/* ---------------- Helpers ---------------- */
function maskName(name?: string | null): string {
  if (!name) return 'Anonymous'
  const parts = name.trim().split(/\s+/)
  return parts
    .map((part) => {
      if (part.length <= 2) return part
      return part.slice(0, 2) + '*'.repeat(part.length - 2)
    })
    .join(' ')
}
</script>

<template>
  <div>
    <!-- Review list -->
    <div v-if="reviews?.length" class="space-y-4">
      <article
        v-for="rev in reviews"
        :key="rev.id"
        class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <h4 class="font-semibold text-gray-900">
            {{ maskName(rev.author_name) }}
          </h4>
          <ProductRatingStars :value="rev.rating || 0" />
        </div>

        <p
          v-if="rev.content"
          class="mt-2 text-gray-700 whitespace-pre-line leading-relaxed"
        >
          {{ rev.content }}
        </p>
      </article>
    </div>

    <!-- Empty state -->
    <div v-else class="text-gray-500 italic">No reviews yet.</div>
  </div>
</template>
