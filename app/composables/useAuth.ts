// composables/useAuth.ts
import { computed } from 'vue'
import { useNuxtApp, useState, useRouter } from '#imports'

type User = Record<string, any> | null

// State
const _token = () => useState<string | null>('auth:token', () => null)
const _user  = () => useState<User>('auth:user', () => null)
const _busy  = () => useState<boolean>('auth:busy', () => false)

// Helper: Save to LocalStorage & Cookie
function saveToStorage(token: string | null, user: User) {
  if (!process.client) return

  if (token) localStorage.setItem('auth_token', token)
  else       localStorage.removeItem('auth_token')

  if (user)  localStorage.setItem('auth_user', JSON.stringify(user))
  else       localStorage.removeItem('auth_user')

  // SETTING COOKIE TO 10 YEARS for "Never Expire" on frontend
  // 315360000 seconds = ~10 years
  document.cookie = token
    ? `auth_token=${token}; path=/; max-age=315360000; samesite=lax`
    : `auth_token=; path=/; max-age=0; samesite=lax`
}

export function useAuth() {
  const token = _token()
  const user  = _user()
  const busy  = _busy()
  const isAuthenticated = computed(() => Boolean(token.value))
  const router = useRouter() // Useful if you need to redirect on logout

  /** * Load token/user from localStorage and VERIFY with server 
   */
  async function hydrate() {
    if (!process.client) return
    
    // 1. Initial Load from Storage (Fast UI)
    try {
      const t = localStorage.getItem('auth_token')
      const u = localStorage.getItem('auth_user')
      
      if (t) {
        token.value = t
        user.value  = u ? JSON.parse(u) : null
      }
    } catch {
      // If parsing fails, clean up
      token.value = null
      user.value = null
      saveToStorage(null, null)
    }

    // 2. Background Verification (The Fix)
    // If we have a token, we MUST check if it's actually valid on the server.
    if (token.value) {
      try {
        await me() 
      } catch (e) {
        // If me() fails (e.g. 401), it will trigger logout logic internally
        // No extra action needed here as me() handles the cleanup
      }
    }
  }

  async function login(payload: { email: string; password: string }) {
    const { $apiV2 } = useNuxtApp()
    busy.value = true
    try {
      const res: any = await $apiV2('/auth/login', {
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
      // Try to tell server to invalidate token
      if (token.value) {
         await $apiV2('/auth/logout', { method: 'POST' })
      }
    } catch { /* ignore server errors on logout */ }
    
    // Always clear local state
    token.value = null
    user.value = null
    saveToStorage(null, null)
    
    if (process.client) window.dispatchEvent(new CustomEvent('auth:changed'))
    
    // Optional: Redirect to login
    // router.push('/auth/login-register') 
  }

  async function me() {
    const { $apiV2 } = useNuxtApp()
    try {
      const res: any = await $apiV2('/auth/me', { method: 'GET' })
      
      // Update local user data with fresh server data
      user.value = res?.user ?? null
      saveToStorage(token.value, user.value)
      
      return res?.user ?? null
    } catch (err: any) {
      // FIX: If 401 Unauthenticated, kill the session immediately
      const status = err?.response?.status || err?.statusCode
      if (status === 401 || err?.data?.message === 'Unauthenticated.') {
        token.value = null
        user.value = null
        saveToStorage(null, null)
        if (process.client) window.dispatchEvent(new CustomEvent('auth:changed'))
      }
      throw err
    }
  }

  return { token, user, isAuthenticated, busy, hydrate, login, register, logout, me }
}