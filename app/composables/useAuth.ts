// composables/useAuth.ts
import { computed } from 'vue'
import { useNuxtApp } from '#imports'

type User = Record<string, any> | null

// useState() persists values across pages and avoids hydration flicker
const _token = () => useState<string | null>('auth:token', () => null)
const _user  = () => useState<User>('auth:user', () => null)
const _busy  = () => useState<boolean>('auth:busy', () => false)

function saveToStorage(token: string | null, user: User) {
  if (!process.client) return

  if (token) localStorage.setItem('auth_token', token)
  else       localStorage.removeItem('auth_token')

  if (user)  localStorage.setItem('auth_user', JSON.stringify(user))
  else       localStorage.removeItem('auth_user')

  // (optional) cookie
  document.cookie = token
    ? `auth_token=${token}; path=/; max-age=2592000; samesite=lax`
    : `auth_token=; path=/; max-age=0; samesite=lax`
}

export function useAuth() {
  const token = _token()
  const user  = _user()
  const busy  = _busy()
  const isAuthenticated = computed(() => Boolean(token.value))

  /** Load token/user from localStorage (call once on app start) */
  function hydrate() {
    if (!process.client) return
    try {
      const t = localStorage.getItem('auth_token')
      const u = localStorage.getItem('auth_user')
      token.value = t
      user.value = u ? JSON.parse(u) : null
    } catch {
      token.value = null
      user.value = null
    }
  }

  async function login(payload: { email: string; password: string }) {
    const { $apiV2 } = useNuxtApp()
    busy.value = true
    try {
      const res = await $apiV2('/auth/login', {
        method: 'POST',
        body: payload
      })

      const t = res?.authorisation?.token || res?.token
      const u = res?.user || null

      token.value = t || null
      user.value = u
      saveToStorage(token.value, user.value)

      if (process.client) window.dispatchEvent(new CustomEvent('auth:changed'))

      return res
    } finally {
      busy.value = false
    }
  }

  async function register(payload: Record<string, any>) {
    const { $apiV2 } = useNuxtApp()
    busy.value = true
    try {
      return await $apiV2('/auth/register', {
        method: 'POST',
        body: payload
      })
    } finally {
      busy.value = false
    }
  }

  async function logout() {
    const { $apiV2 } = useNuxtApp()
    try {
      await $apiV2('/auth/logout', { method: 'POST' })
    } catch {}
    token.value = null
    user.value = null
    saveToStorage(null, null)
    if (process.client) window.dispatchEvent(new CustomEvent('auth:changed'))
  }

  async function me() {
    const { $apiV2 } = useNuxtApp()
    try {
      const res = await $apiV2('/auth/me', { method: 'GET' })
      user.value = res
      return res
    } catch {
      return null
    }
  }

  return { token, user, isAuthenticated, busy, hydrate, login, register, logout, me }
}