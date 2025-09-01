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
                    <!-- strike-through for discount OR sale-only -->
                    <div v-if="oldFor(p) !== null" class="text-xs text-gray-500 line-through">
                      {{ formatMoney(oldFor(p)!) }}
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
                    <!-- compact, valid WhatsApp SVG -->
                    <svg
                      id="WhatsApp_24"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M20.52 3.48A11 11 0 0 0 4.6 19.4L3 22.5l3.2-1.55A11 11 0 1 0 20.52 3.48Zm-8.6 4.2c.22 0 .48.01.73.06.24.05.5.27.57.52l.36 1.28c.07.25-.01.56-.19.74l-.6.6a5.9 5.9 0 0 0 2.92 2.92l.6-.6c.18-.18.49-.26.74-.19l1.28.36c.25.07.47.33.52.57.1.5.15.97.06 1.45-.07.35-.4.66-.75.83-1.04.5-2.23.53-3.39.13-1.18-.41-2.45-1.25-3.6-2.4-1.15-1.15-1.99-2.42-2.4-3.6-.4-1.16-.37-2.35.13-3.39.17-.35.48-.68.83-.75.2-.04.41-.06.58-.06Z"
                        fill="currentColor"
                      />
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
          <span>{{ t('menu.logIn') }}</span>
        </NuxtLinkLocale>

        <NuxtLinkLocale v-else to="/account" class="flex items-center gap-1">
          <UserPlusIcon class="w-5 h-5" />
          <span>{{ t('menu.account') }}</span>
        </NuxtLinkLocale>

        <NuxtLinkLocale to="/wishlist" class="flex items-center gap-1">
          <HeartIcon class="w-5 h-5" />
          <span>{{ t('menu.wishlist') }}</span>
        </NuxtLinkLocale>

        <NuxtLinkLocale to="/cart" class="flex items-center gap-1 relative">
          <ShoppingCartIcon class="w-5 h-5" />
          <span>{{ t('menu.cart') }}</span>
        </NuxtLinkLocale>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuth } from '~/composables/useAuth'
import { useCurrency } from '~/composables/useCurrency'
import { useNuxtApp, useRouter } from '#imports'
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
const { formatMoney } = useCurrency()

onMounted(() => auth.hydrate?.())
const isAuthed = computed(() => auth.isAuthenticated?.value ?? false)

/* WhatsApp link builder */
const WHATSAPP_NUMBER = '971504429045'
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
  if (!deleting) {
    typedText.value = current.substring(0, charIndex + 1)
    charIndex++
    if (charIndex >= current.length) { deleting = true; timerId = setTimeout(tick, 1200); return }
  } else {
    typedText.value = current.substring(0, Math.max(0, charIndex - 1))
    charIndex--
    if (charIndex <= 0) { deleting = false; phraseIndex = (phraseIndex + 1) % list.length }
  }
  timerId = setTimeout(tick, deleting ? 45 : 90)
}
function startTyping() { stopTyping(); phraseIndex=0; charIndex=0; deleting=false; tick() }
function stopTyping() { if (timerId) clearTimeout(timerId); timerId = null }
onMounted(startTyping); onBeforeUnmount(stopTyping); watch(() => locale.value, () => startTyping())

/* ---------- utils ---------- */
const isString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const nameFromJson = (n: any): string => {
  if (!n) return ''
  if (typeof n === 'string') {
    try { const o = JSON.parse(n); return (o?.en ?? Object.values(o || {})[0] ?? '') as string }
    catch { return n }
  }
  if (typeof n === 'object') return (n.en ?? Object.values(n)[0] ?? '') as string
  return String(n)
}
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

/* price helpers for strike-through */
const num = (v: any): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const approxEq = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol
const oldFor = (p: any): number | null => {
  const price = num(p?.price)
  if (price == null) return null

  // Discount case from backend
  const old = num(p?.old_price)
  if (old != null && old > price) return old

  // Sale-only case (no discount): show regular as strike if sale < regular
  const sale = num(p?.sale_price)
  const reg  = num(p?.regular_price)
  if (sale != null && reg != null && reg > sale && (approxEq(price, sale) || price < reg)) {
    return reg
  }
  return null
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
