// composables/useCurrency.ts
import { watch, onMounted } from 'vue'
import { useCookie, useState, useNuxtApp } from '#imports'

export type CurrencyCode = 'USD' | 'EUR' | 'TRY' | 'AED' | 'GBP'

export const useCurrency = () => {
  // cookie + reactive selected currency
  const cookie = useCookie<CurrencyCode>('currency', {
    default: () => 'USD',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })
  const current = useState<CurrencyCode>('currency', () => cookie.value!)
  watch(current, (val) => { cookie.value = val })

  // FX table (1 USD = value)
  const rates = useState<Record<CurrencyCode, number>>('fx-rates', () => ({
    USD: 1,
    EUR: 0.93,
    GBP: 0.78,
    AED: 3.6725,
    TRY: 33,
  }))

  // ---- fetch rates from backend once and on demand
  let inflight: Promise<void> | null = null
  async function refreshRates(force = false) {
    if (inflight && !force) return inflight
    const { $customApi } = useNuxtApp()

    inflight = (async () => {
      try {
        // Expecting { base: "USD", rates: { USD:1, EUR:0.88, ... }, updated_at: "..." }
        const r: any = await $customApi('/v2/currencies/rates', { method: 'GET' })
        const map = r?.rates || r?.data?.rates || null
        if (map && typeof map === 'object') {
          const next = { ...rates.value }
          Object.entries(map).forEach(([k, v]) => {
            if (k in next) (next as any)[k] = Number(v)
          })
          rates.value = next
        }
      } catch {/* keep last known rates */}
      finally { inflight = null }
    })()

    return inflight
  }

  if (process.client) onMounted(() => { refreshRates().catch(() => {}) })

  /** Convert amount between two ISO codes using USD as base. */
  function convert(amount: number | null | undefined, from: CurrencyCode, to: CurrencyCode) {
    const a = Number(amount || 0)
    if (!Number.isFinite(a) || from === to) return a
    const toUSD = from === 'USD' ? a : a / (rates.value[from] || 1)
    return to === 'USD' ? toUSD : toUSD * (rates.value[to] || 1)
  }

  /** Format using the active currency. */
  function formatMoney(amount: number | null | undefined) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: current.value,
    }).format(Number(amount || 0))
  }

  /** Format explicitly in a certain currency. */
  function formatIn(amount: number | null | undefined, code: CurrencyCode) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
    }).format(Number(amount || 0))
  }

  return {
    currency: current,
    setCurrency: (c: CurrencyCode) => (current.value = c),
    options: ['USD','EUR','TRY','AED','GBP'] as CurrencyCode[],
    rates,
    convert,
    formatMoney,
    formatIn,
    refreshRates, // <-- export so you can force-refresh (e.g., from a settings page)
  }
}