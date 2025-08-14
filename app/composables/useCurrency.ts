// composables/useCurrency.ts
export type CurrencyCode = 'USD' | 'EUR' | 'TRY'

export const useCurrency = () => {
  // SSR-safe cookie (Nuxt handles req/res on server)
  const cookie = useCookie<CurrencyCode>('currency', {
    default: () => 'USD',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })

  // single SSR-shared state (per request on server)
  const current = useState<CurrencyCode>('currency', () => cookie.value!)

  // keep cookie <-> state in sync
  watch(current, (val) => { cookie.value = val })

  return {
    currency: current,
    setCurrency: (c: CurrencyCode) => (current.value = c),
    options: ['USD', 'EUR', 'TRY'] as CurrencyCode[],
  }
}
