import { ref, onMounted } from 'vue'

/**
 * Asks the API what this visitor pays.
 *
 * The number is decided server-side from Cloudflare's country header, by the
 * same function that sets the amount on the PayPal order — so what is shown
 * and what is charged can never drift apart. Nothing here is security; it is
 * only the label.
 *
 * Goes through $customApi rather than $fetch: the backend rejects requests
 * without the api-key / secret-key headers the plugin attaches.
 *
 * On localhost there is no Cloudflare header, so the API returns the
 * rest-of-world rate. That is expected in dev, not a bug.
 */
export function useMazdaPrice() {
  const { public: pub } = useRuntimeConfig()
  const { $customApi } = useNuxtApp()

  // Shown until the real price lands. Matches the ROW rate, which is what
  // most visitors will end up paying anyway.
  const price = ref(35)
  const currency = ref('USD')
  const region = ref<'me' | 'row' | ''>('')
  const loading = ref(true)

  onMounted(async () => {
    try {
      const res: any = await $customApi(
        `${(pub as any).API_BASE_URL}/mazda-immobilizer/guest/price`,
        { timeout: 5000 },
      )
      price.value = Number(res.amount)
      currency.value = String(res.currency ?? 'USD')
      region.value = res.region ?? ''
    } catch (e) {
      // Keep the default. The server still charges correctly either way, and
      // the amount is shown again on the PayPal window before confirming.
      console.warn('[mazda] price lookup failed, showing default', e)
    } finally {
      loading.value = false
    }
  })

  return { price, currency, region, loading }
}