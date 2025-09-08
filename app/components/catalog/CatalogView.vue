<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ProductGrid from '~/components/products/ProductGrid.vue'
import Breadcrumbs from '~/components/catalog/Breadcrumbs.vue'
import Toolbar from '~/components/catalog/Toolbar.vue'
import SelectedChips from '~/components/catalog/SelectedChips.vue'
import FacetSidebar from '~/components/catalog/FacetSidebar.vue'
import Pagination from '~/components/catalog/Pagination.vue'
import InfiniteLoader from '~/components/catalog/InfiniteLoader.vue'

import { useCatalogState } from '~/composables/catalog/useCatalogState'
import { useCatalogFetch } from '~/composables/catalog/useCatalogFetch'
import { useCatalogSeo } from '~/composables/catalog/useCatalogSeo'

const props = defineProps<{
  initialFilters?: { brands?:string[]; categories?:string[]; manufacturers?:string[]; models?:string[] },
  seoTitle?: string,
  seoDescription?: string
}>()

const { t, localeProperties } = useI18n()
const state = useCatalogState(props.initialFilters)
const data  = useCatalogFetch(state)
const route = useRoute()
const router = useRouter()

useCatalogSeo({
  entryType: state.entryType,
  sel: state.sel,
  facets: data.facets,
  breadcrumbs: () => breadcrumbs.value,
  t,
  siteNameFromI18n: () => t('site.name') as string,
  overrideTitle: computed(() => props.seoTitle),
  overrideDescription: computed(() => props.seoDescription),
})

const isRTL = computed(() => localeProperties.value?.dir === 'rtl')

/* =========================
   Mobile filters (launcher + modal)
   ========================= */
type KFixed = 'brands' | 'categories' | 'manufacturers' | 'models'

const activeMobileModal = ref<null | KFixed>(null)
function openMobileModal(k: KFixed) {
  activeMobileModal.value = k
  state.ui.search[k] = ''
}
function closeMobileModal() { activeMobileModal.value = null }

const modalSection = computed(() => {
  const fac = data.facets.value
  const k = activeMobileModal.value
  if (!fac || !k) return null
  const sections = {
    brands:        { key: 'brands' as const,        label: t('facets.brands'),        items: fac.brands || [],        list: state.sel.brands },
    models:        { key: 'models' as const,        label: t('facets.models'),        items: fac.models || [],        list: state.sel.models },
    categories:    { key: 'categories' as const,    label: t('facets.categories'),    items: fac.categories || [],    list: state.sel.categories },
    manufacturers: { key: 'manufacturers' as const, label: t('facets.manufacturers'), items: fac.manufacturers || [], list: state.sel.manufacturers },
  }
  return sections[k]
})
function filteredModalItems(items: Array<{slug:string; name:string}>, key: string) {
  const q = (state.ui.search[key] || '').toLowerCase()
  return q ? items.filter(i => i.name.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q)) : items
}
function applyMobileFilters() {
  state.applyAndResetPage()
  closeMobileModal()
}
function clearMobileGroup() {
  const k = activeMobileModal.value
  if (!k) return
  if (k === 'brands') state.sel.brands = []
  else if (k === 'categories') state.sel.categories = []
  else if (k === 'manufacturers') state.sel.manufacturers = []
  else state.sel.models = []
  applyMobileFilters()
}

/* ============ facet order by entry type ============ */
const facetOrder = computed(() => {
  const sel = state.sel
  if (state.entryType.value === 'category')       return ['categories','manufacturers','brands', ...(sel.brands.length? ['models']:[])] as const
  if (state.entryType.value === 'manufacturer')   return ['manufacturers','categories','brands', ...(sel.brands.length? ['models']:[])] as const
  if (state.entryType.value === 'brand')          return ['brands', ...(sel.brands.length? ['models']:[]), 'categories','manufacturers'] as const
  return ['brands', ...(sel.brands.length? ['models']:[]), 'manufacturers','categories'] as const
})

/* ============ selected chips ============ */
const selectedChips = computed(() => {
  const chips: Array<{ group:any; slug:string; label:string; attrSlug?:string }> = []
  const fac = data.facets?.value
  const labelFrom = (arr?: any[]) => new Map((arr||[]).map(i => [i.slug, i.name]))
  const mapB = labelFrom(fac?.brands)
  const mapMdl = labelFrom(fac?.models)
  const mapC = labelFrom(fac?.categories)
  const mapMan = labelFrom(fac?.manufacturers)

  state.sel.brands.forEach(s => chips.push({ group:'brands', slug:s, label: mapB.get(s) || s }))
  state.sel.models.forEach(s => chips.push({ group:'models', slug:s, label: mapMdl.get(s) || s }))
  state.sel.categories.forEach(s => chips.push({ group:'categories', slug:s, label: mapC.get(s) || s }))
  state.sel.manufacturers.forEach(s => chips.push({ group:'manufacturers', slug:s, label: mapMan.get(s) || s }))

  if (fac?.attributes?.length) {
    const attrMap = new Map(fac.attributes.map(a => [a.slug, new Map(a.items.map(i => [i.slug, i.name]))]))
    Object.entries(state.sel.attributes).forEach(([aSlug, subs]) => {
      const nameMap = attrMap.get(aSlug) || new Map()
      subs.forEach(sub => chips.push({ group:'attr', slug:sub, attrSlug:aSlug, label:nameMap.get(sub) || sub }))
    })
  }
  return chips
})
function removeChip(payload: { group:string; slug:string; attrSlug?:string }) {
  if (payload.group === 'attr' && payload.attrSlug) {
    const list = state.sel.attributes[payload.attrSlug] || []
    const i = list.indexOf(payload.slug); if (i>=0) list.splice(i,1)
    if (!list.length) delete state.sel.attributes[payload.attrSlug]
  } else {
    const map = { brands: state.sel.brands, models: state.sel.models, categories: state.sel.categories, manufacturers: state.sel.manufacturers } as any
    const i = map[payload.group].indexOf(payload.slug); if (i>=0) map[payload.group].splice(i,1)
  }

  const totalAfter =
    state.sel.brands.length + state.sel.models.length + state.sel.categories.length + state.sel.manufacturers.length +
    Object.values(state.sel.attributes).reduce((n, a) => n + a.length, 0)

  if (totalAfter === 0 && !state.sel.q?.trim()) {
    clearAllAndGoShop()
    return
  }
  state.applyAndResetPage()
}

/* ============ grid + pagination ============ */
const PRODUCTS_PER_ROW: 3|4|5|6 = 5
const rowsForGrid = computed(() => Math.max(1, Math.ceil(data.items.value.length / PRODUCTS_PER_ROW)))

const pageInfo = computed(() => {
  const m:any = data.meta.value || {}
  const current = Number(m.current_page || state.sel.page || 1)
  const size = state.sel.perPage === 'all'
    ? Number(m.page_size || m.per_page || 25)
    : Number(state.sel.perPage || m.page_size || m.per_page || 25)
  const total = Number(m.total || 0)
  const last  = Number(m.last_page || (total && size ? Math.ceil(total / size) : 1))
  const from  = total ? (current - 1) * size + 1 : 0
  const to    = total ? Math.min(current * size, total) : 0
  return { current, size, total, last, from, to }
})

const breadcrumbs = computed(() => ([
  { label: t('breadcrumbs.home'), to: '/' },
  { label: t('breadcrumbs.shop'), to: '/shop' },
]))

/* ============ clear-all helpers ============ */
function hasAnySelection() {
  return (
    state.sel.brands.length ||
    state.sel.categories.length ||
    state.sel.manufacturers.length ||
    state.sel.models.length ||
    Object.values(state.sel.attributes).some(a => (a?.length ?? 0) > 0) ||
    !!state.sel.q?.trim()
  )
}
async function clearAllAndGoShop() {
  // reset selections
  state.sel.brands = []
  state.sel.categories = []
  state.sel.manufacturers = []
  state.sel.models = []
  state.sel.attributes = {}
  state.sel.q = ''
  state.sel.page = 1

  // navigate to clean /shop
  const to = { path: '/shop', query: {} as Record<string, string> }
  if (route.path !== '/shop') {
    await router.replace(to)
  } else {
    // already on /shop → nudge, then normalize to force watchers
    await router.replace({ ...to, query: { _r: Date.now().toString() } })
    await router.replace(to)
  }
  // await nextTick()
  // if (process.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* ============ page nav ============ */
function goPage(p:number){
  state.sel.page = p
  state.updateRoute()
  if (process.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}
function loadMore(){
  state.sel.page += 1
  state.updateRoute()
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 grid grid-cols-12 gap-6">
    <!-- Breadcrumbs -->
    <Breadcrumbs :items="breadcrumbs" class="col-span-12 -mt-2" />

    <!-- Mobile chips + launchers -->
    <div class="min-[993px]:hidden col-span-12">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm text-gray-600">
          <span v-if="data.meta?.value?.total">{{ data.meta.value.total }}</span>
          <span v-else>{{ data.items.value.length }}</span>
          {{ t('products') }}
        </div>
        <button
          v-if="hasAnySelection()"
          class="text-xs text-red-600 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50"
          @click="clearAllAndGoShop"
        >{{ t('filters.clearAll') }}</button>
      </div>

      <SelectedChips :chips="selectedChips" @remove="removeChip" class="mb-3" />

      <!-- Mobile launcher buttons (hidden when group empty) -->
      <div v-if="data.facets.value" class="flex flex-wrap gap-2">
        <button v-if="(data.facets.value.categories?.length || 0) > 0"
                class="px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 text-sm bg-orange-50"
                @click="openMobileModal('categories')">
          {{ t('facets.categories') }}
        </button>
        <button v-if="(data.facets.value.manufacturers?.length || 0) > 0"
                class="px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 text-sm bg-orange-50"
                @click="openMobileModal('manufacturers')">
          {{ t('facets.manufacturers') }}
        </button>
        <button v-if="(data.facets.value.brands?.length || 0) > 0"
                class="px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 text-sm bg-orange-50"
                @click="openMobileModal('brands')">
          {{ t('facets.brands') }}
        </button>
        <button v-if="(data.facets.value.models?.length || 0) > 0"
                class="px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 text-sm bg-orange-50"
                @click="openMobileModal('models')">
          {{ t('facets.models') }}
        </button>
      </div>
    </div>

    <!-- Sidebar (desktop) -->
    <aside class="hidden min-[993px]:block col-span-12 min-[993px]:col-span-3" :class="isRTL ? 'min-[993px]:order-2' : 'min-[993px]:order-1'">
      <div class="space-y-4">
        <div class="rounded-2xl border bg-white/80 backdrop-blur p-3 shadow-sm" v-if="selectedChips.length">
          <div class="mb-2 text-sm font-semibold text-gray-700">{{ t('filters.active') }}</div>
          <SelectedChips :chips="selectedChips" @remove="removeChip" />
          <button class="mt-3 text-xs text-red-600 hover:underline" @click="clearAllAndGoShop">
            {{ t('filters.clearAll') }}
          </button>
        </div>

        <ClientOnly>
          <FacetSidebar
            v-if="data.facets.value"
            :facets="data.facets.value"
            :order="facetOrder as any"
            :uiOpen="state.ui.open"
            :uiSearch="state.ui.search"
            :sel="state.sel as any"
            @toggleOpen="k => state.ui.open[k] = !state.ui.open[k]"
            @clearGroup="k => state.clearGroup(k)"
            @pickFixed="(k, slug) => { state.toggle((state.sel as any)[k], slug); state.applyAndResetPage() }"
            @setSearch="(k,v) => state.ui.search[k] = v"
            @clearAttr="k => { state.clearAttr(k); state.applyAndResetPage() }"
            @pickAttr="({attr,slug}) => { state.toggleAttr(attr, slug); state.applyAndResetPage() }"
          />
        </ClientOnly>
      </div>
    </aside>

    <!-- Products -->
    <section :class="['col-span-12 min-[993px]:col-span-9', isRTL ? 'min-[993px]:order-1' : 'min-[993px]:order-2']">
      <Toolbar
        :sort="state.sel.sort"
        :perPage="state.sel.perPage"
        :t="t"
        @update:sort="v => { state.sel.sort = v; state.applyAndResetPage() }"
        @update:perPage="v => { state.sel.perPage = v; state.applyAndResetPage() }"
      />

      <div v-if="data.errorMsg.value" class="mb-4 rounded-md border border-red-300/60 bg-red-50 text-red-700 px-4 py-2 text-sm">
        {{ data.errorMsg.value }}
      </div>

      <template v-if="data.pending.value && data.items.value.length === 0">
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <div v-for="i in 12" :key="i" class="h-44 bg-gray-200/70 animate-pulse rounded-xl" />
        </div>
      </template>
      <template v-else>
        <ProductGrid
          :key="state.sel.perPage === 'all' ? 'grid-infinite' : state.gridKey"
          :title="t('products')"
          :products="data.items.value"
          :rows="rowsForGrid"
          :productsPerRow="5"
          :show-rewards="true"
          :show-add="true"
          :show-qty="true"
          container-class="max-w-screen-2xl"
        />

        <Pagination
          v-if="data.meta.value && state.sel.perPage !== 'all'"
          :pageInfo="pageInfo"
          :t="t"
          @go="goPage"
        />

        <InfiniteLoader v-else
          :canLoadMore="data.canLoadMore.value"
          :pending="data.pending.value"
          @loadMore="loadMore"
        />
      </template>
    </section>

    <!-- Mobile facet modal -->
    <transition name="fade">
      <div v-if="activeMobileModal" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/40" @click="closeMobileModal"></div>
        <div class="absolute inset-x-0 bottom-0 max-h-[80vh] bg-white rounded-t-2xl shadow-2xl">
          <div class="p-4 border-b flex items-center justify-between">
            <h3 class="text-base font-semibold text-gray-900">
              {{ modalSection?.label }}
            </h3>
            <button class="p-2 rounded hover:bg-gray-100" @click="closeMobileModal" :aria-label="t('common.close')">
              <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 8.586l4.95-4.95 1.414 1.414L11.414 10l4.95 4.95-1.414 1.414L10 11.414l-4.95 4.95-1.414-1.414L8.586 10l-4.95-4.95L5.05 3.636 10 8.586z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <div class="p-4">
            <div class="relative mb-3">
              <input
                v-model="state.ui.search[activeMobileModal!]"
                type="search"
                :placeholder="t('filters.searchPlaceholder', { label: (modalSection?.label || '').toString().toLowerCase() })"
                class="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.9 14.32a7 7 0 111.414-1.414l3.387 3.387-1.414 1.414-3.387-3.387zM8 13a5 5 0 100-10 5 5 0 000 10z" clip-rule="evenodd"/>
              </svg>
            </div>

            <div class="space-y-1.5 max-h-64 overflow-auto pr-1">
              <div
                v-for="f in (modalSection ? filteredModalItems(modalSection.items, modalSection.key) : [])"
                :key="f.slug"
                class="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-50"
              >
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="modalSection?.list.includes(f.slug)"
                    @change="state.toggle(modalSection!.list as any, f.slug)"
                    class="size-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300"
                  />
                  <span class="text-sm text-gray-800 line-clamp-1">{{ f.name }}</span>
                </label>
                <span class="text-[11px] text-gray-500">{{ f.count }}</span>
              </div>
            </div>
          </div>

          <div class="p-4 border-t flex items-center justify-between gap-3">
            <button class="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50" @click="clearMobileGroup">
              {{ t('filters.clear') }}
            </button>
            <div class="ml-auto flex gap-3">
              <button class="px-4 py-2 rounded-lg border text-gray-700 hover:bg-gray-50" @click="closeMobileModal">
                {{ t('common.close') }}
              </button>
              <button class="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600" @click="applyMobileFilters">
                {{ t('common.apply') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
