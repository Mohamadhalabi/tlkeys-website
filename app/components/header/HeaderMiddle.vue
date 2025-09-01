<template>
  <div class="bg py-3">
    <div class="mx-auto px-6 max-w-screen-xl flex items-center justify-between gap-6 relative">
      <!-- Logo -->
      <NuxtLinkLocale to="/" class="website-logo flex items-center justify-center">
        <NuxtImg src="/images/logo/techno-lock-desktop-logo.webp" alt="Logo" class="h-full object-contain" />
      </NuxtLinkLocale>

      <!-- Search + Suggestions -->
      <div class="relative flex-1 max-w-3xl" ref="searchWrap">
        <div class="flex rounded-full overflow-hidden bg-white border border-gray-300 focus-within:ring-2 focus-within:ring-emerald-400">
          <input
            ref="searchInput"
            v-model="term"
            type="text"
            class="flex-1 px-4 py-2 text-sm focus:outline-none"
            :placeholder="typedText"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="goToShop"
            @focus="onFocus"
          />
          <button class="px-4 flex items-center justify-center bg-orange-600 text-white" @click="goToShop()">
            <MagnifyingGlassIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Suggestions (inline absolute; no Teleport) -->
        <transition name="fade">
          <div
            v-if="open && (loading || error || suggestions.length || hasMore)"
            class="absolute left-0 right-0 z-[99999] mt-2 rounded-xl border bg-white text-gray-900 shadow-2xl overflow-hidden"
            @mousedown.prevent
          >
            <div v-if="loading" class="px-4 py-3 text-sm text-gray-500">Loading…</div>
            <div v-else-if="error" class="px-4 py-3 text-sm text-red-600">{{ error }}</div>

            <template v-else>
              <ul v-if="suggestions.length" role="listbox" :aria-activedescendant="activeId" class="max-h-96 overflow-auto">
                <li
                  v-for="(p, idx) in suggestions"
                  :id="`sug-${idx}`"
                  :key="p.id ?? p.slug ?? idx"
                  role="option"
                  :aria-selected="idx === active"
                  @mouseenter="active = idx"
                  @mouseleave="active = -1"
                  @click="pick(p)"
                  class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                  :class="idx === active ? 'bg-gray-100' : ''"
                >
                  <!-- image shown only if it's a URL -->
                  <NuxtImg v-if="p.image" :src="p.image" width="80" height="80" class="rounded border object-cover shrink-0" />
                  <div class="min-w-0 flex-1">
                    <!-- highlighted title/SKU -->
                    <div class="text-md font-medium line-clamp-4" v-html="highlight(p.title)"></div>
                    <div class="text-sm font-bold text-green-700 line-clamp-1" v-if="p.sku" v-html="highlight('SKU: ' + p.sku)"></div>
                  </div>

                  <!-- price block -->
                  <div v-if="!p.hide_price" class="text-right whitespace-nowrap">
                    <div class="text-base font-semibold text-red-700">
                      {{ formatMoney(p.price) }}
                    </div>
                    <div v-if="p.old_price && p.old_price > p.price" class="text-xs text-gray-500 line-through">
                      {{ formatMoney(p.old_price) }}
                    </div>
                  </div>

                  <!-- WhatsApp CTA when price is hidden -->
                  <a
                    v-else
                    :href="waLink(p)"
                    target="_blank"
                    rel="noopener"
                    class="inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 text-xs font-semibold whitespace-nowrap"
                    @click.stop
                    :aria-label="t('search.contactOnWhatsApp')"
                  >
                    <!-- WhatsApp icon (inline SVG) -->
                    <svg id='WhatsApp_24' width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'><rect width='24' height='24' stroke='none' fill='#000000' opacity='0'/>
                    <g transform="matrix(0.42 0 0 0.42 12 12)" >
                    <g style="" >
                    <g transform="matrix(1 0 0 1 -0.07 0.15)" >
                    <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" transform=" translate(-23.93, -24.15)" d="M 4.868 43.303 L 7.562 33.467999999999996 C 5.9 30.59 5.026 27.324 5.027 23.979 C 5.032 13.514 13.548 5 24.014 5 C 29.093 5.002 33.859 6.979 37.444 10.565999999999999 C 41.028000000000006 14.154 43.002 18.921999999999997 43 23.994 C 42.996 34.459 34.478 42.974000000000004 24.014 42.974000000000004 C 24.012999999999998 42.974000000000004 24.014 42.974000000000004 24.014 42.974000000000004 L 24.006 42.974000000000004 C 20.829 42.973000000000006 17.706 42.176 14.933 40.663000000000004 L 4.868 43.303 z" stroke-linecap="round" />
                    </g>
                    <g transform="matrix(1 0 0 1 -0.07 0.15)" >
                    <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" transform=" translate(-23.93, -24.15)" d="M 4.868 43.803 C 4.736000000000001 43.803 4.6080000000000005 43.751 4.513 43.654999999999994 C 4.388 43.52799999999999 4.3389999999999995 43.342999999999996 4.386 43.172 L 7.025 33.536 C 5.389 30.630000000000003 4.526 27.330000000000002 4.5280000000000005 23.980000000000004 C 4.532 13.238 13.273 4.5 24.014 4.5 C 29.224 4.502 34.119 6.531000000000001 37.798 10.213000000000001 C 41.477000000000004 13.896 43.502 18.79 43.5 23.994 C 43.496 34.735 34.754 43.474000000000004 24.014 43.474000000000004 C 20.825 43.473000000000006 17.669999999999998 42.68600000000001 14.87 41.197 L 4.994999999999999 43.786 C 4.953 43.798 4.911 43.803 4.868 43.803 z" stroke-linecap="round" />
                    </g>
                    <g transform="matrix(1 0 0 1 -0.07 0.15)" >
                    <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(207,216,220); fill-rule: nonzero; opacity: 1;" transform=" translate(-23.93, -24.15)" d="M 24.014 5 C 29.093 5.002 33.859 6.979 37.444 10.565999999999999 C 41.028000000000006 14.154 43.002 18.921999999999997 43 23.994 C 42.996 34.459 34.478 42.974000000000004 24.014 42.974000000000004 L 24.006 42.974000000000004 C 20.829 42.973000000000006 17.706 42.176 14.933 40.663000000000004 L 4.868 43.303 L 7.562 33.467999999999996 C 5.9 30.59 5.026 27.324 5.027 23.979 C 5.032 13.514 13.548 5 24.014 5 M 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 M 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 M 24.014 4 C 24.014 4 24.014 4 24.014 4 C 12.998 4 4.032 12.962 4.027 23.979 C 4.026 27.346 4.876 30.663999999999998 6.4879999999999995 33.601 L 3.9029999999999996 43.04 C 3.8089999999999997 43.385 3.9049999999999994 43.753 4.157 44.007 C 4.347 44.199 4.604 44.303999999999995 4.868 44.303999999999995 C 4.953 44.303999999999995 5.038 44.29299999999999 5.122 44.270999999999994 L 14.809 41.730999999999995 C 17.637 43.199 20.807 43.974 24.006 43.974999999999994 C 35.03 43.974999999999994 43.995999999999995 35.01199999999999 44.001000000000005 23.994999999999994 C 44.00300000000001 18.65599999999999 41.926 13.635999999999994 38.153000000000006 9.859999999999994 C 34.378 6.083 29.357 4.002 24.014 4 L 24.014 4 z" stroke-linecap="round" />
                    </g>
                    <g transform="matrix(1 0 0 1 0.01 -0.01)" >
                    <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(64,195,81); fill-rule: nonzero; opacity: 1;" transform=" translate(-24.01, -23.99)" d="M 35.176 12.832 C 32.196000000000005 9.850000000000001 28.235000000000003 8.207 24.019000000000002 8.206 C 15.315000000000001 8.206 8.236000000000002 15.282 8.232000000000001 23.979999999999997 C 8.231000000000002 26.961 9.065000000000001 29.862999999999996 10.645000000000001 32.376 L 11.021 32.973 L 9.426 38.794 L 15.399000000000001 37.227999999999994 L 15.976 37.56999999999999 C 18.398 39.007999999999996 21.176000000000002 39.767999999999994 24.008000000000003 39.76899999999999 L 24.014000000000003 39.76899999999999 C 32.712 39.76899999999999 39.791000000000004 32.69199999999999 39.794000000000004 23.99299999999999 C 39.795 19.778 38.156 15.814 35.176 12.832 z" stroke-linecap="round" />
                    </g>
                    <g transform="matrix(1 0 0 1 0.01 0.16)" >
                    <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: evenodd; opacity: 1;" transform=" translate(-24.01, -24.16)" d="M 19.268 16.045 C 18.913 15.255000000000003 18.539 15.239 18.2 15.225000000000001 C 17.923 15.213000000000001 17.607 15.214000000000002 17.291 15.214000000000002 C 16.975 15.214000000000002 16.461000000000002 15.333000000000002 16.026 15.808000000000002 C 15.591 16.283 14.365 17.430000000000003 14.365 19.764000000000003 C 14.365 22.098000000000003 16.065 24.354000000000003 16.302 24.67 C 16.538999999999998 24.986 19.584 29.929000000000002 24.406 31.831000000000003 C 28.412999999999997 33.411 29.229 33.097 30.098999999999997 33.018 C 30.968999999999998 32.939 32.906 31.871000000000002 33.300999999999995 30.763 C 33.696 29.655 33.696 28.706000000000003 33.577999999999996 28.508000000000003 C 33.458999999999996 28.310000000000002 33.142999999999994 28.192000000000004 32.669 27.954000000000004 C 32.195 27.716000000000005 29.862 26.569000000000003 29.426999999999996 26.411000000000005 C 28.991999999999997 26.253000000000004 28.675999999999995 26.174000000000007 28.358999999999995 26.649000000000004 C 28.042999999999996 27.123000000000005 27.133999999999993 28.192000000000004 26.856999999999996 28.508000000000003 C 26.579999999999995 28.825000000000003 26.302999999999997 28.865000000000002 25.828999999999997 28.627000000000002 C 25.354999999999997 28.389000000000003 23.826999999999998 27.889000000000003 22.013999999999996 26.273000000000003 C 20.603999999999996 25.016000000000002 19.651999999999994 23.463000000000005 19.374999999999996 22.988000000000003 C 19.097999999999995 22.514000000000003 19.344999999999995 22.257 19.582999999999995 22.020000000000003 C 19.795999999999996 21.807000000000002 20.056999999999995 21.466000000000005 20.294999999999995 21.189000000000004 C 20.531999999999993 20.912000000000003 20.610999999999994 20.714000000000002 20.768999999999995 20.398000000000003 C 20.926999999999996 20.081000000000003 20.847999999999995 19.804000000000002 20.728999999999996 19.567000000000004 C 20.612 19.329 19.69 16.983 19.268 16.045 z" stroke-linecap="round" />
                    </g>
                    </g>
                    </g>
                    </svg>
                    {{ t('search.contactOnWhatsApp') }}
                  </a>
                </li>

                <!-- Show more button with count -->
                <li v-if="hasMore || totalResults > suggestions.length" class="border-t">
                  <NuxtLinkLocale
                    :to="`/shop?search=${encodeURIComponent(term.trim())}`"
                    class="block px-3 py-2 text-emerald-700 hover:bg-emerald-50 text-sm text-center font-medium"
                    @click="open=false"
                  >
                    Show more results<span v-if="totalResults"> ({{ totalResults }})</span>
                  </NuxtLinkLocale>
                </li>
              </ul>

              <div v-else class="px-4 py-3 text-sm text-gray-500">
                No results
              </div>
            </template>
          </div>
        </transition>
      </div>

      <!-- Wishlist / Account / Cart -->
      <div class="flex items-center gap-6 text-sm text-gray-700">
        <NuxtLinkLocale v-if="!isAuthed" to="/auth/login-register" class="flex items-center gap-1">
          <UserPlusIcon class="w-5 h-5" />
          <span>{{ t('logIn') }}</span>
        </NuxtLinkLocale>

        <NuxtLinkLocale v-else to="/account" class="flex items-center gap-1">
          <UserPlusIcon class="w-5 h-5" />
          <span>{{ t('account') }}</span>
        </NuxtLinkLocale>

        <NuxtLinkLocale to="/wishlist" class="flex items-center gap-1">
          <HeartIcon class="w-5 h-5" />
          <span>{{ t('wishlist') }}</span>
        </NuxtLinkLocale>

        <NuxtLinkLocale to="/cart" class="flex items-center gap-1 relative">
          <ShoppingCartIcon class="w-5 h-5" />
          <span>{{ t('cart') }}</span>
        </NuxtLinkLocale>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '~/composables/useAuth'
import {
  HeartIcon,
  UserPlusIcon,
  ShoppingCartIcon,
  MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'

const { t, locale } = useI18n()
const auth = useAuth()
const { $customApi } = useNuxtApp()
const router = useRouter()

onMounted(() => auth.hydrate?.())
const isAuthed = computed(() => auth.isAuthenticated?.value ?? false)

/* WhatsApp link builder */
const WHATSAPP_NUMBER = '971504429045' // move to runtime config if you prefer
function waLink(p: any) {
  const msg = t('search.askAboutProduct', { title: p?.title || '' }) as string
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

/* ---------- Typewriter placeholder ---------- */
const phrases = computed(() => [ t('searchPlaceholder'), t('carRemotes'), t('keyCuttingMachines'), t('accessoriesTools') ])
const typedText = ref('')
let phraseIndex = 0, charIndex = 0, deleting = false, timerId: any
function tick() {
  const list = phrases.value, current = list[phraseIndex] || ''
  if (!deleting) { typedText.value = current.substring(0, charIndex + 1); charIndex++; if (charIndex >= current.length) { deleting = true; timerId = setTimeout(tick, 1200); return } }
  else { typedText.value = current.substring(0, Math.max(0, charIndex - 1)); charIndex--; if (charIndex <= 0) { deleting = false; phraseIndex = (phraseIndex + 1) % list.length } }
  timerId = setTimeout(tick, deleting ? 45 : 90)
}
function startTyping() { stopTyping(); phraseIndex=0; charIndex=0; deleting=false; tick() }
function stopTyping() { if (timerId) clearTimeout(timerId); timerId = null }
onMounted(startTyping); onBeforeUnmount(stopTyping); watch(() => locale.value, () => startTyping())

/* ---------- utils ---------- */
const isString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const nameFromJson = (n: any): string => {
  if (!n) return ''
  if (typeof n === 'string') { try { const o = JSON.parse(n); return (o?.en ?? Object.values(o || {})[0] ?? '') as string } catch { return n } }
  if (typeof n === 'object') return (n.en ?? Object.values(n)[0] ?? '') as string
  return String(n)
}
const { formatMoney } = useCurrency()
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))
const buildRegex = (q: string) => {
  const words = q.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp('(' + escaped.join('|') + ')', 'gi')
}
const highlight = (text: string) => {
  const t = term.value.trim()
  const rx = buildRegex(t)
  const safe = escapeHtml(String(text || ''))
  return rx ? safe.replace(rx, '<mark class="bg-yellow-200">$1</mark>') : safe
}

/* ---------- Suggest logic ---------- */
const term = ref('')
const suggestions = ref<any[]>([])
const hasMore = ref(false)
const totalResults = ref(0)
const loading = ref(false)
const error = ref('')
const open = ref(false)
const active = ref(-1)
const searchWrap = ref<HTMLElement|null>(null)
const activeId = computed(() => active.value >= 0 ? `sug-${active.value}` : undefined)

function onFocus(){ if (term.value.trim().length >= 3) open.value = true }

let debounceId: number | undefined
watch(term, (v) => {
  if (debounceId) clearTimeout(debounceId)
  if (!v || v.trim().length < 3) {
    suggestions.value = []; hasMore.value = false; error.value = ''; open.value = false; totalResults.value = 0
    return
  }
  open.value = true
  debounceId = window.setTimeout(fetchSuggest, 200)
})

async function fetchSuggest() {
  const q = term.value.trim(); if (q.length < 3) return
  loading.value = true; error.value = ''
  try {
    const res: any = await $customApi('/search/suggest', { params: { search: q, limit: 5 } })
    const root = res?.data ?? res ?? {}
    const raw  = root.data ?? root
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Object.values(raw || {})
    const mapped = (items || []).map((p: any) => ({
      ...p,
      title: nameFromJson(p?.title),
      image: isString(p?.image) ? p.image : null
    }))
    suggestions.value = mapped
    hasMore.value = !!(root?.meta?.has_more)
    totalResults.value = Number(root?.meta?.total ?? mapped.length) || mapped.length
    active.value = mapped.length ? 0 : -1
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to fetch suggestions'
    suggestions.value = []; hasMore.value = false; totalResults.value = 0; active.value = -1
  } finally {
    loading.value = false; open.value = true
  }
}

function move(delta:number){
  if (!open.value || !suggestions.value.length) return
  const n = suggestions.value.length
  active.value = ((active.value + delta + n) % n)
}
function pick(p:any){ open.value = false; router.push(p.href || `/products/${p.slug || p.id}`) }
function goToShop(){
  const q = term.value.trim(); if (!q) return
  open.value = false
  router.push(`/shop?search=${encodeURIComponent(q)}`)
}

/* click-outside to close */
function onDocMouseDown(e: MouseEvent){
  const t = e.target as Node
  const w = searchWrap.value
  if (!w) return
  if (!w.contains(t)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocMouseDown, { capture: true }))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDown, { capture: true }))
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .12s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
mark { padding: 0 2px; border-radius: 2px; }
</style>
