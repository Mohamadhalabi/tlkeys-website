<script setup lang="ts">
import FacetGroup from './FacetGroup.vue'
import AttrFacetGroup from './AttrFacetGroup.vue'
import { useI18n } from '#imports'

const props = defineProps<{
  facets: { brands?:any[]; models?:any[]; categories?:any[]; manufacturers?:any[]; attributes?:any[] } | null
  order: Array<'brands'|'models'|'categories'|'manufacturers'>
  uiOpen: Record<string, boolean>
  uiSearch: Record<string, string>
  sel: { brands:string[]; models:string[]; categories:string[]; manufacturers:string[]; attributes:Record<string,string[]> }
}>()

const emit = defineEmits<{
  (e:'toggleOpen', key:string): void
  (e:'clearGroup', key:'brands'|'models'|'categories'|'manufacturers'): void
  (e:'pickFixed', key:'brands'|'models'|'categories'|'manufacturers', slug:string): void
  (e:'setSearch', key:string, v:string): void
  (e:'clearAttr', key:string): void
  (e:'pickAttr', payload:{ attr:string; slug:string }): void
}>()

/* i18n for group labels */
const { t } = useI18n()
const groupLabel = (k: 'brands'|'models'|'categories'|'manufacturers') => {
  switch (k) {
    case 'brands':        return t('filters.brands',        'Brands')
    case 'models':        return t('filters.models',        'Models')
    case 'categories':    return t('filters.categories',    'Categories')
    case 'manufacturers': return t('filters.manufacturers', 'Manufacturers')
    default:              return k
  }
}
</script>

<template>
  <div v-if="facets" class="space-y-3">
    <FacetGroup
      v-for="k in order"
      :key="k"
      :label="groupLabel(k)"
      :keyName="k"
      :items="facets[k] || []"
      :selected="sel[k]"
      :open="uiOpen[k]"
      :searchQ="uiSearch[k]"
      @toggleOpen="emit('toggleOpen', $event)"
      @clear="emit('clearGroup', k)"
      @pick="slug => emit('pickFixed', k, slug)"
      @search="v => emit('setSearch', k, v)"
    />

    <div v-if="facets.attributes?.length" class="space-y-3">
      <AttrFacetGroup
        v-for="a in facets.attributes"
        :key="'attr:'+a.slug"
        :attr="a"
        :open="uiOpen[a.slug]"
        :searchQ="uiSearch[a.slug] || ''"
        :selected="sel.attributes[a.slug] || []"
        @toggleOpen="emit('toggleOpen', a.slug)"
        @clear="emit('clearAttr', a.slug)"
        @pick="slug => emit('pickAttr', { attr:a.slug, slug })"
        @search="v => emit('setSearch', a.slug, v)"
      />
    </div>
  </div>
</template>
