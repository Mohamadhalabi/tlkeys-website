// composables/useWishlist.ts
import { computed, onMounted, nextTick } from 'vue'
import { useAuth } from './useAuth'
import { useNuxtApp, useState } from '#imports'
import { useAlertStore } from '~/stores/alert'

type Id = number | string
type PriceTableRow = { min_qty: number; max_qty?: number | null; price: number; sale_price?: number | null }

// Keep snapshots so the wishlist page can render without refetching (guest only)
type WishItem = {
  product_id: Id
  title?: string
  image?: string
  sku?: string
  slug?: string
  // pricing snapshot + inputs for future recomputation
  price?: number | null                  // snapshot of the unit price we showed when adding
  regular_price?: number | null          // your schema uses `price` as regular base
  sale_price?: number | null
  table_price?: PriceTableRow[] | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | null
}

type AddMeta = Partial<WishItem>

function toNum(x: unknown): number | undefined {
  if (x == null) return undefined
  if (typeof x === 'number') return Number.isFinite(x) ? x : undefined
  if (typeof x === 'string') {
    const n = Number(x.trim())
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function notifyWishlistChanged() {
  if (process.client) window.dispatchEvent(new CustomEvent('wishlist:changed'))
}

export function useWishlist() {
  const STORAGE_KEY = 'guest_wishlist'

  // ---------- GLOBAL (shared) state ----------
  // useState ensures every call to useWishlist() shares the same refs
  const syncing      = useState<boolean>('wl_syncing', () => false)
  const guest        = useState<WishItem[]>('wl_guest_items', () => [])
  // Use array for SSR-serializable state and mirror a Set view for speed
  const serverIdsArr = useState<string[]>('wl_server_ids', () => [])
  const serverIdsSet = computed(() => new Set(serverIdsArr.value))

  const { $customApi } = useNuxtApp()
  const auth = useAuth()
  const alerts = useAlertStore()

  const isAuthed = computed<boolean>(() =>
    Boolean((auth as any)?.token?.value) || Boolean((auth as any)?.isAuthenticated?.value)
  )

  // ---------- Guest wishlist ----------
  function loadGuest() {
    if (!process.client) return
    try { guest.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || [] }
    catch { guest.value = [] }
  }
  function saveGuest() {
    if (!process.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guest.value))
  }
  function clearGuest() { guest.value = []; saveGuest(); notifyWishlistChanged() }

  function addGuest(product_id: Id, meta?: AddMeta) {
    const found = guest.value.find(i => String(i.product_id) === String(product_id))
    if (found) {
      // backfill snapshot if missing
      if (meta) {
        if (meta.title && !found.title) found.title = meta.title
        if (meta.image && !found.image) found.image = meta.image
        if (meta.sku   && !found.sku)   found.sku   = meta.sku
        if (meta.slug  && !found.slug)  found.slug  = meta.slug

        const p  = toNum(meta.price);          if (p  != null && found.price == null)          found.price = p
        const rp = toNum(meta.regular_price);  if (rp != null && found.regular_price == null)  found.regular_price = rp
        const sp = toNum(meta.sale_price);     if (sp != null && found.sale_price == null)     found.sale_price = sp

        if (Array.isArray(meta.table_price) && !found.table_price) found.table_price = meta.table_price as PriceTableRow[]
        if (meta.discount_type && !found.discount_type) {
          found.discount_type = (meta.discount_type === 'percent' || meta.discount_type === 'fixed') ? meta.discount_type : null
        }
        const dv = toNum(meta.discount_value); if (dv != null && found.discount_value == null) found.discount_value = dv
      }
      saveGuest()
      notifyWishlistChanged()
      return false // already existed
    }

    guest.value.push({
      product_id,
      title: meta?.title,
      image: meta?.image,
      sku:   meta?.sku,
      slug:  meta?.slug,

      price:          toNum(meta?.price) ?? null,
      regular_price:  toNum(meta?.regular_price) ?? null,
      sale_price:     toNum(meta?.sale_price) ?? null,
      table_price:    Array.isArray(meta?.table_price) ? (meta?.table_price as PriceTableRow[]) : (meta?.table_price ?? null),
      discount_type:  meta?.discount_type === 'percent' || meta?.discount_type === 'fixed' ? meta.discount_type : null,
      discount_value: toNum(meta?.discount_value) ?? null,
    })
    saveGuest()
    notifyWishlistChanged()
    return true
  }

  function removeGuest(product_id: Id) {
    const before = guest.value.length
    guest.value = guest.value.filter(i => String(i.product_id) !== String(product_id))
    saveGuest()
    notifyWishlistChanged()
    return guest.value.length !== before
  }

  function toggleGuest(product_id: Id, meta?: AddMeta) {
    const exists = guest.value.some(i => String(i.product_id) === String(product_id))
    if (exists) {
      removeGuest(product_id)
      return 'removed' as const
    } else {
      addGuest(product_id, meta)
      return 'added' as const
    }
  }

  // ---------- Server wishlist ----------
  function extractIds(payload: any): string[] {
    // Accept: [1,2,3] OR [{product_id},{id},product] OR {data:[...]} OR {items:[...]}
    const root = Array.isArray(payload) ? payload
      : Array.isArray(payload?.data) ? payload.data
      : Array.isArray(payload?.items) ? payload.items
      : []
    const ids: string[] = []
    for (const it of root) {
      if (it == null) continue
      if (typeof it === 'number' || typeof it === 'string') {
        ids.push(String(it)); continue
      }
      const pid = it.product_id ?? it.id ?? it?.product?.id
      if (pid != null) ids.push(String(pid))
    }
    return ids
  }

  async function loadServerIds() {
    if (!isAuthed.value) { serverIdsArr.value = []; return }
    try {
      const r = await $customApi('/v2/wishlist', { method: 'GET' })
      const ids = extractIds(r?.data ?? r)
      serverIdsArr.value = ids
      notifyWishlistChanged()
    } catch {
      // keep previous
    }
  }

  // OPTIMISTIC: update serverIdsArr immediately, then verify
  async function addServer(product_id: Id) {
    const id = String(product_id)
    if (!serverIdsSet.value.has(id)) {
      serverIdsArr.value = [...serverIdsArr.value, id]
      notifyWishlistChanged()
    }
    try {
      await $customApi('/v2/wishlist', { method: 'POST', body: { product_id } })
      // verify by refetching (optional but keeps in sync if API overwrote)
      await loadServerIds()
    } catch (e) {
      // rollback on error
      serverIdsArr.value = serverIdsArr.value.filter(x => x !== id)
      notifyWishlistChanged()
      throw e
    }
  }

  async function removeServer(product_id: Id) {
    const id = String(product_id)
    // optimistic remove
    if (serverIdsSet.value.has(id)) {
      serverIdsArr.value = serverIdsArr.value.filter(x => x !== id)
      notifyWishlistChanged()
    }
    try {
      // Preferred per your routes
      await $customApi(`/v2/wishlist/${product_id}`, { method: 'DELETE' })
    } catch {
      await $customApi(`/v2/wishlist/delete/${product_id}`, { method: 'POST' })
    } finally {
      // verify (keeps parity with server)
      await loadServerIds()
    }
  }

  async function toggleServer(product_id: Id): Promise<'added' | 'removed'> {
    const id = String(product_id)
    // optimistic flip
    const wasIn = serverIdsSet.value.has(id)
    serverIdsArr.value = wasIn
      ? serverIdsArr.value.filter(x => x !== id)
      : [...serverIdsArr.value, id]
    notifyWishlistChanged()

    try {
      const r = await $customApi('/v2/wishlist/toggle', { method: 'POST', body: { product_id } })
      const data = r?.data ?? r
      const status: 'added' | 'removed' = data?.status ?? (data?.added ? 'added' : 'removed')
      // hard-verify with a light refresh
      await loadServerIds()
      return status
    } catch {
      // Fallback if /toggle not available
      if (wasIn) {
        await removeServer(product_id)
        return 'removed'
      } else {
        await addServer(product_id)
        return 'added'
      }
    }
  }

  async function bulkAddServer(ids: Id[]) {
    if (!ids.length) return
    // optimistic union
    const toAdd = ids.map(String).filter(id => !serverIdsSet.value.has(id))
    if (toAdd.length) {
      serverIdsArr.value = [...serverIdsArr.value, ...toAdd]
      notifyWishlistChanged()
    }
    try {
      await $customApi('/v2/wishlist/bulk', { method: 'POST', body: { products: ids.join(',') } })
      await loadServerIds()
    } catch (e) {
      // rollback: best-effort (clear and refetch)
      await loadServerIds()
      throw e
    }
  }

  async function listServerIds(): Promise<string[]> {
    try {
      const r = await $customApi('/v2/wishlist', { method: 'GET' })
      return extractIds(r?.data ?? r)
    } catch { return [] }
  }

  async function clearServer() {
    // optimistic clear
    serverIdsArr.value = []
    notifyWishlistChanged()
    try {
      // If you later add POST /v2/wishlist/clear this will use it automatically
      try { await $customApi('/v2/wishlist/clear', { method: 'POST' }) }
      catch {
        // Fallback: fetch IDs and delete all
        const ids = await listServerIds()
        if (ids.length) await Promise.all(ids.map(id => removeServer(id).catch(() => {})))
      }
    } finally {
      await loadServerIds()
    }
  }

  // ---- Public API (with alerts) ----
  async function add(product_id: Id, meta?: AddMeta) {
    try {
      if (isAuthed.value) {
        if (serverIdsSet.value.has(String(product_id))) {
          if (process.client) alerts.showAlert({
            type: 'info',
            title: meta?.title || 'Already in Wishlist',
            message: 'This item is already in your wishlist.',
            image: meta?.image, sku: meta?.sku,
            actions: [{ label: 'View Wishlist', route: '/wishlist' }]
          })
          return
        }
        await addServer(product_id)
      } else {
        const added = addGuest(product_id, meta)
        if (!added) {
          if (process.client) alerts.showAlert({
            type: 'info',
            title: meta?.title || 'Already in Wishlist',
            message: 'This item is already in your wishlist.',
            image: meta?.image, sku: meta?.sku,
            actions: [{ label: 'View Wishlist', route: '/wishlist' }]
          })
          return
        }
      }
      if (process.client) {
        await nextTick()
        alerts.showAlert({
          type: 'success',
          title: meta?.title || 'Added to Wishlist',
          message: 'The item has been added to your wishlist.',
          image: meta?.image, sku: meta?.sku,
          actions: [{ label: 'View Wishlist', route: '/wishlist' }]
        })
      }
    } catch (e: any) {
      if (process.client) alerts.showAlert({
        type: 'error',
        title: meta?.title || 'Wishlist Error',
        message: e?.data?.message || e?.message || 'Something went wrong.',
        image: meta?.image, sku: meta?.sku
      })
      throw e
    }
  }

  async function remove(product_id: Id, meta?: AddMeta) {
    try {
      if (isAuthed.value) await removeServer(product_id)
      else removeGuest(product_id)
      if (process.client) alerts.showAlert({
        type: 'info',
        title: meta?.title || 'Removed from Wishlist',
        message: 'The item was removed from your wishlist.',
        image: meta?.image, sku: meta?.sku
      })
    } catch (e: any) {
      if (process.client) alerts.showAlert({
        type: 'error',
        title: meta?.title || 'Wishlist Error',
        message: e?.data?.message || e?.message || 'Something went wrong.',
        image: meta?.image, sku: meta?.sku
      })
      throw e
    }
  }

  async function toggle(product_id: Id, meta?: AddMeta) {
    try {
      if (isAuthed.value) {
        const status = await toggleServer(product_id)
        return showT(status)
      } else {
        const res = toggleGuest(product_id, meta)
        return showT(res)
      }
    } catch (e: any) {
      if (process.client) alerts.showAlert({
        type: 'error',
        title: meta?.title || 'Wishlist Error',
        message: e?.data?.message || e?.message || 'Something went wrong.',
        image: meta?.image, sku: meta?.sku
      })
      throw e
    }

    function showT(kind: 'added'|'removed') {
      if (!process.client) return
      alerts.showAlert({
        type: kind === 'added' ? 'success' : 'info',
        title: meta?.title || (kind === 'added' ? 'Added to Wishlist' : 'Removed from Wishlist'),
        message: kind === 'added'
          ? 'The item has been added to your wishlist.'
          : 'The item was removed from your wishlist.',
        image: meta?.image, sku: meta?.sku,
        actions: kind === 'added' ? [{ label: 'View Wishlist', route: '/wishlist' }] : undefined
      })
    }
  }

  async function clear() {
    if (isAuthed.value) await clearServer()
    clearGuest() // always keep guest clean too
  }

  async function syncGuestToServer() {
    if (!isAuthed.value || !guest.value.length || syncing.value) return
    syncing.value = true
    try {
      const ids = guest.value.map(w => w.product_id)
      // optimistic: merge into server ids right away
      const newOnes = ids.map(String).filter(id => !serverIdsSet.value.has(id))
      if (newOnes.length) {
        serverIdsArr.value = [...serverIdsArr.value, ...newOnes]
        notifyWishlistChanged()
      }
      await bulkAddServer(ids)
      guest.value = []
      saveGuest()
    } finally { syncing.value = false }
  }

  function isInWishlist(product_id: Id) {
    const id = String(product_id)
    return isAuthed.value
      ? serverIdsSet.value.has(id)
      : guest.value.some(i => String(i.product_id) === id)
  }

  onMounted(async () => {
    loadGuest()
    if (isAuthed.value) await loadServerIds()
    // When auth state flips to logged-in, push guest → server and refresh IDs
    window.addEventListener('auth:changed', async () => {
      await syncGuestToServer()
      await loadServerIds()
    }, { once: true })
  })

  const count = computed(() =>
    isAuthed.value ? serverIdsArr.value.length : guest.value.length
  )

  return {
    // state
    guest, count, syncing,
    // expose server ids if you need them
    serverIds: serverIdsSet, loadingServer: computed(() => false),
    // actions
    add, remove, toggle, clear, syncGuestToServer,
    // helpers
    isInWishlist,
    // guest helpers
    addGuest, removeGuest, toggleGuest, clearGuest,
    // server helpers
    loadServerIds, clearServer,
  }
}
