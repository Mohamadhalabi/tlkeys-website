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

        <!-- Suggestions -->
        <transition name="fade">
          <div
            v-if="open && (loading || error || suggestions.length || showMore)"
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
                  class="relative cursor-pointer hover:bg-gray-50"
                  :class="idx === active ? 'bg-gray-100' : ''"
                >
                  <!-- Full-tile link so right-click shows 'Open link in new tab' -->
                  <NuxtLinkLocale
                    :to="productTo(p)"
                    class="absolute inset-0"
                    :aria-label="nameFromJson(p.title) || 'Open product'"
                  />

                  <!-- Actual visual content sits above; pointer-events-none so clicks go to the link -->
                  <div class="relative z-10 pointer-events-none flex items-center gap-3 px-3 py-2">
                    <NuxtImg
                      v-if="p.image"
                      :src="p.image"
                      width="80"
                      height="80"
                      class="rounded border object-cover shrink-0 pointer-events-auto"
                      @click.prevent="router.push(productTo(p))"
                      @contextmenu.stop
                    />

                    <div class="min-w-0 flex-1">
                      <div class="text-md font-medium line-clamp-4" v-html="highlight(p.title)"></div>
                      <div
                        class="text-sm font-bold text-green-700 line-clamp-1"
                        v-if="p.sku"
                        v-html="highlight('SKU: ' + p.sku)"
                      ></div>
                    </div>

                    <div v-if="!p.hide_price" class="text-right whitespace-nowrap">
                      <div class="text-base font-semibold text-red-700">{{ formatMoney(p.price) }}</div>
                      <div v-if="oldFor(p) !== null" class="text-xs text-gray-500 line-through">
                        {{ formatMoney(oldFor(p)!) }}
                      </div>
                    </div>

                    <!-- Keep WhatsApp as a real link; re-enable events just for this control -->
                    <a
                      v-else
                      :href="waLink(p)"
                      target="_blank"
                      rel="noopener"
                      class="pointer-events-auto inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 text-xs font-semibold whitespace-nowrap"
                      @click.stop
                      :aria-label="t('search.contactOnWhatsApp')"
                    >
                      <!-- your SVG here -->
                      {{ t('search.contactOnWhatsApp') }}
                    </a>
                  </div>
                </li>

              </ul>

              <!-- Footer: show-more (outside the scroll area) -->
              <div v-if="showMore" class="border-t">
                <NuxtLinkLocale
                  :to="`/shop?search=${encodeURIComponent(term.trim())}`"
                  class="block px-3 py-2 text-white bg-gray-600 hover:bg-gray-700  hover:text-white text-lg text-center font-medium"
                  @click="open=false"
                >
                  Show more results
                  <span v-if="Number(totalResults) > (suggestions.length || 0)">
                    ({{ totalResults }})
                  </span>
                </NuxtLinkLocale>
              </div>

              <div v-else-if="!suggestions.length" class="px-4 py-3 text-sm text-gray-500">No results</div>
            </template>
          </div>
        </transition>
      </div>

      <!-- Wishlist / Account / Cart -->
      <div class="flex items-center gap-6 text-sm text-gray-700">
        <NuxtLinkLocale v-if="!isAuthed" to="/auth/login-register" class="flex items-center gap-1">
          <UserPlusIcon class="w-7 h-7" />
          <span>{{ t('menu.logIn') }}</span>
        </NuxtLinkLocale>

        <!-- replace this chunk in your header -->
        <NuxtLinkLocale v-else to="/account" class="flex items-center gap-1">
          <UserPlusIcon class="w-7 h-7" />
          <span v-if="displayName">Hello <span class="font-bold">{{ displayName }}</span></span>
          <span v-else>Hello</span>
        </NuxtLinkLocale>


        <NuxtLinkLocale to="/wishlist" class="relative flex items-center gap-2">
          <span class="relative">
            <HeartIcon class="w-7 h-7" />
            <span class="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center font-bold" aria-label="Wishlist items count">
              {{ wishlistCount }}
            </span>
          </span>
          <span class="hidden sm:inline">{{ t('menu.wishlist') }}</span>
        </NuxtLinkLocale>

        <NuxtLinkLocale to="/cart" class="relative flex items-center gap-2">
          <span class="relative">
            <ShoppingCartIcon class="w-7 h-7" />
            <span class="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center font-bold" aria-label="Cart items count">
              {{ cartCount }}
            </span>
          </span>
          <span class="hidden sm:inline">{{ t('menu.cart') }}</span>
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
import { useWishlist } from '~/composables/useWishlist'
import { useCart } from '~/composables/useCart'
import { HeartIcon, UserPlusIcon, ShoppingCartIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

const { t, locale } = useI18n()
const auth = useAuth()
const { $customApi } = useNuxtApp()
const router = useRouter()
const { formatMoney } = useCurrency()

const wishlist = useWishlist()
const cart = useCart()

const wishlistCount = computed(() => Number(wishlist.count?.value ?? 0))
const cartCount = computed(() => Number(cart.count?.value ?? 0))

onMounted(() => auth.hydrate?.())
const isAuthed = computed(() => auth.isAuthenticated?.value ?? false)

/* WhatsApp link builder */
const WHATSAPP_NUMBER = '971504429045'
function waLink(p: any) {
  const msg = t('search.askAboutProduct', { title: p?.title || '' }) as string
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

const displayName = computed(() => {
  const u = auth.user.value  // 👈 unwrap the ref here
  if (!u) return null
  if (u.name && String(u.name).trim()) return u.name
  if (u.email) return u.email.split('@')[0]
  return null
})

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

/* price helpers */
const num = (v: any): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null }
const approxEq = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol
const oldFor = (p: any): number | null => {
  const price = num(p?.price); if (price == null) return null
  const old = num(p?.old_price); if (old != null && old > price) return old
  const sale = num(p?.sale_price); const reg = num(p?.regular_price)
  if (sale != null && reg != null && reg > sale && (approxEq(price, sale) || price < reg)) return reg
  return null
}


function productTo(p: any) {
  return p?.href || `/products/${p.slug}`
}

/* ---------- Suggest logic ---------- */
const term = ref('')
const suggestions = ref<any[]>([])
const hasMore = ref(false)
const totalResults = ref(0)
const showMore = ref(false)     // controlled via API meta
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
    suggestions.value = []; hasMore.value = false; totalResults.value = 0; showMore.value = false
    error.value = ''; open.value = false
    return
  }
  open.value = true
  debounceId = window.setTimeout(fetchSuggest, 200)
})

/* Unify Axios-style and direct-payload responses */
function unpack(res: any) {
  const top = res && typeof res === 'object' ? res : {}
  const payload = (top.data && (top.data.meta || Array.isArray(top.data) || top.data.data))
    ? top.data
    : top
  const dataArr = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.data) ? payload.data : [])
  const metaObj = payload?.meta ?? top?.meta ?? {}
  return { dataArr, metaObj }
}

async function fetchSuggest() {
  const q = term.value.trim(); if (q.length < 3) return
  loading.value = true; error.value = ''
  try {
    const res: any = await $customApi('/search/suggest', { params: { search: q, limit: 5 } })
    const { dataArr, metaObj } = unpack(res)

    const mapped = (dataArr || []).map((p: any) => ({
      ...p,
      title: nameFromJson(p?.title),
      image: isString(p?.image) ? p.image : null
    }))
    suggestions.value = mapped

    const total = Number(metaObj?.total ?? mapped.length) || mapped.length
    const more  = Boolean(metaObj?.has_more)
    totalResults.value = total
    hasMore.value = more
    showMore.value = more || total > mapped.length

    active.value = mapped.length ? 0 : -1
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to fetch suggestions'
    suggestions.value = []; hasMore.value = false; totalResults.value = 0; showMore.value = false; active.value = -1
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
