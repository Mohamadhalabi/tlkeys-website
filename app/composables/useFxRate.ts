// app/composables/useFxRate.ts
//
// Single source of truth for "how do I turn a USD amount into the currency the
// user is looking at". Prices from the API are already converted; discount_value
// is not — this is what closes that gap.

import { computed, unref } from 'vue'
import { useState } from '#imports'
import { useCurrency } from '~/composables/useCurrency'

export function useFxRate() {
  const rates = useState<Record<string, number>>('fx-rates', () => ({ USD: 1 }))
  const { currency } = useCurrency() as any

  /** Multiplier for any currency code. Unknown codes fall back to 1. */
  const rateFor = (code?: string | null) => {
    const key = String(code || '').toUpperCase()
    const r = Number(rates.value?.[key] ?? 1)
    return Number.isFinite(r) && r > 0 ? r : 1
  }

  /** USD -> the currency currently selected in the switcher. */
  const fxRate = computed(() => rateFor(unref(currency) || 'USD'))

  /** USD -> EUR, for the manually-entered euro_price field. */
  const euroRate = computed(() => rateFor('EUR'))

  /** The code being displayed, for Intl formatting and schema.org. */
  const currencyCode = computed(() => String(unref(currency) || 'USD').toUpperCase())

  return { rates, rateFor, fxRate, euroRate, currencyCode }
}