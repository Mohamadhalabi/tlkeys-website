// Build query params exactly like your other sections + $customApi
export function buildCatalogParams(qs: Record<string, any>) {
  const params: Record<string, any> = {}
  for (const [k, v] of Object.entries(qs)) {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue
    if (Array.isArray(v)) params[k] = v.join(',')
    else if (typeof v === 'object') params[k] = JSON.stringify(v)
    else params[k] = v
  }
  return params
}