<script setup lang="ts">
type Product = {
  id: number | string
  slug?: string
  name: string
  image: string
  price: number
  oldPrice?: number | null
  badgeText?: string | null
  href?: string
  sku?: string | null
  category?: string | null
  categorySlug?: string | null
}

const props = withDefaults(defineProps<{
  product: Product
  showRewards?: boolean
  showQty?: boolean
  showAdd?: boolean
}>(), {
  showRewards: true,
  showQty: true,
  showAdd: true
})

const qty = ref(1)
const hasDiscount = computed(() =>
  props.product.oldPrice != null &&
  Number(props.product.oldPrice) > Number(props.product.price)
)
const linkTo = computed(() => props.product.href ?? `/p/${props.product.slug ?? props.product.id}`)

// Build category link if slug available
const categoryLink = computed(() =>
  props.product.categorySlug
    ? `/${props.product.categorySlug}`
    : (props.product.category
        ? `/${encodeURIComponent(props.product.category)}`
        : '#')
)
</script>

<template>
  <div
    class="group rounded-xl bg-white ring-1 ring-black/5 shadow-sm hover:shadow-md transition
           overflow-hidden flex flex-col">
    <!-- image -->
    <NuxtLink :to="linkTo" class="relative block bg-white">
      <img
        :src="product.image"
        :alt="product.name"
        class="w-full h-[220px] object-contain p-6"
        loading="lazy"
      />
      <span
        v-if="product.badgeText"
        class="absolute left-3 top-3 text-[10px] font-bold uppercase tracking-wide
               px-2 py-1 rounded bg-green-100 text-green-700 ring-1 ring-green-200">
        {{ product.badgeText }}
      </span>
    </NuxtLink>

    <!-- body -->
    <div class="px-4 pb-4">
      <!-- Category (linked) & SKU -->
      <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-tight">
        <NuxtLink
          v-if="product.category"
          :to="categoryLink"
          class="uppercase tracking-wide text-gray-600 hover:underline"
        >
          {{ product.category }}
        </NuxtLink>
        <span v-if="product.sku" class="font-bold text-green-800">
          • {{ product.sku }}
        </span>
      </div>

      <!-- title -->
      <NuxtLink :to="linkTo" class="block min-h-[44px] mt-1">
        <h3 class="text-[13px] font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:underline">
          {{ product.name }}
        </h3>
      </NuxtLink>

      <!-- price row -->
      <div class="mt-2 flex items-end gap-2">
        <div class="text-[15px] font-extrabold text-red-600">
          ${{ Number(product.price).toFixed(2) }}
        </div>
        <div v-if="hasDiscount" class="text-xs text-gray-400 line-through">
          ${{ Number(product.oldPrice).toFixed(2) }}
        </div>
      </div>

      <!-- actions -->
      <div
        v-if="showAdd"
        class="mt-3 flex flex-nowrap items-center gap-2 min-w-0 whitespace-nowrap"
      >
        <button
          type="button"
          class="shrink-0 inline-flex items-center justify-center px-4 py-2.5 md:px-5 md:py-3
                 rounded-lg bg-red-600 text-white text-xs md:text-sm font-bold
                 hover:bg-red-700 active:bg-red-800 transition shadow-md"
          @click="$emit('add-to-cart', { id: product.id, qty: qty })"
        >
          ADD TO CART
        </button>

        <div v-if="showQty" class="ml-auto flex items-center gap-1 shrink-0">
          <button
            type="button"
            class="w-6 h-6 rounded-md ring-1 ring-black/10 text-gray-700 hover:bg-gray-50 text-xs"
            @click="qty = Math.max(1, qty - 1)"
          >–</button>
          <input
            v-model.number="qty"
            type="number"
            min="1"
            class="w-10 h-6 rounded-md ring-1 ring-black/10 text-center text-xs"
          />
          <button
            type="button"
            class="w-6 h-6 rounded-md ring-1 ring-black/10 text-gray-700 hover:bg-gray-50 text-xs"
            @click="qty = qty + 1"
          >+</button>
        </div>
      </div>
    </div>
  </div>
</template>
