<script setup lang="ts">
import { ref } from 'vue'
import { useCart } from '~/composables/useCart'
import { useAuth } from '~/composables/useAuth'
import { useCurrency } from '~/composables/useCurrency'

type MiniProduct = {
  id: number | string
  slug?: string
  title: string
  image?: string | null
  sku?: string | null
  price?: number | null
  regular_price?: number | null
  sale_price?: number | null
}

const props = defineProps<{
  title: string
  items: MiniProduct[]
}>()

const cart = useCart()
const auth = useAuth()
const { formatMoney } = useCurrency()

const addedLocal = ref<Set<string>>(new Set())

function toNum(x: unknown) {
  const n = Number(x)
  return Number.isFinite(n) ? n : 0
}

function isInCart(p: MiniProduct) {
  const id = String(p.id)
  if (auth.token.value) return addedLocal.value.has(id)
  return !!cart.guestItems?.value?.some?.(i => String(i.product_id) === id)
}

function isDiscounted(p: MiniProduct) {
  if (typeof p.regular_price !== 'number') return false
  const cmp = toNum(p.sale_price ?? p.price)
  return p.regular_price > cmp && cmp > 0
}

async function toggle(p: MiniProduct) {
  const id = String(p.id)
  if (isInCart(p)) {
    await cart.remove(p.id)
    addedLocal.value.delete(id)
  } else {
    await cart.add(p.id, 1, {
      title: p.title,
      image: p.image || undefined,
      sku: p.sku || undefined,
      slug: p.slug,
      price: toNum(p.price ?? p.regular_price),
      regular_price: typeof p.regular_price === 'number' ? p.regular_price : null,
      sale_price: typeof p.sale_price === 'number' ? p.sale_price : null,
    })
    addedLocal.value.add(id)
  }
}
</script>

<template>
  <section class="mt-6">
    <!-- Card wrapper to match Description section -->
    <div class="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      <div class="px-4 py-3 bg-gray-50 font-medium">
        {{ title }}
      </div>

      <div class="p-5">
        <!-- One per row -->
        <div class="grid grid-cols-1 gap-4">
          <article
            v-for="p in items"
            :key="String(p.id)"
            class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition"
          >
            <!-- Mobile: stacked; Desktop: image | info | controls -->
            <div class="flex flex-col md:flex-row md:items-center gap-4">
              <!-- IMAGE with divider (bottom on mobile, right on desktop) -->
              <div
                class="pb-3 mb-3 border-b border-gray-200 md:pb-0 md:mb-0 md:border-b-0 md:pr-4 md:mr-2 md:border-r md:border-gray-200 md:flex md:items-center"
              >
                <NuxtLinkLocale :to="p.slug ? `/products/${p.slug}` : '#'" class="block">
                  <NuxtImg
                    :src="p.image || '/images/placeholder.webp'"
                    class="object-contain rounded-lg bg-white mx-auto md:mx-0"
                    width="125"
                    alt=""
                    loading="lazy"
                  />
                </NuxtLinkLocale>
              </div>

              <!-- TEXT: title, sku, price -->
              <div class="flex-1 min-w-0 md:pr-4">
                <NuxtLinkLocale :to="p.slug ? `/products/${p.slug}` : '#'" class="block">
                  <h4 class="text-base md:text-lg font-bold text-gray-900 line-clamp-2 hover:underline">
                    {{ p.title }}
                  </h4>
                </NuxtLinkLocale>

                <div v-if="p.sku" class="mt-1 text-xs md:text-lg text-green-600 font-semibold">
                  SKU: {{ p.sku }}
                </div>

                <div class="mt-2 flex items-end gap-2">
                  <span class="text-red-600 text-xl font-semibold">{{ formatMoney(p.price ?? 0) }}</span>
                  <span v-if="isDiscounted(p)" class="text-xs text-gray-500 line-through">
                    {{ formatMoney(p.regular_price || 0) }}
                  </span>
                </div>

                <!-- MOBILE controls (inline under text) -->
                <div class="mt-3 flex items-center gap-2 md:hidden">
                  <button
                    type="button"
                    :aria-pressed="isInCart(p)"
                    class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none"
                    :class="isInCart(p) ? 'bg-green-500' : 'bg-gray-300'"
                    @click="toggle(p)"
                  >
                    <span
                      class="absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-transform duration-200 shadow"
                      :class="isInCart(p) ? 'translate-x-6' : 'translate-x-0'"
                    />
                  </button>
                  <span class="text-sm font-medium" :class="isInCart(p) ? 'text-green-700' : 'text-gray-600'">
                    {{ isInCart(p) ? 'Added' : 'Add to Cart' }}
                  </span>
                </div>
              </div>

              <!-- DESKTOP controls pinned on the right -->
              <div class="hidden md:flex md:flex-col md:items-end gap-2">
                <button
                  type="button"
                  :aria-pressed="isInCart(p)"
                  class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none"
                  :class="isInCart(p) ? 'bg-green-500' : 'bg-gray-300'"
                  @click="toggle(p)"
                >
                  <span
                    class="absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-transform duration-200 shadow"
                    :class="isInCart(p) ? 'translate-x-6' : 'translate-x-0'"
                  />
                </button>
                <span class="text-xs font-medium" :class="isInCart(p) ? 'text-green-700' : 'text-gray-600'">
                  {{ isInCart(p) ? 'Added' : 'Add to Cart' }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
