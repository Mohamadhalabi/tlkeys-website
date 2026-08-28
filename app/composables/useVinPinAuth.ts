import { computed } from 'vue'
import { useNuxtApp, useRuntimeConfig, useCookie } from '#imports'

/**
 * API_KEY and SECRET_KEY come from runtimeConfig.public, which Nuxt
 * compiles into the client bundle. They are visible to anyone who opens
 * devtools — they identify the app, they are not per-user secrets.
 *
 * The per-user credential is the bearer token issued by /vin-to-pin/login,
 * which expires in 12h and is never a permanent secret sitting in JS.
 */
export function useVinPinAuth(scope: 'vin' | 'part' = 'vin') {
  const { $customApi } = useNuxtApp()
  const { public: { API_BASE_URL } } = useRuntimeConfig()

  const tokenCookie = useCookie<string | null>(`vp_token_${scope}`, {
    default: () => null,
    maxAge: 12 * 3600,
    sameSite: 'strict',
    secure: true,
    path: '/',
  })

  const nameCookie = useCookie<string | null>(`vp_user_${scope}`, {
    default: () => null,
    maxAge: 12 * 3600,
    sameSite: 'strict',
    path: '/',
  })

  const isLoggedIn = computed(() => !!tokenCookie.value)

  function baseHeaders(locale = 'en') {
    return {
      'Accept-Language': locale,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  function authHeaders(locale = 'en') {
    return { ...baseHeaders(locale), Authorization: `Bearer ${tokenCookie.value}` }
  }

  async function login(username: string, password: string, locale = 'en') {
    const res: any = await $customApi(`/vin-to-pin/login`, {
      method: 'POST',
      headers: baseHeaders(locale),
      body: { username, password, scope },
    })

    const data = (res?.data && typeof res.data === 'object') ? res.data : res

    if (!data?.token) throw new Error(data?.error || 'Login failed')

    tokenCookie.value = data.token
    nameCookie.value = data.username

    return data
  }

  function logout() {
    if (tokenCookie.value) {
      // Fire-and-forget: the local cookie is cleared either way, so a
      // failed network call cannot leave the user stuck logged in.
      $customApi(`/vin-to-pin/logout`, {
        method: 'POST',
        headers: authHeaders(),
      }).catch(() => {})
    }

    tokenCookie.value = null
    nameCookie.value = null
  }

  return { isLoggedIn, tokenCookie, nameCookie, login, logout, baseHeaders, authHeaders, API_BASE_URL, $customApi }
}