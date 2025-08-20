// composables/useCurrency.ts
import { watch } from 'vue'

export type CurrencyCode = 'USD' | 'EUR' | 'TRY'

export const useCurrency = () => {
  const cookie = useCookie<CurrencyCode>('currency', {
    default: () => 'USD',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })

  const current = useState<CurrencyCode>('currency', () => cookie.value!)
  watch(current, (val) => { cookie.value = val })

  /** Always uses the plain string code (no ref leaks). */
  function formatMoney(amount: number | null | undefined) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: current.value, // <- ALWAYS a string like 'USD'
    }).format(Number(amount || 0))
  }

  return {
    currency: current,                         // Ref<'USD'|'EUR'|'TRY'>
    setCurrency: (c: CurrencyCode) => (current.value = c),
    options: ['USD', 'EUR', 'TRY'] as CurrencyCode[],
    formatMoney,                               // <- use this everywhere
  }
}
