// plugins/fetch-api.ts
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const { currency } = useCurrency()
  const auth = useAuth()

  const i18nCookie = useCookie<string>('i18n_redirected')
  const tokenCookie = useCookie<string | null>('auth_token')

  const baseURL = process.server
    ? (config.apiBaseInternal || config.public.API_BASE_URL)
    : config.public.API_BASE_URL

  const forwarded = process.server
    ? (useRequestHeaders(['cookie', 'authorization', 'accept-language']) as Record<string, string>)
    : {}

  const supported = ['en', 'ar', 'es', 'fr', 'ru', 'de'] as const
  type Supported = (typeof supported)[number]
  const DEFAULT_LOCALE: Supported = 'en'

  function normalize(raw?: string | null): Supported | null {
    if (!raw) return null
    try {
      const short = raw.split(',')[0]!.trim().toLowerCase().split('-')[0]!
      return (supported as readonly string[]).includes(short) ? (short as Supported) : null
    } catch { return null }
  }

  function fromPathSSR(): Supported | null {
    try {
      const { pathname } = useRequestURL()
      const m = pathname.match(/^\/([a-z]{2})(?:\/|$)/i)
      const code = m?.[1]?.toLowerCase()
      return (supported as readonly string[]).includes(code || '') ? (code as Supported) : null
    } catch { return null }
  }

  function fromPathClient(): Supported | null {
    try {
      const m = location.pathname.match(/^\/([a-z]{2})(?:\/|$)/i)
      const code = m?.[1]?.toLowerCase()
      return (supported as readonly string[]).includes(code || '') ? (code as Supported) : null
    } catch { return null }
  }

  function pickLocale(): Supported {
    return (
      (process.server ? fromPathSSR() : fromPathClient()) ||
      normalize(i18nCookie.value) ||
      normalize(forwarded['accept-language']) ||
      DEFAULT_LOCALE
    )
  }

  function build(options: any) {
    const lang = pickLocale()
    const cur  = currency.value || 'USD'

    // headers (lower-case to be absolutely sure they override)
    const headers: Record<string, string> = {
      ...forwarded,
      ...(options.headers as Record<string, string>),
      accept: 'application/json',
      'accept-language': lang,
      'X-Currency': cur,
      'api-key': config.public.API_KEY,
      'secret-key': config.public.SECRET_KEY,
    }

    // auth
    const fwdAuth = forwarded['authorization']
    const fromFwd =
      typeof fwdAuth === 'string' && fwdAuth.startsWith('Bearer ') ? fwdAuth.slice(7) : undefined
    const fromAuth = (auth as any)?.token?.value as string | undefined
    const fromCookie = tokenCookie.value || undefined
    const token = fromAuth ?? fromCookie ?? fromFwd
    if (token) headers['authorization'] = `Bearer ${token}`

    // body content-type if needed
    if (options.body && !(options.body instanceof FormData)) {
      headers['content-type'] = headers['content-type'] || 'application/json'
    }

    // query: ensure currency and **lang** are present
    const q = (options.query || {}) as Record<string, any>
    if (!q.currency) q.currency = cur
    if (!q.lang)     q.lang     = lang            // <— query param
    options.query = q

    options.headers = headers
  }

  const customApi = $fetch.create({
    baseURL,
    credentials: 'include',
    retry: 0,
    onRequest({ options }) { build(options) }
  })

  const apiV2 = $fetch.create({
    baseURL: `${baseURL}/v2`,
    credentials: 'include',
    retry: 0,
    onRequest({ options }) { build(options) }
  })

  return { provide: { customApi, apiV2 } }
})
