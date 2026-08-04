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
  /**
   * Multiplier from BASE currency (USD) to the currency the `price` fields are
   * already expressed in. Defaults to 1 when omitted, so any existing caller
   * that doesn't pass it behaves exactly as before.
   *
   * Why this exists: the API converts prices server-side but sends
   * `discount_value` in USD. Subtracting 14 (USD) from 419.52 (AED) gave
   * 405.52 instead of the correct 368.10.
   */
  fx_rate?: number | null
}

/**
 * Pricing rules
 * - If a DISCOUNT exists (percent|fixed with value>0):
 *     • DO NOT use sale_price at all.
 *     • Use the base price (tier.price or product.price/regular_price) and apply discount.
 * - If NO discount:
 *     • Use the cheapest positive among sale_price, price, regular_price (or the tier’s sale/price when qty hits a tier).
 */
export function computeUnitPrice(
  product: ProductLike,
  qty: number,
  stackDiscountOnTiers = false // kept for API compatibility; with "discount overrides sale", stacking has no effect
): { unit: number; total: number; source: 'tier' | 'sale' | 'base' | 'base+discount' } {
  const q = Math.max(1, Number(qty || 1))
  const { type: discType, value: rawDiscValue } = discountInfo(product)
  const hasDiscount = !!discType && rawDiscValue > 0

  // ---- Currency normalisation ----
  // A percent discount is a ratio and is currency-agnostic — never scale it.
  // A fixed discount is an amount in USD and must be converted to match `base`.
  const fx = fxRate(product)
  const discValue = discType === 'fixed' ? rawDiscValue * fx : rawDiscValue

  // ---- Tier selection ----
  const tier = pickTier(product.table_price || [], q)
  if (tier) {
    let base: number

    if (hasDiscount) {
      // discount overrides any sale: use the tier BASE price
      base = firstPos(num(tier.price)) ?? 0
      let unit = base
      if (discType === 'percent') unit = clampMoney(base * (1 - discValue / 100))
      if (discType === 'fixed')   unit = clampMoney(Math.max(base - discValue, 0))
      return { unit, total: clampMoney(unit * q), source: 'base+discount' }
    }

    // No discount: pick the cheapest positive among tier.sale, tier.price, product.sale
    const candidates = positives(num(tier.sale_price), num(tier.price), num(product.sale_price))
    const unit = candidates.length ? Math.min(...candidates) : 0

    // best-effort source
    const src: 'tier' | 'sale' =
      num(tier.sale_price) && unit === num(tier.sale_price)
        ? 'tier'
        : (num(product.sale_price) && unit === num(product.sale_price) ? 'sale' : 'tier')

    return { unit, total: clampMoney(unit * q), source: src }
  }

  // ---- No tier ----
  let base: number
  if (hasDiscount) {
    // discount overrides any sale: apply to product base price
    base = firstPos(num(product.price), num(product.regular_price)) ?? 0
    let unit = base
    if (discType === 'percent') unit = clampMoney(base * (1 - discValue / 100))
    if (discType === 'fixed')   unit = clampMoney(Math.max(base - discValue, 0))
    return { unit, total: clampMoney(unit * q), source: 'base+discount' }
  }

  // No discount: use the cheapest positive among sale, price, regular
  const candidates = positives(num(product.sale_price), num(product.price), num(product.regular_price))
  const unit = candidates.length ? Math.min(...candidates) : 0
  return { unit, total: clampMoney(unit * q), source: num(product.sale_price) && num(product.sale_price)! > 0 ? 'sale' : 'base' }
}

/**
 * The fixed-discount amount expressed in the product's display currency.
 * Useful for "X OFF" badges so they stop showing the raw USD figure.
 * Returns 0 for percent discounts and when no discount is active.
 */
export function fixedDiscountAmount(product: ProductLike): number {
  const { type, value } = discountInfo(product)
  if (type !== 'fixed' || value <= 0) return 0
  return clampMoney(value * fxRate(product))
}

/* ---------------- helpers ---------------- */
function fxRate(p: ProductLike): number {
  const r = num(p.fx_rate)
  return r !== null && r > 0 ? r : 1
}
function num(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x
  if (typeof x === 'string') {
    const n = Number(x.trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}
function clampMoney(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100
}
function positives(...vals: Array<number | null>): number[] {
  return vals.filter((n): n is number => n !== null && n > 0)
}
function firstPos(...vals: Array<number | null>): number | null {
  for (const v of vals) {
    if (v !== null && v > 0) return v
  }
  return null
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
function discountInfo(p: ProductLike): { type: 'percent' | 'fixed' | null; value: number } {
  const t = p.discount_type
  const v = num(p.discount_value) ?? 0
  return { type: t === 'percent' || t === 'fixed' ? t : null, value: v }
}