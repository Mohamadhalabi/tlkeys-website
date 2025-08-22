<script setup lang="ts">
import { defineComponent, h, ref, computed, onMounted, onUnmounted, watch } from 'vue'

type EndLike = string | number | Date

const props = withDefaults(defineProps<{
  end: EndLike
  warnUnder?: number
  hiddenLabels?: boolean
  /** 'sm' | 'md' tile sizes */
  size?: 'sm' | 'md'
  /** Tailwind classes for label color (e.g., 'text-gray-600') */
  labelsTextClass?: string
}>(), {
  warnUnder: 24 * 60 * 60,
  hiddenLabels: false,
  size: 'md',
  labelsTextClass: 'text-white/70'
})

/* ---- ticking ---- */
const now = ref(Date.now())
let t: any = null
onMounted(() => { t = setInterval(() => (now.value = Date.now()), 1000) })
onUnmounted(() => { if (t) clearInterval(t) })

/* ---- time math ---- */
const endMs = computed(() => {
  const e = props.end
  const ms = e instanceof Date ? e.getTime() : typeof e === 'number' ? e : Date.parse(e)
  return Number.isFinite(ms) ? ms : NaN
})

const remaining = computed(() => {
  const diff = endMs.value - now.value
  return diff > 0 ? Math.floor(diff / 1000) : 0
})

const urgent = computed(() => remaining.value <= props.warnUnder)

const parts = computed(() => {
  let s = remaining.value
  const days = Math.floor(s / 86400); s -= days * 86400
  const hours = Math.floor(s / 3600); s -= hours * 3600
  const mins = Math.floor(s / 60);    s -= mins * 60
  const secs = s
  return {
    d: String(days),
    h: hours.toString().padStart(2, '0'),
    m: mins.toString().padStart(2, '0'),
    s: secs.toString().padStart(2, '0'),
  }
})

/* flip triggers per unit */
const prev = ref({ d: '', h: '', m: '', s: '' })
const flipKey = ref(0)
watch(parts, (cur) => {
  if (prev.value.d !== cur.d || prev.value.h !== cur.h || prev.value.m !== cur.m || prev.value.s !== cur.s) {
    flipKey.value++
    prev.value = { ...cur }
  }
}, { immediate: true })

function splitDigits(s: string) { return s.split('') }

/* ---- size maps ---- */
const sizeMap = {
  sm: {
    tile: 'h-[32px] w-[24px] md:h-[36px] md:w-[28px]',
    text: 'text-[14px] md:text-[16px]'
  },
  md: {
    tile: 'h-[46px] w-[34px] md:h-[60px] md:w-[44px]',
    text: 'text-[22px] md:text-[28px]'
  }
} as const

/* ---- local sub-component: one split-flap tile ---- */
const DigitTile = defineComponent({
  name: 'DigitTile',
  props: {
    char: { type: String, required: true },
    urgent: { type: Boolean, default: false },
    size: { type: String as () => 'sm' | 'md', default: 'md' }
  },
  setup(p) {
    const flipping = ref(true)
    watch(() => p.char, () => {
      flipping.value = false
      requestAnimationFrame(() => { flipping.value = true })
    })

    return () => {
      const sz = sizeMap[p.size]
      const base =
        `relative inline-flex ${sz.tile} ` +
        'items-center justify-center rounded-md shadow ' +
        (p.urgent ? 'bg-neutral-900 text-rose-50 shadow-rose-900/20' : 'bg-neutral-900 text-white shadow-black/40')
      const flipClass = flipping.value ? 'tile-flip' : ''

      return h('div', { class: [base, flipClass] }, [
        h('div', { class: 'absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/10' }),
        h('div', { class: 'absolute inset-x-0 top-0 h-1/2 rounded-t-md bg-white/5' }),
        h('div', { class: 'absolute inset-x-0 bottom-0 h-1/2 rounded-b-md bg-black/20' }),
        h('span', { class: `relative z-[1] ${sz.text} font-semibold leading-none tracking-tight [font-variant-numeric:tabular-nums]` }, p.char)
      ])
    }
  }
})
</script>

<template>
  <div class="inline-flex flex-col items-center select-none">
    <div class="flex items-stretch gap-1.5 md:gap-2" :class="urgent ? 'text-rose-50' : 'text-white'">
      <!-- DAYS -->
      <div class="flex flex-col items-center">
        <div class="flex gap-1" :key="'d-'+flipKey">
          <DigitTile v-for="(ch, i) in splitDigits(parts.d)" :key="'d'+i+ch" :char="ch" :urgent="urgent" :size="size" />
        </div>
      </div>

      <div class="w-1 md:w-2"></div>

      <!-- HOURS -->
      <div class="flex flex-col items-center">
        <div class="flex gap-1" :key="'h-'+flipKey">
          <DigitTile v-for="(ch, i) in splitDigits(parts.h)" :key="'h'+i+ch" :char="ch" :urgent="urgent" :size="size" />
        </div>
      </div>

      <!-- MINUTES -->
      <div class="flex flex-col items-center">
        <div class="flex gap-1" :key="'m-'+flipKey">
          <DigitTile v-for="(ch, i) in splitDigits(parts.m)" :key="'m'+i+ch" :char="ch" :urgent="urgent" :size="size" />
        </div>
      </div>

      <!-- SECONDS -->
      <div class="flex flex-col items-center">
        <div class="flex gap-1" :key="'s-'+flipKey">
          <DigitTile v-for="(ch, i) in splitDigits(parts.s)" :key="'s'+i+ch" :char="ch" :urgent="urgent" :size="size" />
        </div>
      </div>
    </div>

    <div
      v-if="!hiddenLabels"
      class="mt-1 grid w-full grid-cols-4 gap-2 text-center text-[10px] md:text-xs tracking-widest uppercase"
      :class="labelsTextClass"
    >
      <div>Days</div>
      <div>Hours</div>
      <div>Minutes</div>
      <div>Seconds</div>
    </div>
  </div>
</template>

<style scoped>
@keyframes flipIn {
  0%   { transform: rotateX(-90deg); opacity: .6; filter: brightness(0.8); }
  60%  { transform: rotateX(15deg);  opacity: 1;   filter: brightness(1); }
  100% { transform: rotateX(0deg);   opacity: 1; }
}
.tile-flip {
  transform-style: preserve-3d;
  animation: flipIn 420ms cubic-bezier(.2,.7,.2,1);
}
</style>
