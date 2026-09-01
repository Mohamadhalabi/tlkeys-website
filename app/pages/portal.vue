<script setup lang="ts">
/**
 * Service hub — app/pages/portal.vue
 *
 * One sign-in for every tool.
 *
 * TWO TOKENS, ONE PASSWORD
 *
 * The VIN/PIN tools authenticate against vin_to_pin_users (scope 'vin');
 * the part-number lookup authenticates against part_number_users
 * (scope 'part'). Separate tables, separate accounts — the server enforces
 * that a 'part' token cannot unlock a VIN endpoint, which is correct.
 *
 * So this page logs in TWICE with the same credentials and keeps both
 * tokens. That only works because the password hashes are kept in sync
 * between the two tables for matching usernames; see the migration note in
 * SSO-SETUP. Where a customer exists in only one table, the other login
 * simply fails and that tool asks for its own password — no error shown,
 * because for that customer nothing is wrong.
 *
 * Both cookies are scoped to .tlkeys.com so every subdomain can read them.
 * The username is never taken from a cookie: each tool resolves it from the
 * token via /vin-to-pin/me, so a forged cookie is worthless.
 */

definePageMeta({ layout: false })

const { $customApi } = useNuxtApp()
const { public: { API_KEY, SECRET_KEY } } = useRuntimeConfig()
const { locale } = (useI18n?.() as any) || { locale: ref('en') }

/* ------------------------------------------------------------------ state */

const usernameInput = ref('')
const passwordInput = ref('')
const isLoading     = ref(false)
const errorMessage  = ref<string | null>(null)

/**
 * On localhost the domain attribute must be dropped: a browser rejects a
 * cookie scoped to .tlkeys.com when the page is served from an IP, so it
 * would silently vanish and nothing would appear to work. Same-origin pages
 * still share it in dev, which is enough to test the Nuxt tools locally.
 */
const cookieOpts = {
  maxAge: 12 * 3600,
  sameSite: 'strict' as const,
  secure: !import.meta.dev,
  path: '/',
  domain: import.meta.dev ? undefined : '.tlkeys.com',
}

const tokenVin  = useCookie<string | null>('vp_token_vin',  { default: () => null, ...cookieOpts })
const tokenPart = useCookie<string | null>('vp_token_part', { default: () => null, ...cookieOpts })
const userVin   = useCookie<string | null>('vp_user_vin',   { default: () => null, ...cookieOpts })

// Signed in if EITHER token exists: a customer may hold only one of the two.
const isLoggedIn = computed(() => !!tokenVin.value || !!tokenPart.value)

/**
 * Per-service availability, resolved server-side from the account row.
 *
 * The portal holds a token, not the customer's balances, so it has to ask.
 * Doing the check here rather than in each tool means a customer who has
 * run out of Toyota credits sees a greyed tile saying so, instead of
 * clicking through and meeting an error that reads like a fault.
 *
 * used_this_month is optional on purpose. Only the tools whose request rows
 * live in this database (the two Kia/Hyundai PIN lookups and the part-number
 * lookup) can report it. Mazda, Toyota and Lonsdor run on their own
 * subdomains against their own tables, so the field is absent for them and
 * the tile shows no usage line — rather than a zero that isn't true.
 */
type ServiceState = {
  available: boolean
  reason: string | null
  message: string
  mode: 'token' | 'subscription'
  credits: number | null
  used_this_month?: number | null
}

const entitlements = ref<Record<string, ServiceState>>({})
const loadingState = ref(false)

async function loadEntitlements() {
  if (!tokenVin.value) return

  loadingState.value = true
  try {
    const res: any = await $customApi('/vin-to-pin/me', {
      method: 'POST',
      headers: { ...baseHeaders(), 'X-VinPin-Token': tokenVin.value },
      body: {},
    })
    const data = (res?.data && typeof res.data === 'object') ? res.data : res
    entitlements.value = data?.services || {}
  } catch (e) {
    // If this fails the tiles stay enabled rather than locking a paying
    // customer out because one request timed out. The tools enforce their
    // own limits regardless, so the worst case is the old behaviour.
    entitlements.value = {}
  } finally {
    loadingState.value = false
  }
}

/** Unknown key means "no information", which must not mean "blocked". */
function stateFor(key: string): ServiceState | null {
  return entitlements.value[key] ?? null
}

function isBlocked(key: string): boolean {
  const st = stateFor(key)
  return st ? !st.available : false
}

/**
 * This month's request count for a service, or null when the service does
 * not report one. Absent must render as nothing at all, not as zero.
 */
function usedFor(key: string): number | null {
  const n = stateFor(key)?.used_this_month
  return typeof n === 'number' ? n : null
}

onMounted(() => {
  if (isLoggedIn.value) loadEntitlements()
})

/* ------------------------------------------------------------------ tiles */

/**
 * Logos live in /public/images/services/ — self-hosted, because the PHP
 * tools run img-src 'self' and a remote logo would be blocked there.
 *
 * A missing file is not an error: onerror hides the image and the
 * initial-letter badge shows instead, so a forgotten upload degrades
 * quietly rather than leaving a broken-image icon on a customer's screen.
 */
const services = [
  {
    key: 'kia_new',
    title: 'Kia & Hyundai — 2017 and newer',
    blurb: 'PIN by VIN for the current generation immobiliser.',
    href: '/6b750ddca9d27708692942d7d85ee5a16b3fc2e6',
    logo: '/images/services/pin-code-2017-plus.webp',
  },
  {
    key: 'kia_old',
    title: 'Kia & Hyundai — before 2017',
    blurb: 'PIN by VIN for the earlier immobiliser.',
    href: '/435d7eb240c0e460cbb0281d1956b68c0ca99c33',
    logo: '/images/services/up-to-2016.webp',
  },
  {
    key: 'part_number',
    title: 'Kia & Hyundai part number',
    blurb: 'Look up the remote or key part number from a VIN.',
    href: '/3e00ce51bde3addf1fa11b7',
    logo: '/images/services/remote-partnumber.webp',
  },
  {
    key: 'mazda',
    title: 'Mazda immobiliser codes',
    blurb: 'Submit outcodes and have the reply emailed back.',
    href: 'https://mazdacode.tlkeys.com/',
    logo: '/images/services/mazda-outcode.webp',
  },
  {
    key: 'toyota',
    title: 'Toyota passcode',
    blurb: 'Reads the passcode straight from the Toyota portal.',
    href: 'https://tools.tlkeys.com/',
    logo: '/images/services/toyota-passcode.webp',
  },
  {
    key: 'lonsdor',
    title: 'Lonsdor outcode calculator',
    blurb: 'Rolling code to outcode for Lonsdor devices.',
    href: 'https://www.yaris.tlkeys.com/',
    logo: '/images/services/toyota-yaris-pin-code.webp',
  },
]

function hideBrokenLogo(ev: Event) {
  const el = ev.target as HTMLImageElement
  el.style.display = 'none'
  el.parentElement?.classList.add('tile__mark--fallback')
}

/* ----------------------------------------------------------------- actions */

function baseHeaders() {
  return {
    'Accept-Language': String(locale?.value || 'en'),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'secret-key': SECRET_KEY,
    'api-key': API_KEY,
  }
}

/** One login attempt for one scope. Returns the token, or null. */
async function login(scope: 'vin' | 'part'): Promise<{ token: string; username: string } | null> {
  try {
    const res: any = await $customApi('/vin-to-pin/login', {
      method: 'POST',
      headers: baseHeaders(),
      body: {
        username: usernameInput.value,
        password: passwordInput.value,
        scope,
      },
    })

    const data = (res?.data && typeof res.data === 'object') ? res.data : res
    if (!data?.token) return null

    return { token: data.token, username: data.username || usernameInput.value }
  } catch (e) {
    // A failure here usually means the customer has no account in that
    // table, which is normal. The caller decides whether it matters.
    return null
  }
}

async function handleLogin() {
  if (!usernameInput.value || !passwordInput.value) return

  isLoading.value = true
  errorMessage.value = null

  // Both scopes, same credentials, in parallel. Neither is required —
  // a customer with only a part-number subscription is still signed in.
  const [vin, part] = await Promise.all([login('vin'), login('part')])

  if (!vin && !part) {
    errorMessage.value = 'Username or password is incorrect.'
    isLoading.value = false
    return
  }

  if (vin) {
    tokenVin.value = vin.token
    userVin.value  = vin.username
  }
  if (part) {
    tokenPart.value = part.token
    if (!userVin.value) userVin.value = part.username
  }

  // Never keep the password around once it has been exchanged.
  passwordInput.value = ''
  isLoading.value = false

  await loadEntitlements()
}

function handleLogout() {
  // Fire and forget on both: the cookies clear either way, so a network
  // failure cannot leave someone stuck in a state they cannot exit.
  for (const t of [tokenVin.value, tokenPart.value]) {
    if (!t) continue
    $customApi('/vin-to-pin/logout', {
      method: 'POST',
      headers: { ...baseHeaders(), 'X-VinPin-Token': t },
    }).catch(() => {})
  }

  tokenVin.value = null
  tokenPart.value = null
  userVin.value = null
  usernameInput.value = ''
  passwordInput.value = ''
  entitlements.value = {}
}

/*
 * Keep this page out of search results. It is a customer tool, not
 * marketing — indexing it would put a login form for paid services into
 * Google, and every tool it links to is already noindex.
 */
useHead({
  title: 'Service Portal — Techno Lock Keys',
  meta: [
    { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet' },
    { name: 'googlebot', content: 'noindex, nofollow' },
  ],
})
</script>

<template>
  <div class="hub">
    <!-- ============================ SIGNED OUT ============================ -->
    <div v-if="!isLoggedIn" class="card card--narrow">
      <h1 class="title">Service Portal</h1>
      <p class="sub">Sign in once to reach every tool.</p>

      <p v-if="errorMessage" class="alert alert--error">{{ errorMessage }}</p>

      <form @submit.prevent="handleLogin" autocomplete="on">
        <label class="label" for="hub-user">Username</label>
        <input
          id="hub-user"
          v-model="usernameInput"
          type="text"
          class="input"
          maxlength="190"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          required
        >

        <label class="label" for="hub-pass">Password</label>
        <input
          id="hub-pass"
          v-model="passwordInput"
          type="password"
          class="input"
          maxlength="255"
          autocomplete="current-password"
          required
        >

        <button type="submit" class="btn" :disabled="isLoading">
          {{ isLoading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="foot">
        Use the same username and password as your VIN&nbsp;/&nbsp;PIN account.<br>
        Contact the administrator if you cannot sign in.
      </p>
    </div>

    <!-- ============================= SIGNED IN ============================ -->
    <div v-else class="card card--wide">
      <div class="bar">
        <div>
          <h1 class="title title--left">Service Portal</h1>
          <p class="sub sub--left">
            Signed in as <strong>{{ userVin }}</strong>
          </p>
        </div>
        <button type="button" class="btn btn--ghost" @click="handleLogout">
          Sign out
        </button>
      </div>

      <div class="grid">
        <component
          v-for="s in services"
          :is="isBlocked(s.key) ? 'div' : 'a'"
          :key="s.key"
          :href="isBlocked(s.key) ? undefined : s.href"
          class="tile"
          :class="{ 'tile--blocked': isBlocked(s.key) }"
          :aria-disabled="isBlocked(s.key) ? 'true' : undefined"
        >
          <span class="tile__mark" :data-initial="s.title.charAt(0)">
            <img :src="s.logo" :alt="s.title" class="tile__logo" @error="hideBrokenLogo">
          </span>
          <span class="tile__title">{{ s.title }}</span>
          <span class="tile__blurb">{{ s.blurb }}</span>

          <!--
            Shown on blocked tiles too: "No tokens left / Used this month: 150"
            explains the lock, where a bare "No tokens left" reads like a fault.
          -->
          <span v-if="usedFor(s.key) !== null" class="tile__usage">
            Used this month: <strong>{{ usedFor(s.key) }}</strong>
          </span>

          <!-- Blocked tiles say why, rather than looking broken. -->
          <span v-if="isBlocked(s.key)" class="tile__locked">
            {{ stateFor(s.key)?.message || 'Not available' }}
          </span>
          <span v-else class="tile__go">
            Open →
            <em v-if="stateFor(s.key)?.mode === 'token'" class="tile__credits">
              {{ stateFor(s.key)?.message }}
            </em>
          </span>
        </component>
      </div>

      <p class="foot">
        Every tool opens already signed in. If one says you have no access,
        your account is not subscribed to that service — contact the
        administrator.
      </p>
    </div>
  </div>
</template>

<style scoped>
.hub {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f4f5f7;
  color: #1f2329;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.card {
  width: 100%;
  background: #fff;
  border: 1px solid #e3e6ea;
  border-radius: 14px;
  padding: 36px 32px;
  box-shadow: 0 4px 20px rgba(16, 24, 40, .07);
}
.card--narrow { max-width: 390px; }
.card--wide   { max-width: 980px; }

.title { font-size: 22px; font-weight: 700; margin: 0 0 6px; text-align: center; color: #111827; }
.title--left { text-align: left; }
.sub { font-size: 14px; color: #6b7280; margin: 0 0 26px; text-align: center; }
.sub--left { text-align: left; margin-bottom: 0; }

.label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #374151; }
.input {
  width: 100%;
  padding: 12px 13px;
  margin-bottom: 18px;
  font-size: 15px;
  color: #1f2329;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-sizing: border-box;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.input:focus {
  outline: none;
  background: #fff;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, .12);
}

.btn {
  width: 100%;
  padding: 13px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s;
}
.btn:hover:not(:disabled) { background: #1d4ed8; }
.btn:disabled { opacity: .6; cursor: default; }
.btn--ghost {
  width: auto;
  padding: 9px 18px;
  font-size: 13px;
  color: #374151;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
}
.btn--ghost:hover { background: #e5e7eb; }

.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 22px;
  margin-bottom: 26px;
  border-bottom: 1px solid #e5e7eb;
}

/*
 * Two columns is the BASE, widened on larger screens rather than narrowed on
 * small ones. Written the other way round (auto-fit + a max-width override)
 * a single mistake in the media query silently drops the phone back to one
 * column, which is exactly what happened before.
 *
 * minmax(0, 1fr) rather than 1fr: grid items default to min-width:auto, so
 * the longest title would otherwise force its column past half the row and
 * collapse the layout back to a single column.
 */
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

@media (min-width: 641px) {
  .grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
  }
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 20px 18px 22px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: border-color .15s, transform .15s, box-shadow .15s;
}
.tile:hover {
  border-color: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 24, 40, .08);
}

/* Logo plate: wide, white and centred, so the wordmark inside each logo
   stays legible rather than being shrunk into an icon. Full tile width
   means a landscape logo like Lonsdor's has room to breathe, and a square
   one like Toyota's still centres cleanly. */
.tile__mark {
  width: 100%;
  height: 150px;
  margin-bottom: 16px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #eceef1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 18px;
  flex-shrink: 0;
}
.tile__logo {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}
/* Shown only when the logo file is missing. */
.tile__mark--fallback::after {
  content: attr(data-initial);
  font-size: 34px;
  font-weight: 800;
  color: #2563eb;
}

.tile__title { font-size: 15px; font-weight: 700; line-height: 1.35; color: #111827; }
.tile__blurb { font-size: 13px; color: #6b7280; line-height: 1.45; }
.tile__go    { font-size: 13px; font-weight: 600; color: #2563eb; margin-top: 8px; }
.tile__credits {
  display: block;
  margin-top: 3px;
  font-style: normal;
  font-weight: 500;
  font-size: 12px;
  color: #9ca3af;
}

/* This month's request count. Only rendered for the tools whose rows live
   in this database; the rest show nothing here. */
.tile__usage {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
.tile__usage strong { color: #374151; font-weight: 700; }

/* Blocked: visibly out of reach, and it says why. Kept legible rather than
   faded to the point of looking like a rendering fault. */
.tile--blocked {
  background: #f7f8fa;
  border-color: #e5e7eb;
  cursor: not-allowed;
  pointer-events: none;
}
.tile--blocked .tile__mark  { background: #f1f2f4; }
.tile--blocked .tile__logo  { filter: grayscale(100%); opacity: .45; }
.tile--blocked .tile__title { color: #9ca3af; }
.tile--blocked .tile__blurb { color: #b6bcc5; }
.tile--blocked .tile__usage { color: #b6bcc5; }
.tile--blocked .tile__usage strong { color: #9ca3af; }
.tile--blocked:hover {
  transform: none;
  box-shadow: none;
  border-color: #e5e7eb;
}
.tile__locked {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #b45309;
}

.alert {
  font-size: 13px;
  line-height: 1.5;
  padding: 11px 13px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid transparent;
}
.alert--error { background: #fef2f2; color: #991b1b; border-color: #fecaca; }

.foot {
  margin-top: 26px;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  line-height: 1.7;
}

/* ------------------------------------------------------------------ phone */
/*
 * Sizing only — the two-column layout above no longer depends on this block
 * loading. Without the trim, a 390px viewport leaves each tile around 130px
 * wide and the 150px logo plate dominates the card.
 */
@media (max-width: 640px) {
  .hub { padding: 14px; }

  .card { padding: 22px 14px; border-radius: 12px; }

  .tile { padding: 12px 8px 14px; gap: 4px; }

  /* Landscape logos (Lonsdor) still need width more than height. */
  .tile__mark {
    height: 84px;
    margin-bottom: 10px;
    padding: 8px 10px;
  }

  .tile__title   { font-size: 13px; line-height: 1.3; }
  .tile__blurb   { font-size: 11px; line-height: 1.4; }
  .tile__usage   { font-size: 11px; margin-top: 4px; }
  .tile__go      { font-size: 12px; margin-top: 6px; }
  .tile__locked  { font-size: 11px; margin-top: 6px; }
  .tile__credits { font-size: 11px; }

  /* Hover lift is meaningless on touch and leaves tiles stuck in the
     hovered state after a tap. */
  .tile:hover { transform: none; box-shadow: none; }

  .bar { padding-bottom: 16px; margin-bottom: 18px; }
  .title { font-size: 19px; }
}
</style>