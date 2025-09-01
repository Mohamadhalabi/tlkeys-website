// composables/useCart.ts
import { ref, computed, onMounted, watch } from 'vue'
import { useNuxtApp } from '#imports'
import { useAuth } from './useAuth'
import { useAlertStore } from '~/stores/alert'

let cartAuthListenerAdded = false
const SYNC_LOCK_KEY = 'cart-sync-lock'

type Id = number | string
type PriceTableRow = { min_qty: number; max_qty?: number | null; price: number; sale_price?: number | null }

export type CartItem = {
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
  discount_start_date?: string | null
  discount_end_date?: string | null
  table_price?: PriceTableRow[] | null
  priceSnapshot?: number | null
  stock?: number | null
  /** Stored as {"serial_number":[...]} in carts.note on the server */
  serial_number?: string[] | null
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

    const serials = Array.isArray(meta?.serial_number)
      ? meta!.serial_number!.map(s => String(s || '').trim()).filter(Boolean)
      : []

    const normalized: Partial<CartItem> = {
      title: meta?.title,
      image: meta?.image,
      sku:   meta?.sku,
      slug:  meta?.slug,
      price: toNum(meta?.price) ?? null,
      regular_price: toNum(meta?.regular_price) ?? null,
      sale_price: toNum(meta?.sale_price) ?? null,
      discount_type: (meta?.discount_type === 'percent' || meta?.discount_type === 'fixed') ? meta?.discount_type : null,
      discount_value: toNum(meta?.discount_value) ?? null,
      discount_start_date: meta?.discount_start_date ?? null,
      discount_end_date: meta?.discount_end_date ?? null,
      table_price: Array.isArray(meta?.table_price) ? meta?.table_price as PriceTableRow[] : null,
      priceSnapshot: toNum(meta?.priceSnapshot) ?? null,
      stock: toNum(meta?.stock) ?? null,
      serial_number: serials.length ? serials : null,
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
  async function addToServer(product_id: Id, quantity: number, meta?: Partial<CartItem>) {
    const serials = Array.isArray(meta?.serial_number)
      ? meta!.serial_number!.map(s => String(s || '').trim()).filter(Boolean)
      : []
    return $customApi('/v2/cart/add', {
      method: 'POST',
      body: { product_id, quantity, ...(serials.length ? { serial_number: serials } : {}) }
    })
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

  /** Sync guest cart → server right after login (keeps serial numbers). */
  async function syncGuestToServer() {
    if (!process.client) return
    if (!guestItems.value.length) return
    if (syncing.value) return
    // prevent rapid double-calls (optional lock)
    if (sessionStorage.getItem(SYNC_LOCK_KEY) === '1') return

    syncing.value = true
    sessionStorage.setItem(SYNC_LOCK_KEY, '1')
    try {
      const items = guestItems.value.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        ...(Array.isArray(i.serial_number) && i.serial_number.length
          ? { serial_number: i.serial_number }
          : {})
      }))
      await $customApi('/v2/cart/sync', { method: 'POST', body: { items } })
      clearGuest()
    } finally {
      syncing.value = false
      sessionStorage.removeItem(SYNC_LOCK_KEY)
    }
  }

  // --- Public API ---
  async function add(product_id: Id, quantity: number, meta?: Partial<CartItem>) {
    if (isAuthed.value) {
      await addToServer(product_id, quantity, meta)
    } else {
      addToGuest(product_id, quantity, meta)
    }

    alerts.showAlert({
      type: 'success',
      title: meta?.title || 'Added to Cart',
      message: `The item has been added to your cart.`,
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

  async function clear() {
    if (isAuthed.value) {
      await clearServer()
    } else {
      clearGuest()
    }
  }

  // Init + auto-sync when user logs in
  onMounted(() => {
    loadGuest()

    // If already logged in, sync immediately
    if (auth.token.value) {
      syncGuestToServer()
    }

    // Also watch for future logins and sync once
    watch(
      () => auth.token.value,
      (tok, oldTok) => {
        if (tok && !oldTok) {
          syncGuestToServer()
        }
      },
      { immediate: false }
    )

    // Optional: support a global event if your auth emits it
    if (!cartAuthListenerAdded) {
      window.addEventListener('auth:changed', () => {
        if (auth.token.value) syncGuestToServer()
      }, { once: true })
      cartAuthListenerAdded = true
    }
  })

  const count = computed(() => guestItems.value.reduce((a, b) => a + Number(b.quantity || 0), 0))
  const items = computed(() => guestItems.value)

  return {
    // state
    guestItems: items,
    count,
    syncing,
    // actions
    add,
    setQuantity,
    remove,
    clear,
    clearServer,
    clearGuest,
    addToGuest,
    setQtyGuest,
    removeGuest,
    // expose sync so callers can trigger manually if they want
    syncGuestToServer,
  }
}
