<script setup lang="ts">
/**
 * Fancy pagination with:
 *  - numbered pages around the current page
 *  - smart "…" gaps you can click to jump a block
 *  - "Go To" input
 *
 * Props:
 *   pageInfo: { current:number; last:number; from:number; to:number; total:number }
 *   radius?: number   (how many pages to show on each side of current; defaults responsive)
 *   t?: (k:string)=>string
 */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(defineProps<{
  pageInfo: { current:number; last:number; from:number; to:number; total:number }
  radius?: number
  t?: (k:string)=>string
}>(), { radius: 0, t: (k:string)=>k })

const emit = defineEmits<{ (e:'go', page:number):void }>()

// responsive radius (like your old pageRadius)
const vw = ref(1024)
function setVW(){ if (typeof window !== 'undefined') vw.value = window.innerWidth }
onMounted(() => { setVW(); window.addEventListener('resize', setVW) })
onBeforeUnmount(() => window.removeEventListener('resize', setVW))
const pageRadius = computed(() => {
  if (props.radius) return props.radius
  return vw.value < 480 ? 1 : (vw.value < 768 ? 2 : 3)
})

type Chip = { type:'page'; value:number; active:boolean } | { type:'gap'; dir:'prev'|'next' }

const paginationItems = computed<Chip[]>(() => {
  const current = props.pageInfo.current
  const last = props.pageInfo.last
  const r = pageRadius.value
  if (last <= 1) return []

  const set = new Set<number>([1, last])
  for (let p = current - r; p <= current + r; p++) {
    if (p >= 1 && p <= last) set.add(p)
  }
  const sorted = Array.from(set).sort((a,b)=>a-b)

  const out: Chip[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push({ type:'gap', dir: p < current ? 'prev' : 'next' })
    out.push({ type:'page', value:p, active:p===current })
    prev = p
  }
  return out
})

function go(page:number){ if (page !== props.pageInfo.current) emit('go', page) }
function goFirst(){ if (props.pageInfo.current > 1) go(1) }
function goPrev(){ if (props.pageInfo.current > 1) go(props.pageInfo.current - 1) }
function goNext(){ if (props.pageInfo.current < props.pageInfo.last) go(props.pageInfo.current + 1) }
function goLast(){ if (props.pageInfo.current < props.pageInfo.last) go(props.pageInfo.last) }

function jumpGap(dir:'prev'|'next'){
  const step = pageRadius.value * 2 + 1
  const target = dir === 'prev'
    ? Math.max(1, props.pageInfo.current - step)
    : Math.min(props.pageInfo.last, props.pageInfo.current + step)
  go(target)
}

const gotoModel = ref<string>('')
function submitGoto(){
  const n = Number(gotoModel.value)
  if (Number.isFinite(n) && n >= 1 && n <= props.pageInfo.last) go(n)
  gotoModel.value = ''
}
</script>

<template>
  <div class="mt-6 flex flex-col items-center gap-3">
    <div v-if="pageInfo.total" class="text-sm text-gray-600">
      {{ t('pagination.showing') || 'Showing' }}
      {{ pageInfo.from }}–{{ pageInfo.to }}
      {{ t('pagination.of') || 'of' }}
      {{ pageInfo.total }}
    </div>

    <nav v-if="pageInfo.last > 1" class="flex items-center gap-1 flex-wrap" aria-label="Pagination">
      <!-- First / Prev -->
      <button class="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-40"
              :disabled="pageInfo.current <= 1" @click="goFirst" aria-label="First">«</button>
      <button class="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-40"
              :disabled="pageInfo.current <= 1" @click="goPrev" aria-label="Previous">‹</button>

      <!-- Numbered pages with gaps -->
      <template v-for="(it, idx) in paginationItems" :key="idx">
        <button v-if="it.type==='page'"
                class="px-3 py-1.5 border rounded-lg"
                :class="it.active ? 'bg-gray-900 text-white hover:bg-gray-900' : 'bg-white hover:bg-gray-50'"
                :aria-current="it.active ? 'page' : undefined"
                @click="!it.active && go(it.value)">
          {{ it.value }}
        </button>
        <button v-else
                class="px-2 py-1.5 text-gray-500 hover:text-gray-900"
                @click="jumpGap(it.dir)"
                :aria-label="t('pagination.jumpAria') || 'Jump'">…</button>
      </template>

      <!-- Next / Last -->
      <button class="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-40"
              :disabled="pageInfo.current >= pageInfo.last" @click="goNext" aria-label="Next">›</button>
      <button class="px-3 py-1.5 border rounded-lg bg-white disabled:opacity-40"
              :disabled="pageInfo.current >= pageInfo.last" @click="goLast" aria-label="Last">»</button>
    </nav>

    <!-- Go To -->
    <form v-if="pageInfo.last > 1" class="flex items-center gap-2 text-sm" @submit.prevent="submitGoto">
      <label class="text-gray-600">{{ t('pagination.goTo') || 'Go To' }}</label>
      <input v-model="gotoModel" inputmode="numeric" pattern="[0-9]*"
             class="w-16 border rounded-lg px-2 py-1.5" :placeholder="String(pageInfo.current)" />
      <button class="px-3 py-1.5 border rounded-lg hover:bg-gray-50">{{ t('pagination.go') || 'Go' }}</button>
    </form>
  </div>
</template>
