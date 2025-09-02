// composables/useCart.ts
import { ref, computed, onMounted, watch } from 'vue'
import { useNuxtApp, useState } from '#imports'
import { useAuth } from './useAuth'
import { useAlertStore } from '~/stores/alert'

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
  serial_number?: string[] | null
}

// ---------- helpers ----------
function notifyCartChanged() {
  if (process.client) window.dispatchEvent(new CustomEvent('cart:changed'))
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

// ---------- main composable ----------
export function useCart() {
  const STORAGE_KEY = 'guest_cart'

  // shared global state
  const syncing     = useState<boolean>('cart_syncing', () => false)
  const guestItems  = useState<CartItem[]>('cart_guest_items', () => [])
  const serverCount = useState<number>('cart_server_count', () => 0)
  const initialized = useState<boolean>('cart_initialized', () => false)
  const listenersOnce = useState<boolean>('cart_listeners_added', () => false)

  const { $customApi } = useNuxtApp()
  const auth = useAuth()
  const alerts = useAlertStore()
  const isAuthed = computed<boolean>(() => Boolean(auth.token.value))

  // --- guest cart localStorage ---
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
    if (process.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guestItems.value))
    }
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
    notifyCartChanged()
  }

  function setQtyGuest(product_id: Id, quantity: number) {
    const id = String(product_id)
    const idx = guestItems.value.findIndex(i => String(i.product_id) === id)
    if (idx >= 0) {
      guestItems.value[idx] = { ...guestItems.value[idx], quantity: Math.max(1, Number(quantity || 1)) }
      saveGuest()
      notifyCartChanged()
    }
  }
  function removeGuest(product_id: Id) {
    guestItems.value = guestItems.value.filter(i => String(i.product_id) !== String(product_id))
    saveGuest()
    notifyCartChanged()
  }
  function clearGuest() {
    guestItems.value = []
    saveGuest()
    notifyCartChanged()
  }

  // --- server count fetch (with lock) ---
  let inflightCount: Promise<void> | null = null
  async function fetchServerCount() {
    if (!isAuthed.value) { serverCount.value = 0; return }
    if (inflightCount) return inflightCount

    inflightCount = (async () => {
      try {
        const r: any = await $customApi('/v2/cart', { method: 'GET' })
        const root = r?.data ?? r
        const items = Array.isArray(root?.items) ? root.items
          : Array.isArray(root?.data) ? root.data
          : Array.isArray(root) ? root
          : []
        serverCount.value = items.reduce((sum: number, it: any) => {
          const q = Number(it?.quantity ?? it?.qty ?? 0)
          return sum + (Number.isFinite(q) ? q : 0)
        }, 0)
      } catch {/* ignore */}
      finally { inflightCount = null }
    })()

    return inflightCount
  }

  // --- server actions ---
  async function addToServer(product_id: Id, quantity: number, meta?: Partial<CartItem>) {

    console.log("TESTTT~!@#");
    console.log(meta);

    serverCount.value = Math.max(0, Number(serverCount.value || 0) + Math.max(1, Number(quantity || 1)))
    notifyCartChanged()

    const serials = Array.isArray(meta?.serial_number)
      ? meta!.serial_number!.map(s => String(s || '').trim()).filter(Boolean)
      : []
    const res = await $customApi('/v2/cart/add', {
      method: 'POST',
      body: { product_id, quantity, ...(serials.length ? { serial_number: serials } : {}) }
    })
    await fetchServerCount()
    notifyCartChanged()
    return res
  }
  async function changeQtyServer(product_id: Id, quantity: number) {
    const res = await $customApi(`/v2/cart/set-quantity/${product_id}`, { method: 'POST', body: { quantity } })
    await fetchServerCount()
    notifyCartChanged()
    return res
  }
  async function removeServer(product_id: Id, removedQty?: number) {
    if (removedQty != null) {
      serverCount.value = Math.max(0, Number(serverCount.value || 0) - Math.max(1, Number(removedQty || 1)))
      notifyCartChanged()
    }
    const res = await $customApi(`/v2/cart/remove/${product_id}`, { method: 'POST' })
    await fetchServerCount()
    notifyCartChanged()
    return res
  }
  async function clearServer() {
    serverCount.value = 0
    notifyCartChanged()
    const res = await $customApi('/v2/cart/clear', { method: 'POST' })
    await fetchServerCount()
    notifyCartChanged()
    return res
  }

  // --- guest → server sync on login ---
  async function syncGuestToServer() {
    if (!process.client) return
    if (!guestItems.value.length) { await fetchServerCount(); return }
    if (syncing.value) return
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
      await fetchServerCount()
    }
  }

  // --- helpers for alert logic ---
  function guestQtyFor(product_id: Id) {
    const id = String(product_id)
    const row = guestItems.value.find(i => String(i.product_id) === id)
    return Number(row?.quantity || 0)
  }

  // --- public actions ---
  async function add(product_id: Id, quantity: number, meta?: Partial<CartItem>) {
    // perform the add
    if (isAuthed.value) await addToServer(product_id, quantity, meta)
    else addToGuest(product_id, quantity, meta)

    // availability note if we know stock
    const stock = toNum(meta?.stock)
    let shortage = false
    if (stock != null) {
      const prev = isAuthed.value ? 0 : guestQtyFor(product_id) - Math.max(1, Number(quantity || 1)) // prev before this add
      const desiredTotal = (prev < 0 ? 0 : prev) + Math.max(1, Number(quantity || 1))
      shortage = desiredTotal > stock
    }

    let message = 'The item has been added to your cart.'
    if (shortage) {
      message +=
        ' <div class="mt-1 text-red-600 font-semibold">' +
        'This quantity is currently not available, but we will try to get it for you.' +
        '</div>'
    }

    alerts.showAlert({
      type: 'success',
      title: meta?.title || 'Added to Cart',
      message,
      image: meta?.image,
      sku: meta?.sku,
      actions: [{ label: 'View Cart', route: '/cart' }]
    })
  }

  async function setQuantity(product_id: Id, quantity: number) {
    if (isAuthed.value) await changeQtyServer(product_id, quantity)
    else setQtyGuest(product_id, quantity)
  }
  async function remove(product_id: Id, qtyHint?: number) {
    if (isAuthed.value) {
      try { await removeServer(product_id, qtyHint) } catch {}
    } else {
      removeGuest(product_id)
    }
  }
  async function clear() {
    if (isAuthed.value) await clearServer()
    else clearGuest()
  }

  // --- init once ---
  onMounted(async () => {
    loadGuest()

    if (!initialized.value) {
      initialized.value = true
      if (isAuthed.value) {
        await syncGuestToServer()  // ends with fetchServerCount
      } else {
        serverCount.value = 0
      }
    }

    if (!listenersOnce.value && process.client) {
      listenersOnce.value = true

      // watch login/logout once
      watch(
        () => auth.token.value,
        async (tok, oldTok) => {
          if (tok && !oldTok) await syncGuestToServer()
          else if (!tok) serverCount.value = 0
        },
        { immediate: false }
      )

      // global event listeners (debounced)
      let t: number | undefined
      const handleCartChanged = () => {
        if (t) window.clearTimeout(t)
        t = window.setTimeout(async () => {
          if (isAuthed.value) await fetchServerCount()
          else loadGuest()
        }, 120)
      }
      window.addEventListener('cart:changed', handleCartChanged)

      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) loadGuest()
      })
    }
  })

  // --- exposed API ---
  const count = computed(() =>
    isAuthed.value
      ? Number(serverCount.value || 0)
      : guestItems.value.reduce((a, b) => a + Number(b.quantity || 0), 0)
  )

  return {
    guestItems,
    count,
    syncing,
    add,
    setQuantity,
    remove,
    clear,
    clearServer,
    clearGuest,
    addToGuest,
    setQtyGuest,
    removeGuest,
    syncGuestToServer,
    fetchServerCount,
  }
}
