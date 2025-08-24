<template>
  <div class="bg py-3">
    <div class="mx-auto px-6 max-w-screen-xl flex items-center justify-between gap-6 relative">
      <!-- Logo -->
      <NuxtLink to="/" class="website-logo flex items-center justify-center">
        <NuxtImg src="/images/logo/techno-lock-desktop-logo.webp" alt="Logo" class="h-full object-contain" />
      </NuxtLink>

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
                    <!-- 2) highlighted title/SKU -->
                    <div class="text-md font-medium line-clamp-4" v-html="highlight(p.title)"></div>
                    <div class="text-sm font-bold text-green-700 line-clamp-1" v-if="p.sku" v-html="highlight('SKU: ' + p.sku)"></div>
                  </div>
                  <div class="text-base font-semibold text-red-700 whitespace-nowrap" v-if="p.price != null">
                    {{ money(p.price) }}
                  </div>
                </li>

                <!-- 3) Show more button with count -->
                <li v-if="hasMore || totalResults > suggestions.length" class="border-t">
                  <NuxtLink
                    :to="`/shop?search=${encodeURIComponent(term.trim())}`"
                    class="block px-3 py-2 text-emerald-700 hover:bg-emerald-50 text-sm text-center font-medium"
                    @click="open=false"
                  >
                    Show more results<span v-if="totalResults"> ({{ totalResults }})</span>
                  </NuxtLink>
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
        <NuxtLink v-if="!isAuthed" to="/auth/login-register" class="flex items-center gap-1">
          <UserPlusIcon class="w-5 h-5" />
          <span>{{ t('logIn') }}</span>
        </NuxtLink>

        <NuxtLink v-else to="/account" class="flex items-center gap-1">
          <UserPlusIcon class="w-5 h-5" />
          <span>{{ t('account') }}</span>
        </NuxtLink>

        <NuxtLink to="/wishlist" class="flex items-center gap-1">
          <HeartIcon class="w-5 h-5" />
          <span>{{ t('wishlist') }}</span>
        </NuxtLink>

        <NuxtLink to="/cart" class="flex items-center gap-1 relative">
          <ShoppingCartIcon class="w-5 h-5" />
          <span>{{ t('cart') }}</span>
        </NuxtLink>
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
const money = (v: unknown) => Number(v || 0).toFixed(2)
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
const totalResults = ref(0)           // NEW: total from meta to show in button
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
    // console.log('[suggest]', { q, items: mapped.length, total: totalResults.value, sample: mapped[0] })
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

/* ---------- click-outside to close ---------- */
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
