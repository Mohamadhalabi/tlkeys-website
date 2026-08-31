<script setup lang="ts">
/**
 * Service hub — app/pages/portal.vue
 *
 * One sign-in for every VIN/PIN tool. The password is exchanged once for a
 * 12-hour token from /vin-to-pin/login; that token lives in vp_token_vin,
 * scoped to .tlkeys.com so every subdomain can read it. Clicking a tile
 * therefore lands the user straight in the tool, already signed in.
 *
 * All tiles are shown to everyone. Entitlement is checked by each tool when
 * the user arrives, which keeps the rule in one place per service instead of
 * duplicated here where it would drift.
 *
 * IMPORTANT: for this to work, vp_token_vin must carry domain: '.tlkeys.com'
 * in EVERY page that reads or writes it — the two Kia pages and
 * app/composables/useVinPinAuth.ts.
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
 * On localhost the domain attribute has to be dropped: a browser will not
 * accept a cookie scoped to .tlkeys.com when the page is served from an IP
 * or from localhost, so it would be silently discarded and nothing would
 * appear to work. Same-origin pages still share it in dev, which is enough
 * to test portal -> Kia locally.
 */
const cookieDomain = import.meta.dev ? undefined : '.tlkeys.com'

const cookieOpts = {
  maxAge: 12 * 3600,
  sameSite: 'strict' as const,
  secure: !import.meta.dev,
  path: '/',
  domain: cookieDomain,
}

const tokenCookie = useCookie<string | null>('vp_token_vin', {
  default: () => null,
  ...cookieOpts,
})

/** Display only. The tools re-resolve the account from the token itself. */
const userCookie = useCookie<string | null>('vp_user_vin', {
  default: () => null,
  ...cookieOpts,
})

const isLoggedIn = computed(() => !!tokenCookie.value)

/* ------------------------------------------------------------------ tiles */

/**
 * Logos are served from /public/images/services/ — self-hosted, because the
 * tools' own CSP is img-src 'self' and a remote logo would be blocked there.
 * Keep them square-ish and around 120px; the tile scales them down.
 *
 * If a file is missing the tile still renders: onerror hides the image and
 * the initial-letter badge shows instead, so a forgotten upload degrades
 * quietly rather than leaving a broken-image icon.
 */
const services = [
  {
    key: 'kia_new',
    title: 'Kia & Hyundai — 2017 and newer',
    blurb: 'PIN by VIN for the current generation immobiliser.',
    href: '/6b750ddca9d27708692942d7d85ee5a16b3fc2e6',
    logo: '',
    external: false,
  },
  {
    key: 'kia_old',
    title: 'Kia & Hyundai — before 2017',
    blurb: 'PIN by VIN for the earlier immobiliser.',
    href: '/435d7eb240c0e460cbb0281d1956b68c0ca99c33',
    logo: '',
    external: false,
  },
  {
    key: 'mazda',
    title: 'Mazda immobiliser codes',
    blurb: 'Submit outcodes and have the reply emailed back.',
    href: 'https://mazdacode.tlkeys.com/',
    logo: '',
    external: true,
  },
  {
    key: 'toyota',
    title: 'Toyota passcode',
    blurb: 'Reads the passcode straight from the Toyota portal.',
    href: 'https://tools.tlkeys.com/',
    logo: '',
    external: true,
  },
  {
    key: 'lonsdor',
    title: 'Lonsdor outcode calculator',
    blurb: 'Rolling code to outcode for Lonsdor devices.',
    href: 'https://www.yaris.tlkeys.com/',
    logo: '',
    external: true,
  },
]

/** Fall back to the initial-letter badge when a logo file is absent. */
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

async function handleLogin() {
  if (!usernameInput.value || !passwordInput.value) return

  isLoading.value = true
  errorMessage.value = null

  try {
    const res: any = await $customApi('/vin-to-pin/login', {
      method: 'POST',
      headers: baseHeaders(),
      body: {
        username: usernameInput.value,
        password: passwordInput.value,
        scope: 'vin',
      },
    })

    const data = (res?.data && typeof res.data === 'object') ? res.data : res
    if (!data?.token) throw new Error(data?.error || 'Login failed')

    tokenCookie.value = data.token
    userCookie.value  = data.username || usernameInput.value

    // Never keep the password around once it has been exchanged.
    passwordInput.value = ''
  } catch (e: any) {
    errorMessage.value =
      e?.data?.error || e?.response?.data?.error || e?.message || 'Sign in failed.'
    tokenCookie.value = null
    userCookie.value = null
  } finally {
    isLoading.value = false
  }
}

function handleLogout() {
  if (tokenCookie.value) {
    // Fire and forget: the cookie clears either way, so a network failure
    // cannot leave someone stuck in a signed-in state they cannot exit.
    $customApi('/vin-to-pin/logout', {
      method: 'POST',
      headers: { ...baseHeaders(), 'X-VinPin-Token': tokenCookie.value },
    }).catch(() => {})
  }
  tokenCookie.value = null
  userCookie.value = null
  usernameInput.value = ''
  passwordInput.value = ''
}

/*
 * Keep this page out of search results entirely. It is a customer tool, not
 * marketing: indexing it would put a login form for paid services into
 * Google, and the tools it links to are already noindex themselves.
 *
 * The header is the part that actually binds — a meta tag alone is ignored
 * by some crawlers when the page needs JavaScript to render.
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
            Signed in as <strong>{{ userCookie }}</strong>
          </p>
        </div>
        <button type="button" class="btn btn--ghost" @click="handleLogout">
          Sign out
        </button>
      </div>

      <div class="grid">
        <a
          v-for="s in services"
          :key="s.key"
          :href="s.href"
          :data-initial="s.title.charAt(0)"
          class="tile"
        >
          <!-- <span class="tile__mark" :data-initial="s.title.charAt(0)"> -->
            <!-- <img :src="s.logo" :alt="s.title" class="tile__logo" @error="hideBrokenLogo"> -->
          <!-- </span> -->
          <span class="tile__title">{{ s.title }}</span>
          <span class="tile__blurb">{{ s.blurb }}</span>
          <span class="tile__go">Open →</span>
        </a>
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
  background: #0f1115;
  color: #e8eaed;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.card {
  width: 100%;
  background: #171a21;
  border: 1px solid #262b35;
  border-radius: 14px;
  padding: 36px 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, .35);
}
.card--narrow { max-width: 390px; }
.card--wide   { max-width: 940px; }

.title { font-size: 22px; font-weight: 700; margin: 0 0 6px; text-align: center; }
.title--left { text-align: left; }
.sub { font-size: 14px; color: #9aa1ad; margin: 0 0 26px; text-align: center; }
.sub--left { text-align: left; margin-bottom: 0; }

.label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #c3c8d1; }
.input {
  width: 100%;
  padding: 12px 13px;
  margin-bottom: 18px;
  font-size: 15px;
  color: #e8eaed;
  background: #10131a;
  border: 1px solid #2c323d;
  border-radius: 8px;
  box-sizing: border-box;
  transition: border-color .15s, box-shadow .15s;
}
.input:focus {
  outline: none;
  border-color: #3ba776;
  box-shadow: 0 0 0 3px rgba(59, 167, 118, .18);
}

.btn {
  width: 100%;
  padding: 13px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .3px;
  color: #06120c;
  background: #3ba776;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s;
}
.btn:hover:not(:disabled) { background: #45c088; }
.btn:disabled { opacity: .6; cursor: default; }
.btn--ghost {
  width: auto;
  padding: 9px 18px;
  font-size: 13px;
  color: #e8eaed;
  background: #262b35;
}
.btn--ghost:hover { background: #313846; }

.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 22px;
  margin-bottom: 26px;
  border-bottom: 1px solid #262b35;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 14px;
}
.tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 22px 18px 20px;
  background: #10131a;
  border: 1px solid #262b35;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: border-color .15s, transform .15s, background .15s;
}
.tile:hover {
  border-color: #3ba776;
  background: #131822;
  transform: translateY(-2px);
}

/* Logo plate. Light background so dark manufacturer marks stay legible
   against the dark card. */
.tile__mark {
  width: 56px;
  height: 56px;
  margin-bottom: 12px;
  border-radius: 10px;
  background: #f5f6f8;
  border: 1px solid #262b35;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  flex-shrink: 0;
}
.tile__logo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
/* Shown only when the logo file is missing. */
.tile__mark--fallback::after {
  content: attr(data-initial);
  font-size: 24px;
  font-weight: 800;
  color: #3ba776;
}

.tile__title { font-size: 15px; font-weight: 700; line-height: 1.35; }
.tile__blurb { font-size: 13px; color: #9aa1ad; line-height: 1.45; }
.tile__go    { font-size: 13px; font-weight: 600; color: #3ba776; margin-top: 8px; }

.alert {
  font-size: 13px;
  line-height: 1.5;
  padding: 11px 13px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid transparent;
}
.alert--error { background: #2a1416; color: #ff9a9a; border-color: #4d1f24; }

.foot {
  margin-top: 26px;
  font-size: 12px;
  color: #6f7681;
  text-align: center;
  line-height: 1.7;
}
</style>