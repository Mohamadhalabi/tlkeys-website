// app/plugins/fx-rates.ts
//
// Loads the currency table once (server-side, before render) so every component
// can read a rate synchronously without triggering its own request.
//
// Response shape from your CurrencyController:
//   { base: "USD", rates: { USD: 1, AED: 3.6725, EUR: 0.88, ... }, updated_at: "..." }

import { defineNuxtPlugin, useState, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(async () => {
  const rates = useState<Record<string, number>>('fx-rates', () => ({ USD: 1 }))

  // Already populated on the server -> hydrated to the client, don't refetch.
  if (Object.keys(rates.value).length > 1) return

  const config = useRuntimeConfig()
  const base = String(config.public.API_BASE_URL || '').replace(/\/+$/, '')

  try {
    // Plain $fetch (not $customApi) so this plugin has no ordering dependency.
    const res: any = await $fetch(`${base}/rates`)
    const map = res?.rates ?? res?.data?.rates ?? {}

    const clean: Record<string, number> = { USD: 1 }
    for (const [code, val] of Object.entries(map)) {
      const n = Number(val)
      if (Number.isFinite(n) && n > 0) clean[String(code).toUpperCase()] = n
    }
    rates.value = clean
  } catch (e) {
    // Keep the USD-only fallback. Rates of 1 mean "no conversion", which is the
    // old behaviour — wrong for fixed discounts, but never a crash.
    console.warn('[fx-rates] failed to load currency rates', e)
  }
})