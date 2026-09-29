<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useNuxtApp, useRuntimeConfig, useHead, useCookie, useRequestURL } from '#imports'
import { useI18n } from 'vue-i18n'

definePageMeta({
  layout: 'pincode_layout',
  analytics: false,
})

type ApiResponse = {
  error?: string
  message?: string
  status?: string
  errors?: { vin?: string[] }
  vin?: string
  key_code?: string | null
  pin_code?: string | null
  requests_today?: number
  requests_this_month?: number
  requests_left_today?: number
  requests_left_month?: number
  has_token?: number
  available_in_db?: boolean
  show_cached_indicator?: boolean
}

type HistoryItem = {
  vin: string
  key_code: string | null
  pin_code: string | null
  looked_up: string
  from_cache: number | null
}

/** Which lookup this page is. Sent to /check-user and /vin-to-pin/history. */
const API_TYPE = 'old'

const vin = ref('')
const usernameInput = ref('')
const passwordInput = ref('')
const keyCode = ref('')
const pinCode = ref('')
const showVinError = ref(false)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const hasToken = ref(false)
const requestsThisMonth = ref<number>(0)
const tokensLeft = ref<number | null>(null)
const greenTextState = ref(false)
const showCachedIndicator = ref(false)

/**
 * History panel. Only shown when the server sets show_history for this
 * account; the history endpoint also refuses everyone else with a 403.
 */
const showHistory = ref(false)
const history = ref<HistoryItem[]>([])
const historyLoading = ref(false)
const historyError = ref<string | null>(null)

/** Tabs: the calculator is the default; History only exists for show_history accounts. */
type Tab = 'calc' | 'history'
const activeTab = ref<Tab>('calc')
const copiedVin = ref<string | null>(null)

/** Window the server returns (days). Kept from the response so the title stays in sync. */
const historyDays = ref(29)
/** Client-side pagination: the server already caps the list, so paging here is enough. */
const HISTORY_PAGE_SIZE = 10
const historyPage = ref(1)

const historyTotalPages = computed(() =>
  Math.max(1, Math.ceil(history.value.length / HISTORY_PAGE_SIZE))
)

const pagedHistory = computed(() => {
  const start = (historyPage.value - 1) * HISTORY_PAGE_SIZE
  return history.value.slice(start, start + HISTORY_PAGE_SIZE)
})

/** Page buttons with ellipses, e.g. 1 … 4 5 6 … 12 */
const historyPageButtons = computed<(number | '…')[]>(() => {
  const total = historyTotalPages.value
  const cur = historyPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '…')[] = [1]
  const from = Math.max(2, cur - 1)
  const to = Math.min(total - 1, cur + 1)
  if (from > 2) pages.push('…')
  for (let p = from; p <= to; p++) pages.push(p)
  if (to < total - 1) pages.push('…')
  pages.push(total)
  return pages
})

function goToHistoryPage(p: number) {
  historyPage.value = Math.min(Math.max(1, p), historyTotalPages.value)
}

/**
 * Set only after the customer confirms the "not in DB, order it?" prompt.
 * Reset on every fresh submit and on logout, so a yes never carries over
 * to the next VIN.
 */
const forceOrder = ref(false)

const { $customApi } = useNuxtApp()
const { public: { API_BASE_URL, API_KEY, SECRET_KEY } } = useRuntimeConfig()
const { t, locale } = (useI18n?.() as any) || { t: (s: string) => s, locale: ref('en') }

const currencyCookie = useCookie<string>('currency', { default: () => 'USD', sameSite: 'lax', path: '/' })

/**
 * Short-lived token from /vin-to-pin/login. Separate cookie from the new
 * page so the two lookups can be logged in independently.
 */
const host = useRequestURL().hostname
const onTlkeys = host === 'tlkeys.com' || host.endsWith('.tlkeys.com')

/*
 * domain + secure only on the real site. On 127.0.0.1 / localhost the browser
 * silently rejects a cookie for '.tlkeys.com' (and a secure cookie over plain
 * http), so the token only lived in memory and every refresh logged you out.
 */
const tokenCookie = useCookie<string | null>('vp_token_vin', {
  default: () => null,
  maxAge: 12 * 3600,
  sameSite: 'strict',
  secure: onTlkeys,
  path: '/',
  domain: onTlkeys ? '.tlkeys.com' : undefined,
})

const isLoggedIn = computed(() => !!tokenCookie.value)
const lang = () => String(locale?.value || 'en')

function baseHeaders() {
  return {
    'Accept-Language': lang(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'currency': currencyCookie.value || 'USD',
    'secret-key': SECRET_KEY,
    'api-key': API_KEY,
  }
}

/**
 * A dedicated header, not Authorization: plugins/auth.client.ts already
 * puts the site's own JWT there on every request, which would overwrite
 * this one and cause an immediate 401.
 */
function authHeaders() {
  return { ...baseHeaders(), 'X-VinPin-Token': tokenCookie.value || '' }
}

onMounted(() => {
  if (tokenCookie.value) loadStats().catch(() => doLogout())
})

watch(vin, (v) => { if (v.length === 17) showVinError.value = false })

function formatVin() {
  vin.value = vin.value.replace(/o/gi, '0').toUpperCase().slice(0, 17)
}

const successState = computed(() => !!(keyCode.value && pinCode.value))
const disabled = computed(() => isLoading.value || vin.value.length !== 17)

async function loadStats() {
  const res: any = await $customApi(`/check-user`, {
    method: 'POST',
    headers: authHeaders(),
    body: { api_type: API_TYPE },
  })

  const data = (res?.data && typeof res.data === 'object') ? res.data : res

  hasToken.value = !!data.has_token
  requestsThisMonth.value = data.requests_this_month || 0
  tokensLeft.value = data.tokens_left ?? null

  // Server-side flag, replacing the old hardcoded username comparison
  // that put a customer's credential in the public JS bundle.
  showCachedIndicator.value = !!data.show_cached_indicator

  showHistory.value = !!data.show_history
  if (showHistory.value) {
    loadHistory()
  } else {
    history.value = []
    activeTab.value = 'calc'
  }
}

/**
 * Last lookups for this account. A failure here never blocks the page;
 * the panel just stays empty.
 */
async function loadHistory() {
  if (!showHistory.value) return

  historyLoading.value = true
  historyError.value = null

  try {
    const res: any = await $customApi(`/vin-to-pin/history`, {
      method: 'POST',
      headers: authHeaders(),
      body: { api_type: API_TYPE },
    })

    const data = (res?.data && typeof res.data === 'object') ? res.data : res
    history.value = Array.isArray(data?.history) ? data.history : []
    if (Number(data?.days) > 0) historyDays.value = Number(data.days)
    // Keep the current page if it still exists after a refresh.
    if (historyPage.value > historyTotalPages.value) historyPage.value = historyTotalPages.value
  } catch (e: any) {
    const status = e?.response?.status ?? e?.status ?? e?.statusCode
    history.value = []
    historyError.value = e?.data?.error
      || e?.data?.message
      || (status ? `Could not load history (HTTP ${status}).` : 'Could not load history.')
    console.warn('[vin-to-pin] history failed', status, e?.data)
  } finally {
    historyLoading.value = false
  }
}

function openTab(tab: Tab) {
  activeTab.value = tab
  // Always show fresh data when the History tab is opened.
  if (tab === 'history') {
    historyPage.value = 1
    loadHistory()
  }
}

function copyHistoryItem(item: HistoryItem) {
  navigator.clipboard.writeText(`${item.vin}
${item.key_code || ''}
${item.pin_code || ''}`)
    .then(() => {
      copiedVin.value = item.vin
      setTimeout(() => { if (copiedVin.value === item.vin) copiedVin.value = null }, 1500)
    })
    .catch(() => {})
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

async function handleLogin() {
  if (!usernameInput.value || !passwordInput.value) return

  isLoading.value = true
  errorMessage.value = null

  try {
    const res: any = await $customApi(`/vin-to-pin/login`, {
      method: 'POST',
      headers: baseHeaders(),
      body: { username: usernameInput.value, password: passwordInput.value, scope: 'vin' },
    })

    const data = (res?.data && typeof res.data === 'object') ? res.data : res

    if (!data?.token) throw new Error(data?.error || 'Login failed')

    tokenCookie.value = data.token
    passwordInput.value = ''       // not kept in memory after use

    await loadStats()
  } catch (e: any) {
    errorMessage.value = e?.data?.error || e?.response?.data?.error || e?.message || t('vin_to_pin.generic_error')
    doLogout()
  } finally {
    isLoading.value = false
  }
}

function doLogout() {
  if (tokenCookie.value) {
    // Fire-and-forget: the cookie clears either way, so a failed network
    // call cannot leave the user stuck logged in.
    $customApi(`/vin-to-pin/logout`, {
      method: 'POST',
      headers: authHeaders(),
    }).catch(() => {})
  }

  tokenCookie.value = null
  usernameInput.value = ''
  passwordInput.value = ''
  vin.value = ''
  keyCode.value = ''
  pinCode.value = ''
  errorMessage.value = null
  forceOrder.value = false
  greenTextState.value = false
  showHistory.value = false
  history.value = []
  historyError.value = null
  activeTab.value = 'calc'
  copiedVin.value = null
  historyPage.value = 1
}

/**
 * isRetry = true is the second call made after the customer answers yes to
 * the confirmation prompt. It keeps forceOrder and does not wipe the fields
 * that were already cleared on the first pass.
 */
async function handleSubmit(isRetry = false) {
  if (!isRetry) forceOrder.value = false

  if (vin.value.length !== 17) { showVinError.value = true; return }

  showVinError.value = false
  errorMessage.value = null

  if (!isRetry) {
    keyCode.value = ''
    pinCode.value = ''
    greenTextState.value = false
  }

  isLoading.value = true

  try {
    const res: any = await $customApi(`/vin-to-pin-old`, {
      method: 'POST',
      headers: authHeaders(),
      // No username in the body: the server reads it from the token, so
      // one account cannot spend another's quota.
      body: { vin: vin.value, force_order: forceOrder.value },
    })

    const data: ApiResponse = (res?.data && typeof res.data === 'object') ? res.data : res

    // Not in our database and this account is flagged
    // ljd_confirm_before_order — ask before spending an order upstream.
    if (data?.status === 'requires_confirmation') {
      isLoading.value = false

      const prompt = data?.message
        || t('vin_to_pin.confirm_order')
        || 'This VIN is not in the database. Would you like to order it?'

      if (confirm(prompt)) {
        forceOrder.value = true
        await handleSubmit(true)
      } else {
        errorMessage.value = t('vin_to_pin.order_cancelled') || 'Order cancelled.'
      }

      return
    }

    if (data?.error) {
      errorMessage.value = data.error
    } else if (data?.vin === 'Not Correct Vin') {
      errorMessage.value = t('vin_to_pin.invalid_vin')
    } else {
      keyCode.value = data?.key_code || ''
      pinCode.value = data?.pin_code || ''

      requestsThisMonth.value = data?.requests_this_month ?? requestsThisMonth.value

      if (data?.has_token) {
        tokensLeft.value = data?.requests_left_month ?? tokensLeft.value
      }

      // Green borders: this VIN was already in our own database, and this
      // account is the one the server flagged to see that.
      if (data?.available_in_db && showCachedIndicator.value) greenTextState.value = true

      // Put the lookup that just finished at the top of the list.
      if (showHistory.value && keyCode.value && pinCode.value) loadHistory()
    }
  } catch (e: any) {
    const status = e?.response?.status ?? e?.status ?? e?.statusCode

    if (status === 401) {
      errorMessage.value = 'Session expired. Please log in again.'
      doLogout()
    } else if (status === 429) {
      errorMessage.value = 'Too many requests. Please wait a moment.'
    } else if (e?.data?.errors?.vin?.[0]) {
      errorMessage.value = e.data.errors.vin[0]
    } else {
      errorMessage.value = e?.data?.error || e?.response?.data?.error || t('vin_to_pin.generic_error')
    }
  } finally {
    isLoading.value = false
  }
}

function copyToClipboard() {
  navigator.clipboard.writeText(`${vin.value}\n${keyCode.value}\n${pinCode.value}`).catch(() => {})
}

useHead(() => ({
  title: t('vin_to_pin.page_title'),
  meta: [
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
    { name: 'googlebot', content: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
  ],
}))
</script>

<template>
  <main
    class="relative min-h-screen bg-black flex items-start justify-center"
    :dir="(locale === 'ar' || locale?.value === 'ar') ? 'rtl' : 'ltr'"
  >
    <button
      v-if="isLoggedIn"
      type="button"
      class="logout-button absolute top-4 right-4 sm:top-6 sm:right-6 !h-[42px] !text-sm"
      @click="doLogout"
    >
      Logout
    </button>

    <div class="w-full max-w-[760px] px-4 m-auto">
      <h2 class="text-white text-center font-semibold tracking-wide text-[22px] mt-16 mb-6">
        {{ $t('vin_to_pin.title') }}
      </h2>

      <div
        v-if="errorMessage"
        class="mx-auto mb-5 max-w-[680px] text-center rounded-md border border-red-400 bg-red-400 text-white text-xl px-4 py-3 text-sm"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <transition name="fade">
        <div v-if="isLoading" class="fixed inset-0 z-10 bg-black/55 flex items-center justify-center">
          <div class="h-12 w-12 rounded-full border-4 border-white/25 border-t-white animate-spin"></div>
        </div>
      </transition>

      <form v-if="!isLoggedIn" @submit.prevent="handleLogin" class="flex flex-col items-center">
        <input
          type="text"
          v-model="usernameInput"
          required
          autocomplete="username"
          :placeholder="$t('vin_to_pin.username_placeholder') || 'Username'"
          class="pill-input username-width"
        />

        <input
          type="password"
          v-model="passwordInput"
          required
          autocomplete="current-password"
          placeholder="Password"
          class="pill-input username-width"
        />

        <button type="submit" class="get-button" :disabled="isLoading">
          <span>{{ isLoading ? 'Loading...' : 'LOGIN' }}</span>
        </button>
      </form>

      <div v-else>
        <div class="mx-auto mb-5 max-w-[680px] text-center text-zinc-400 text-md text-white font-medium">
          <template v-if="hasToken">
            Tokens Left: <span class="text-green-400">{{ tokensLeft }}</span> | Used this month: {{ requestsThisMonth }}
          </template>
          <template v-else>
            Used this month: {{ requestsThisMonth }}
          </template>
        </div>

        <!-- Tabs: only shown to accounts with show_history = 1 -->
        <div v-if="showHistory" class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'calc' }"
            :aria-selected="activeTab === 'calc'"
            @click="openTab('calc')"
          >
            PIN Calculator
          </button>
          <button
            type="button"
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'history' }"
            :aria-selected="activeTab === 'history'"
            @click="openTab('history')"
          >
            History
          </button>
        </div>

        <form
          v-show="!showHistory || activeTab === 'calc'"
          @submit.prevent="() => handleSubmit(false)"
          class="flex flex-col items-center"
        >
          <input
            type="text"
            v-model="vin"
            @input="formatVin"
            maxlength="17"
            required
            autocomplete="off"
            :placeholder="$t('vin_to_pin.vin_placeholder')"
            class="pill-input vin-width"
            :class="[
              showVinError ? 'ring-2 ring-red-500/70' : '',
              successState ? 'success-border' : '',
              greenTextState ? 'green-text' : ''
            ]"
          />

          <input
            type="text"
            v-model="keyCode"
            :placeholder="$t('vin_to_pin.key_code_placeholder')"
            readonly
            class="pill-input key-width"
            :class="[
              successState ? 'success-border' : '',
              greenTextState ? 'green-text' : ''
            ]"
          />

          <input
            type="text"
            v-model="pinCode"
            :placeholder="$t('vin_to_pin.pin_code_placeholder')"
            readonly
            class="pill-input pin-width pin-accent"
            :class="[
              successState ? 'success-border' : '',
              greenTextState ? 'green-text' : ''
            ]"
          />

          <div class="flex items-center justify-center gap-4 mt-6 flex-wrap">
            <button
              type="submit"
              :disabled="disabled"
              class="get-button"
            >
              <span>{{ isLoading ? $t('vin_to_pin.loading') : $t('vin_to_pin.get_button') }}</span>
            </button>

            <button
              v-if="keyCode && pinCode && !isLoading"
              type="button"
              @click="copyToClipboard"
              class="copy-button"
            >
              {{ $t('vin_to_pin.copy_button') }}
            </button>
          </div>
        </form>

        <!-- History tab -->
        <section v-if="showHistory" v-show="activeTab === 'history'" class="history-panel" role="tabpanel">
          <div class="history-head">
            <h4 class="history-title">
              Last {{ historyDays }} days
              <span v-if="history.length" class="history-count">· {{ history.length }} lookups</span>
            </h4>
            <button type="button" class="h-refresh" :disabled="historyLoading" @click="loadHistory">
              {{ historyLoading ? 'Loading…' : 'Refresh' }}
            </button>
          </div>

          <p v-if="historyLoading && !history.length" class="history-note">Loading…</p>
          <p v-else-if="historyError" class="history-note history-err">{{ historyError }}</p>
          <p v-else-if="!history.length" class="history-note">No lookups in the last {{ historyDays }} days.</p>

          <div v-else class="h-list">
            <article
              v-for="item in pagedHistory"
              :key="item.vin"
              class="h-card"
              :class="{ 'h-cached': item.from_cache === 1 }"
            >
              <div class="h-card-top">
                <span class="h-vin">{{ item.vin }}</span>
                <span class="h-date">{{ formatDate(item.looked_up) }}</span>
              </div>

              <div class="h-card-body">
                <div class="h-field">
                  <span class="h-label">Key Code</span>
                  <span class="h-value">{{ item.key_code || '—' }}</span>
                </div>
                <div class="h-field">
                  <span class="h-label">PIN Code</span>
                  <span class="h-value h-pin">{{ item.pin_code || '—' }}</span>
                </div>

                <div class="h-actions">
                  <button type="button" class="h-btn" @click="copyHistoryItem(item)">
                    {{ copiedVin === item.vin ? 'Copied' : 'Copy' }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <nav v-if="historyTotalPages > 1" class="h-pager" aria-label="History pages">
            <button
              type="button"
              class="h-page h-page-nav"
              :disabled="historyPage === 1"
              @click="goToHistoryPage(historyPage - 1)"
            >
              ‹ Prev
            </button>

            <template v-for="(p, i) in historyPageButtons" :key="`${p}-${i}`">
              <span v-if="p === '…'" class="h-page-gap">…</span>
              <button
                v-else
                type="button"
                class="h-page"
                :class="{ 'h-page-active': p === historyPage }"
                :aria-current="p === historyPage ? 'page' : undefined"
                @click="goToHistoryPage(p)"
              >
                {{ p }}
              </button>
            </template>

            <button
              type="button"
              class="h-page h-page-nav"
              :disabled="historyPage === historyTotalPages"
              @click="goToHistoryPage(historyPage + 1)"
            >
              Next ›
            </button>
          </nav>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.pill-input {
  height: 52px;
  background: #2a2a2a;
  border: 1.5px solid #3a3a3a;
  color: #eaeaea;
  border-radius: 12px;
  outline: none;
  text-align: center;
  font-size: 18px;
  line-height: 1;
  padding: 0 16px;
  margin: 14px auto;
  display: block;
}
.pill-input::placeholder { color: #a6a6a6; }
.pill-input:focus { border-color: #8a8a8a; }

.success-border {
  border-color: #39a181 !important;
  box-shadow: 0 0 0 2px rgba(57,161,129,0.25);
}

/* Applied only when the VIN came from our own pin_codes table AND the
   server marked this account with show_cached_indicator. */
.green-text {
  color: #00ff8a !important;
  border-color: #00ff8a !important;
  box-shadow: 0 0 0 2px rgba(0,255,138,0.25) !important;
}

.vin-width      { width: 680px; max-width: 92vw; }
.username-width { width: 420px; max-width: 86vw; }
.key-width      { width: 320px; max-width: 82vw; }
.pin-width      { width: 360px; max-width: 84vw; }

.pin-accent { border-color: #5fb99c !important; }

.get-button {
  width: 180px;
  height: 52px;
  background: #5fb99c;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-size: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.get-button:disabled { opacity: .7; cursor: not-allowed; }

.copy-button {
  height: 52px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1.5px solid #5fb99c;
  background: #1e1e1e;
  color: #dff7ef;
  font-weight: 600;
  letter-spacing: .3px;
}

.logout-button {
  height: 52px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1.5px solid #555;
  background: transparent;
  color: #aaa;
  font-weight: 600;
  transition: 0.2s;
}
.logout-button:hover { color: #fff; border-color: #fff; }

/* ---------- Pagination ---------- */
.h-pager {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; flex-wrap: wrap; margin-top: 18px;
}
.h-page {
  min-width: 38px; height: 38px; padding: 0 10px; border-radius: 8px;
  border: 1.5px solid #3a3a3a; background: #151515; color: #cfcfcf;
  font-weight: 700; font-size: 14px; transition: .2s;
}
.h-page:hover:not(:disabled) { border-color: #8a8a8a; color: #fff; }
.h-page:disabled { opacity: .4; cursor: not-allowed; }
.h-page-active,
.h-page-active:hover:not(:disabled) { background: #5fb99c; border-color: #5fb99c; color: #fff; }
.h-page-gap { color: #7a7a7a; padding: 0 4px; }

/* ---------- Tabs ---------- */
.tabs {
  display: flex; gap: 6px;
  width: 420px; max-width: 92vw; margin: 0 auto 10px;
  padding: 5px; border-radius: 12px;
  background: #151515; border: 1.5px solid #3a3a3a;
}
.tab {
  flex: 1; height: 44px; border-radius: 10px;
  background: transparent; color: #9a9a9a;
  font-weight: 700; font-size: 15px; letter-spacing: .3px;
  transition: background .2s, color .2s;
}
.tab:hover { color: #ffffff; }
.tab-active { background: #5fb99c; color: #ffffff; }

/* ---------- History ---------- */
.history-panel { width: 680px; max-width: 92vw; margin: 22px auto 40px; }
.history-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.history-title { color: #f2f2f2; font-weight: 700; font-size: 18px; }
.history-count { color: #7a7a7a; font-weight: 500; font-size: 14px; margin-inline-start: 4px; }
.h-refresh {
  height: 34px; padding: 0 14px; border-radius: 8px;
  border: 1.5px solid #555; background: transparent; color: #aaa;
  font-weight: 600; font-size: 13px; transition: .2s;
}
.h-refresh:hover:not(:disabled) { color: #fff; border-color: #fff; }
.h-refresh:disabled { opacity: .6; cursor: not-allowed; }

.history-note { text-align: center; color: #8a8a8a; font-size: 15px; padding: 30px 0; }
.history-err  { color: #ff8a8a; }

.h-list { display: flex; flex-direction: column; gap: 12px; }
.h-card {
  background: #151515; border: 1.5px solid #3a3a3a; border-radius: 12px;
  padding: 14px 16px; transition: border-color .2s;
}
.h-card:hover { border-color: #8a8a8a; }
.h-card-top {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 10px; flex-wrap: wrap;
  padding-bottom: 10px; margin-bottom: 12px; border-bottom: 1px solid #262626;
}
.h-vin  { font-family: monospace; font-size: 17px; letter-spacing: .6px; color: #f2f2f2; }
.h-date { color: #7a7a7a; font-size: 13px; }
.h-cached .h-vin { color: #00ff8a; }

.h-card-body { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
.h-field { display: flex; flex-direction: column; gap: 3px; }
.h-label { color: #7a7a7a; font-size: 11px; text-transform: uppercase; letter-spacing: .8px; }
.h-value { color: #eaeaea; font-size: 18px; font-weight: 600; }
.h-pin   { color: #5fb99c; font-weight: 800; letter-spacing: 1px; }

.h-actions { margin-inline-start: auto; display: flex; gap: 8px; }
.h-btn {
  height: 36px; min-width: 74px; padding: 0 14px; border-radius: 8px;
  border: 1.5px solid #5fb99c; background: transparent; color: #dff7ef;
  font-weight: 700; font-size: 13px; transition: .2s;
}
.h-btn:hover { background: rgba(95,185,156,.15); }

.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .pill-input { height: 50px; font-size: 16px; margin: 12px auto; }
  .get-button { width: 160px; height: 50px; font-size: 16px; }
  .h-card-body { gap: 18px; }
  .h-page { min-width: 34px; height: 34px; }
}

.custom-message{ background-color: red; color: white; }
</style>