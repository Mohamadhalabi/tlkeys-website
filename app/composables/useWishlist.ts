// composables/useWishlist.ts
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuth } from './useAuth'
import { useNuxtApp } from '#imports'
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

export function useWishlist() {
  const STORAGE_KEY = 'guest_wishlist'
  const syncing = ref(false)

  const { $customApi } = useNuxtApp()
  const auth = useAuth()
  const alerts = useAlertStore()

  const isAuthed = computed<boolean>(() =>
    Boolean((auth as any)?.token?.value) || Boolean((auth as any)?.isAuthenticated?.value)
  )

  // ---------- Guest wishlist ----------
  const guest = ref<WishItem[]>([])

  function loadGuest() {
    if (!process.client) return
    try { guest.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') || [] }
    catch { guest.value = [] }
  }
  function saveGuest() {
    if (!process.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guest.value))
  }

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
        if (meta.discount_type && !found.discount_type) found.discount_type = (meta.discount_type === 'percent' || meta.discount_type === 'fixed') ? meta.discount_type : null
        const dv = toNum(meta.discount_value); if (dv != null && found.discount_value == null) found.discount_value = dv
      }
      saveGuest()
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
    return true
  }

  function removeGuest(product_id: Id) {
    const before = guest.value.length
    guest.value = guest.value.filter(i => String(i.product_id) !== String(product_id))
    saveGuest()
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
  // Keep a set of IDs for quick membership checks
  const serverIds = ref<Set<string>>(new Set())
  const loadingServer = ref(false)

  async function loadServerIds() {
    if (!isAuthed.value) return
    loadingServer.value = true
    try {
      const r = await $customApi('/v2/wishlist', { method: 'GET' })
      const arr = (r?.data ?? r) as any[]
      const set = new Set<string>()
      for (const it of Array.isArray(arr) ? arr : []) {
        // support either [1,2] or [{product_id:1}, {id:2}, ...]
        const pid = (typeof it === 'number' || typeof it === 'string') ? it : (it?.product_id ?? it?.id)
        if (pid != null) set.add(String(pid))
      }
      serverIds.value = set
    } finally {
      loadingServer.value = false
    }
  }

  // Server calls
  async function addServer(product_id: Id) {
    await $customApi('/v2/wishlist', { method: 'POST', body: { product_id } })
    serverIds.value.add(String(product_id))
  }
  async function removeServer(product_id: Id) {
    await $customApi(`/v2/wishlist/delete/${product_id}`, { method: 'POST' })
  }
  async function toggleServer(product_id: Id): Promise<'added' | 'removed'> {
    // Preferred: backend toggle returns {status:'added'|'removed'} (or {added:true}/{removed:true})
    try {
      const r = await $customApi('/v2/wishlist/toggle', { method: 'POST', body: { product_id } })
      const data = r?.data ?? r
      const status: 'added' | 'removed' =
        data?.status ?? (data?.added ? 'added' : 'removed')
      if (status === 'added') serverIds.value.add(String(product_id))
      else serverIds.value.delete(String(product_id))
      return status
    } catch {
      // Fallback if /toggle isn't available: try add then remove
      try { await addServer(product_id); return 'added' }
      catch { await removeServer(product_id); return 'removed' }
    }
  }
  async function bulkAddServer(ids: Id[]) {
    if (!ids.length) return
    await $customApi('/v2/wishlist/bulk', { method: 'POST', body: { products: ids.join(',') } })
    for (const id of ids) serverIds.value.add(String(id))
  }

  // ---- Public API (with alerts) ----
  async function add(product_id: Id, meta?: AddMeta) {
    try {
      if (isAuthed.value) {
        // If already in server list, just show info toast
        if (serverIds.value.has(String(product_id))) {
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

  async function syncGuestToServer() {
    if (!isAuthed.value || !guest.value.length || syncing.value) return
    syncing.value = true
    try {
      const ids = guest.value.map(w => w.product_id)
      await bulkAddServer(ids)
      guest.value = []
      saveGuest()
    } finally {
      syncing.value = false
    }
  }

  function isInWishlist(product_id: Id) {
    const id = String(product_id)
    return isAuthed.value
      ? serverIds.value.has(id)
      : guest.value.some(i => String(i.product_id) === id)
  }

  onMounted(async () => {
    loadGuest()
    if (isAuthed.value) await loadServerIds()
    // When auth state flips to logged-in, push guest → server and refresh IDs
    window.addEventListener('auth:changed', async () => {
      await syncGuestToServer()
      await loadServerIds()
    })
  })

  const count = computed(() =>
    isAuthed.value ? serverIds.value.size : guest.value.length
  )

  return {
    // state
    guest, count, syncing,
    // server state (handy for debugging)
    serverIds, loadingServer,
    // actions
    add, remove, toggle, syncGuestToServer,
    // helpers
    isInWishlist,
    // guest helpers
    addGuest, removeGuest, toggleGuest,
    loadServerIds,
  }
}
