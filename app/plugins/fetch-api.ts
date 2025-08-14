// plugins/fetch-api.ts
export default defineNuxtPlugin(() => {
  const { currency } = useCurrency()
  const i18nCookie = useCookie<string>('i18n_redirected') // SSR-safe
  const config = useRuntimeConfig()

  // Pick a baseURL that works in each environment
  const baseURL = process.server
    ? (config.apiBaseInternal || config.public.API_BASE_URL)
    : config.public.API_BASE_URL

  // Forward key headers on SSR (so Laravel sees cookies + Accept-Language)
  const forwarded = process.server
    ? useRequestHeaders(['cookie', 'authorization', 'accept-language'])
    : {}

  const instance = $fetch.create({
    baseURL,
    credentials: 'include',  // send cookies
    retry: 0,

    onRequest({ options }) {
      // Prefer your app’s cookie locale; fall back to forwarded header or 'en'
      const lang =
        i18nCookie.value
        || (forwarded['accept-language'] as string | undefined)
        || 'en'

      const cur = currency.value || 'USD'

      // Build headers without forcing Content-Type for GETs
      const headers: Record<string, string> = {
        ...forwarded as Record<string, string>,       // SSR: cookie/auth/accept-language
        ...(options.headers as Record<string, string>),
        Accept: 'application/json',
        'Accept-Language': lang,
        'api-key': config.public.API_KEY,
        'secret-key': config.public.SECRET_KEY,
      }

      // Only set Content-Type when sending a non-FormData body
      if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json'
      }

      options.headers = headers

      // Ensure ?currency=... is present
      const q = (options.query || {}) as Record<string, any>
      if (!q.currency) q.currency = cur
      options.query = q
    }
  })

  return { provide: { customApi: instance } }
})
