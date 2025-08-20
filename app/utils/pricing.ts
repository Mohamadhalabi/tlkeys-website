// ~/utils/pricing.ts

export type PriceTableRow = {
  min_qty: number
  max_qty?: number | null
  price: number | string
  sale_price?: number | string | null
}

export type ProductLike = {
  price: number | string
  regular_price?: number | string | null
  sale_price?: number | string | null
  table_price?: PriceTableRow[] | null
  discount_type?: 'percent' | 'fixed' | null
  discount_value?: number | string | null
}

/**
 * Compute a unit price for a given qty.
 * Tier/table price overrides base/discount by default (no stacking).
 * If you want discount to stack on tiers, pass stackDiscountOnTiers = true.
 */
export function computeUnitPrice(
  product: ProductLike,
  qty: number,
  stackDiscountOnTiers = false
): { unit: number; total: number; source: 'tier' | 'base' | 'base+discount' } {
  const q = Math.max(1, Number(qty || 1))

  // base price selection:
  // 1) Prefer the first numeric value > 0 among sale, price, regular.
  // 2) If all are <= 0 or nullish, fall back to the first numeric (including 0).
  const base =
    firstNumGtZero(product.sale_price, product.price, product.regular_price) ??
    firstNum(product.sale_price, product.price, product.regular_price) ??
    0

  let discounted = base
  const t = product.discount_type
  const v = num(product.discount_value)

  if (t && isFiniteNum(v)) {
    if (t === 'percent') discounted = clampMoney(base * (1 - v / 100))
    if (t === 'fixed')   discounted = clampMoney(Math.max(base - v, 0)) // cap at 0
  }
  discounted = Math.max(0, discounted)

  const tier = pickTier(product.table_price || [], q)
  if (tier) {
    let tierUnit = num(tier.sale_price) ?? num(tier.price) ?? discounted
    if (stackDiscountOnTiers && t && isFiniteNum(v)) {
      if (t === 'percent') tierUnit = clampMoney(tierUnit * (1 - v / 100))
      if (t === 'fixed')   tierUnit = clampMoney(Math.max(tierUnit - v, 0))
      return { unit: tierUnit, total: clampMoney(tierUnit * q), source: 'base+discount' }
    }
    return { unit: tierUnit, total: clampMoney(tierUnit * q), source: 'tier' }
  }

  return { unit: discounted, total: clampMoney(discounted * q), source: t ? 'base+discount' : 'base' }
}

/* ---------------- helpers ---------------- */
function num(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') {
    const n = Number(x.trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}
function isFiniteNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x)
}
function clampMoney(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100
}
function pickTier(rows: PriceTableRow[], qty: number): PriceTableRow | null {
  if (!Array.isArray(rows) || !rows.length) return null
  const q = Math.max(1, qty)
  const ordered = [...rows].sort((a, b) => (Number(a.min_qty) || 1) - (Number(b.min_qty) || 1))
  for (const r of ordered) {
    const min = Number(r.min_qty) || 1
    const max = r.max_qty == null ? Infinity : Number(r.max_qty)
    if (q >= min && q <= max) return r
  }
  let candidate: PriceTableRow | null = null
  for (const r of ordered) if ((Number(r.min_qty) || 1) <= q) candidate = r
  return candidate
}

// prefer the first numeric > 0
function firstNumGtZero(...vals: any[]): number | null {
  for (const v of vals) {
    const n = num(v)
    if (n != null && n > 0) return n
  }
  return null
}
// otherwise, first numeric (including 0)
function firstNum(...vals: any[]): number | null {
  for (const v of vals) {
    const n = num(v)
    if (n != null) return n
  }
  return null
}
