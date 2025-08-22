// composables/useCart.ts
import { ref, computed, onMounted } from 'vue'
import { useNuxtApp } from '#imports'
import { useAuth } from './useAuth'
import { useAlertStore } from '~/stores/alert'

let cartAuthListenerAdded = false
const SYNC_LOCK_KEY = 'cart-sync-lock'

type Id = number | string
type PriceTableRow = { min_qty: number; max_qty?: number | null; price: number; sale_price?: number | null }
type CartItem = {
  product_id: Id
  quantity: number
  title?: string
  image?: string
  sku?: string
  slug?: string
  price?: number | null
  regular_price?: number | null
  sale_price?: number | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | null
  table_price?: PriceTableRow[] | null
  priceSnapshot?: number | null
  /** NEW: available stock passed from caller (e.g., product.quantity) */
  stock?: number | null
}

function toNum(x: unknown): number | undefined {
  if (x == null) return undefined
  if (typeof x === 'number') return Number.isFinite(x) ? x : undefined
  if (typeof x === 'string') {
    const n = Number(x.replace(/[^0-9.\-]+/g, ''))
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

export function useCart() {
  const STORAGE_KEY = 'guest_cart'
  const syncing = ref(false)

  const { $customApi } = useNuxtApp()
  const auth = useAuth()
  const alerts = useAlertStore()

  const isAuthed = computed<boolean>(() => Boolean(auth.token.value))

  // --- Guest cart (localStorage) ---
  const guestItems = ref<CartItem[]>([])

  function loadGuest() {
    if (!process.client) return
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || []
      guestItems.value = Array.isArray(raw) ? raw : []
    } catch {
      guestItems.value = []
    }
  }
  function saveGuest() {
    if (!process.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guestItems.value))
  }

  function addToGuest(product_id: Id, quantity: number, meta?: Partial<CartItem>) {
    const id = String(product_id)
    const idx = guestItems.value.findIndex(i => String(i.product_id) === id)

    const normalized: Partial<CartItem> = {
      title: meta?.title,
      image: meta?.image,
      sku:   meta?.sku,
      slug:  meta?.slug,
      price: toNum(meta?.price) ?? (typeof meta?.price === 'number' ? meta?.price : null),
      regular_price: typeof meta?.regular_price === 'number' ? meta?.regular_price : (toNum(meta?.regular_price) ?? null),
      sale_price:    typeof meta?.sale_price    === 'number' ? meta?.sale_price    : (toNum(meta?.sale_price) ?? null),
      discount_type: (meta?.discount_type === 'percent' || meta?.discount_type === 'fixed') ? meta?.discount_type : null,
      discount_value: typeof meta?.discount_value === 'number' ? meta?.discount_value : (toNum(meta?.discount_value) ?? null),
      table_price: Array.isArray(meta?.table_price) ? meta?.table_price as PriceTableRow[] : (meta?.table_price ?? null),
      priceSnapshot: typeof meta?.priceSnapshot === 'number' ? meta?.priceSnapshot : (toNum(meta?.priceSnapshot) ?? null),
      // NEW: persist stock (if provided)
      stock: typeof meta?.stock === 'number' ? meta.stock : (toNum(meta?.stock) ?? null),
    }

    if (idx >= 0) {
      const prev = guestItems.value[idx]
      guestItems.value[idx] = {
        ...prev,
        quantity: Number(prev.quantity || 0) + Math.max(1, Number(quantity || 1)),
        ...normalized,
      }
    } else {
      guestItems.value.push({
        product_id,
        quantity: Math.max(1, Number(quantity || 1)),
        ...normalized,
      })
    }
    saveGuest()
  }

  function setQtyGuest(product_id: Id, quantity: number) {
    const id = String(product_id)
    const idx = guestItems.value.findIndex(i => String(i.product_id) === id)
    if (idx >= 0) {
      guestItems.value[idx] = { ...guestItems.value[idx], quantity: Math.max(1, Number(quantity || 1)) }
      saveGuest()
    }
  }
  function removeGuest(product_id: Id) {
    const id = String(product_id)
    guestItems.value = guestItems.value.filter(i => String(i.product_id) !== id)
    saveGuest()
  }
  function clearGuest() { guestItems.value = []; saveGuest() }

  // --- Server calls ---
  async function addToServer(product_id: Id, quantity: number) {
    return $customApi('/v2/cart/add', { method: 'POST', body: { product_id, quantity } })
  }
  async function changeQtyServer(product_id: Id, quantity: number) {
    return $customApi(`/v2/cart/set-quantity/${product_id}`, { method: 'POST', body: { quantity } })
  }
  async function removeServer(product_id: Id) {
    return $customApi(`/v2/cart/remove/${product_id}`, { method: 'POST' })
  }
  async function clearServer() {
    return $customApi('/v2/cart/clear', { method: 'POST' })
  }

  // --- Public API ---
  async function add(product_id: Id, quantity: number, meta?: Partial<CartItem>) {
    if (isAuthed.value) {
      await addToServer(product_id, quantity)
    } else {
      addToGuest(product_id, quantity, meta)
    }

    // Derive stock from meta to decide whether to append the red line
    const stock =
      typeof meta?.stock === 'number' ? meta.stock
      : (toNum((meta as any)?.available_quantity) ?? toNum((meta as any)?.quantity))

    const shortage =
      typeof stock === 'number' && stock >= 0 && quantity > stock
        ? `<br><span class="text-red-600">*The ordered quantity is currently not available, but we will try to get it to you.</span>`
        : ''

    // Single success alert (message may contain red shortage note)
    alerts.showAlert({
      type: 'success',
      title: meta?.title || 'Added to Cart',
      message: `The item has been added to your cart.${shortage}`,
      image: meta?.image,
      sku: meta?.sku,
      actions: [{ label: 'View Cart', route: '/cart' }]
    })
  }

  async function setQuantity(product_id: Id, quantity: number) {
    if (isAuthed.value) await changeQtyServer(product_id, quantity)
    else setQtyGuest(product_id, quantity)
  }

  async function remove(product_id: Id) {
    if (isAuthed.value) {
      try { await removeServer(product_id) } catch {}
    } else {
      removeGuest(product_id)
    }
  }

  /** clear() for both guest & authed usage */
  async function clear() {
    if (isAuthed.value) {
      await clearServer()
    } else {
      clearGuest()
    }
  }

  /** Sync guest → server exactly once after login. */
  async function syncGuestToServer() {
    if (!auth.token.value) return
    if (!guestItems.value.length) return

    if (sessionStorage.getItem(SYNC_LOCK_KEY) === '1') return
    if (syncing.value) return
    syncing.value = true
    sessionStorage.setItem(SYNC_LOCK_KEY, '1')

    const backup = [...guestItems.value]
    const items = backup.map(i => ({
      product_id: i.product_id,
      quantity: Number(i.quantity || 1),
    }))

    guestItems.value = []
    saveGuest()

    try {
      console.debug('[cart] syncing', items)
      await $customApi('/v2/cart/sync', { method: 'POST', body: { items } })
      console.debug('[cart] sync ok')
    } catch (err) {
      console.error('[cart] sync failed', (err as any)?.data || err)
      guestItems.value = backup
      saveGuest()
    } finally {
      syncing.value = false
      setTimeout(() => sessionStorage.removeItem(SYNC_LOCK_KEY), 3000)
    }
  }

  onMounted(() => {
    loadGuest()
    if (auth.token.value) {
      syncGuestToServer()
    } else if (!cartAuthListenerAdded) {
      window.addEventListener('auth:changed', () => syncGuestToServer(), { once: true })
      cartAuthListenerAdded = true
    }
  })

  const count = computed(() => guestItems.value.reduce((a, b) => a + Number(b.quantity || 0), 0))
  const items = computed(() => guestItems.value)

  return {
    guestItems: items,
    count,
    syncing,
    add,
    setQuantity,
    remove,
    clear,
    clearServer,
    clearGuest,
    syncGuestToServer,
    // guest helpers
    addToGuest, setQtyGuest, removeGuest
  }
}
