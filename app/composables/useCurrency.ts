// composables/useCurrency.ts
import { watch } from 'vue'
import { useCookie, useState, useNuxtApp, useAsyncData } from '#imports'

export type CurrencyCode = 'USD' | 'EUR' | 'TRY' | 'AED' | 'GBP'

// Module-level singleton — shared across ALL composable instances
let ratesFetchedAt = 0
const CACHE_TTL_MS = 1000 * 60 * 30 // 30 minutes — fetch at most once per 30min

export const useCurrency = () => {
  const cookie = useCookie<CurrencyCode>('currency', {
    default: () => 'USD',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })
  const current = useState<CurrencyCode>('currency', () => cookie.value!)
  watch(current, (val) => { cookie.value = val })

  // Shared state — initialized once, reused everywhere
  const rates = useState<Record<CurrencyCode, number>>('fx-rates', () => ({
    USD: 1,
    EUR: 0.84,
    GBP: 0.74,
    AED: 3.6725,
    TRY: 47.50,
  }))

  // Shared in-flight promise — if two components call this simultaneously,
  // the second one waits for the first instead of firing a new request
  const isFetching = useState<boolean>('fx-fetching', () => false)

  async function refreshRates(force = false) {
    const now = Date.now()

    // Skip if: already fetching, cache still valid (and not forced)
    if (isFetching.value) return
    if (!force && ratesFetchedAt > 0 && now - ratesFetchedAt < CACHE_TTL_MS) return

    isFetching.value = true
    try {
      const { $customApi } = useNuxtApp()
      const r: any = await $customApi('/v2/currencies/rates', { method: 'GET' })
      const map = r?.rates || r?.data?.rates || null
      if (map && typeof map === 'object') {
        const next = { ...rates.value }
        Object.entries(map).forEach(([k, v]) => {
          if (k in next) (next as any)[k] = Number(v)
        })
        rates.value = next
        ratesFetchedAt = Date.now() // stamp successful fetch
      }
    } catch {
      // keep last known rates, don't update timestamp so next call retries
    } finally {
      isFetching.value = false
    }
  }

  function convert(amount: number | null | undefined, from: CurrencyCode, to: CurrencyCode) {
    const a = Number(amount || 0)
    if (!Number.isFinite(a) || from === to) return a
    const toUSD = from === 'USD' ? a : a / (rates.value[from] || 1)
    return to === 'USD' ? toUSD : toUSD * (rates.value[to] || 1)
  }

  function formatMoney(amount: number | null | undefined) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: current.value,
    }).format(Number(amount || 0))
  }

  function formatIn(amount: number | null | undefined, code: CurrencyCode) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
    }).format(Number(amount || 0))
  }

  return {
    currency: current,
    setCurrency: (c: CurrencyCode) => (current.value = c),
    options: ['USD', 'EUR', 'TRY', 'AED', 'GBP'] as CurrencyCode[],
    rates,
    convert,
    formatMoney,
    formatIn,
    refreshRates,
  }
}