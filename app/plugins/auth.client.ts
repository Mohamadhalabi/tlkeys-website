// plugins/auth.client.ts
export default defineNuxtPlugin((nuxtApp) => {
  const auth = useAuth()
  auth.hydrate()

  // If you built $customApi on top of $fetch, this hook sets the header.
  // If you have your own wrapper, move this logic into it.
  nuxtApp.hook('app:beforeMount', () => {
    // nothing else needed; just make sure your $customApi reads auth.token
  })

  // Example: if $customApi is a tiny wrapper around $fetch
  // @ts-ignore
  const orig = nuxtApp.$customApi
  if (typeof orig === 'function') {
    // @ts-ignore
    nuxtApp.$customApi = (url: string, opts: any = {}) => {
      const headers = new Headers(opts.headers || {})
      const t = auth.token.value
      if (t && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${t}`)
      return orig(url, { ...opts, headers })
    }
  }
})
