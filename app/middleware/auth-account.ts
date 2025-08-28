export default defineNuxtRouteMiddleware((to) => {
  // Adjust to your auth scheme. Example: cookie named "auth_token"
  const token = useCookie<string | null>('auth_token').value
  if (!token) {
    return navigateTo(`/auth/login-register`)
  }
})
