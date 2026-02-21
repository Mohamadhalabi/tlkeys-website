<script setup lang="ts">
import ProductCard from '~/components/products/ProductCard.vue'
import { computed } from 'vue'

type P = {
  id: number | string
  name: string
  image: string
  // Ensure this field exists in your Type
  gallery?: string[] 
  price: number
  oldPrice?: number | null
  rewardPoints?: number | null
  badgeText?: string | null
  display_euro_price: boolean
  euro_price: number
  freeShipping?: boolean
  slug?: string
  href?: string
  sku?: string | null
  category?: string | null
  categorySlug?: string | null
  stock?: number | null
  part_number?: string | null
}

const props = withDefaults(defineProps<{
  title: string
  products: P[]
  rows?: number
  productsPerRow?: 2 | 3 | 4 | 5 | 6
  showRewards?: boolean
  showAdd?: boolean
  showQty?: boolean
  linkMoreHref?: string
  containerClass?: string
}>(), {
  rows: 1,
  productsPerRow: 6,
  showRewards: true,
  showAdd: true,
  showQty: true,
  containerClass: 'max-w-screen-2xl'
})

const gridColsClass = computed(() => {
  const lg = props.productsPerRow ?? 6
  switch (lg) {
    case 2: return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-2'
    case 3: return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3'
    case 4: return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'
    case 5: return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5'
    default: return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6'
  }
})

const limit = computed(() => (props.rows ?? 1) * (props.productsPerRow ?? 6))
const visible = computed(() => (props.products || []).slice(0, limit.value))
</script>

<template>
  <section class="mt-6">
    <div class="mx-auto w-full" :class="containerClass">
      <div class="mb-3 flex items-center justify-between px-3 sm:px-4">
        <NuxtLinkLocale
          v-if="linkMoreHref"
          :to="linkMoreHref"
          class="text-sm font-medium text-red-600 hover:text-red-700"
        >
          View all →
        </NuxtLinkLocale>
      </div>

      <div class="px-3 sm:px-4">
        <div
          class="grid gap-3 sm:gap-4 md:gap-5 place-items-stretch custom-grid"
          :class="gridColsClass"
        >
          <div v-for="product in visible" :key="product.id" class="h-full" data-nosnippet>
            <ProductCard
              :product="product as any"
              :show-rewards="showRewards"
              :show-add="showAdd"
              :show-qty="showQty"
              class="h-full"
              @add-to-cart="$emit('add-to-cart', $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@media (max-width: 340px) {
  .custom-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
  }
}
:deep(.pc-footer),
:deep(.card-footer),
:deep(.product-actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
:deep(.pc-footer button),
:deep(.product-actions button) {
  min-width: 0;
  flex: 0 1 auto;
}
</style>