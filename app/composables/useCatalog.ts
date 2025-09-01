// ~/composables/useCatalog.ts

/** Stable stringify: sort object keys and array values for deterministic URLs */
function stableStringify(obj: Record<string, any>): string {
  const normalize = (v: any): any => {
    if (Array.isArray(v)) {
      return [...v].map(String).map(s => s.trim()).filter(Boolean).sort();
    }
    if (v && typeof v === 'object') {
      const out: Record<string, any> = {};
      Object.keys(v).sort().forEach(k => { out[k] = normalize(v[k]); });
      return out;
    }
    return v;
  };
  return JSON.stringify(normalize(obj));
}

/**
 * Build query params for the catalog endpoint.
 * - Arrays -> comma-joined
 * - Objects -> stable JSON (only if non-empty)
 * - Primitives -> passed as-is
 */
export function buildCatalogParams(qs: Record<string, any>) {
  const params: Record<string, any> = {};

  for (const [k, v] of Object.entries(qs)) {
    if (v == null) continue;

    // empty string
    if (typeof v === 'string' && v.trim() === '') continue;

    if (Array.isArray(v)) {
      const arr = v.map(String).map(s => s.trim()).filter(Boolean);
      if (!arr.length) continue;
      params[k] = arr.join(',');
      continue;
    }

    if (typeof v === 'object') {
      // skip empty object
      if (Object.keys(v).length === 0) continue;

      // attributes or any object-like param → stable JSON
      params[k] = stableStringify(v as Record<string, any>);
      continue;
    }

    // numbers / booleans / non-empty strings
    params[k] = v;
  }

  return params;
}
