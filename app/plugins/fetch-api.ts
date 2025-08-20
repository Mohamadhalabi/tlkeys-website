// plugins/fetch-api.ts
export default defineNuxtPlugin(() => {
  const { currency } = useCurrency()
  const i18nCookie = useCookie<string>('i18n_redirected')
  const tokenCookie = useCookie<string | null>('auth_token')
  const config = useRuntimeConfig()
  const auth = useAuth()

  const baseURL = process.server
    ? (config.apiBaseInternal || config.public.API_BASE_URL)
    : config.public.API_BASE_URL

  const forwarded = process.server
    ? useRequestHeaders(['cookie', 'authorization', 'accept-language'])
    : {}

  function buildHeaders(options: any) {
    const lang =
      i18nCookie.value
      || (forwarded['accept-language'] as string | undefined)
      || 'en'

    const cur = currency.value || 'USD'

    const headers: Record<string, string> = {
      ...forwarded as Record<string, string>,
      ...(options.headers as Record<string, string>),
      Accept: 'application/json',
      'Accept-Language': lang,
      'api-key': config.public.API_KEY,
      'secret-key': config.public.SECRET_KEY,
    }

    const bearerFromForward =
      typeof forwarded['authorization'] === 'string'
        ? forwarded['authorization']
        : undefined

    const tokenFromAuth = (auth as any)?.token?.value as string | undefined
    const tokenFromCookie = tokenCookie.value || undefined

    const token =
      tokenFromAuth
        ?? tokenFromCookie
        ?? (bearerFromForward?.startsWith('Bearer ')
              ? bearerFromForward.slice(7)
              : undefined)

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json'
    }

    const q = (options.query || {}) as Record<string, any>
    if (!q.currency) q.currency = cur
    options.query = q

    options.headers = headers
  }

  const customApi = $fetch.create({
    baseURL,
    credentials: 'include',
    retry: 0,
    onRequest({ options }) {
      buildHeaders(options)
    }
  })

  const apiV2 = $fetch.create({
    baseURL: `${baseURL}/v2`,
    credentials: 'include',
    retry: 0,
    onRequest({ options }) {
      buildHeaders(options)
    }
  })

  return { provide: { customApi, apiV2 } }
})