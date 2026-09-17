// server/api/proxy/[...path].ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const path = getRouterParam(event, 'path')
  const query = getQuery(event)
  const headers: Record<string, string> = {
    'api-key': config.apiKey,
    'secret-key': config.secretKey,
  }
  const incoming = getRequestHeaders(event)
  for (const h of ['authorization', 'accept-language', 'x-currency', 'x-vinpin-token', 'content-type', 'cookie', 'accept', 'currency']) {
    if (incoming[h]) headers[h] = incoming[h] as string
  }

  // The visitor's real address. Laravel's client on this hop is *this server*,
  // so without an explicit X-Forwarded-For every registration_ip, rate limit
  // and audit log records our own box instead of the user.
  //
  // Set from Cloudflare's header rather than passed through from the client:
  // an inbound x-forwarded-for is attacker-controlled and must not be trusted.
  const clientIp =
    (incoming['cf-connecting-ip'] as string | undefined) ||
    getRequestIP(event, { xForwardedFor: true })

  if (clientIp) headers['x-forwarded-for'] = clientIp

  const method = event.method
  // Raw bytes so JSON, form data and file uploads are forwarded unchanged
  // (content-type is already forwarded above).
  const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    ? await readRawBody(event, false)
    : undefined

  let res
  try {
    res = await $fetch.raw(`${config.apiBaseUrl}/${path}`, {
      method: method as any,
      headers,
      query,
      body,
      // Read everything as bytes. Without this, ofetch turns a PDF into a Blob,
      // and JSON.stringify(blob) is "{}", which is what broke the cart PDF.
      responseType: 'arrayBuffer',
      // Don't throw on non-2xx. A 422 validation message, a 403 quota refusal
      // or a 404 is passed straight through with Laravel's real status and body
      // instead of becoming a bare 500 "Server Error".
      ignoreResponseError: true,
    })
  } catch (err: any) {
    // Only network-level failures land here (Laravel down, DNS, timeout).
    setResponseStatus(event, 502)
    return {
      error: true,
      message: err?.message ?? 'Upstream request failed',
    }
  }

  setResponseStatus(event, res.status)

  const contentType = res.headers.get('content-type') || ''
  const raw = Buffer.from((res._data as ArrayBuffer | undefined) ?? new ArrayBuffer(0))

  // ---- JSON responses (success or error): keep the /storage/ rewrite ----
  if (contentType.includes('application/json') && raw.length > 0) {
    try {
      // Laravel returns relative image paths that used to resolve against its own
      // origin. Now that the browser talks to Nitro, rewrite them to absolute.
      const origin = new URL(config.apiBaseUrl).origin
      const json = raw.toString('utf8').replace(
        /"(\/storage\/[^"]*)"/g,
        (_m, p) => JSON.stringify(origin + p)
      )
      return JSON.parse(json)
    } catch {
      // Malformed JSON: fall through and send it unchanged
    }
  }

  // ---- Everything else (PDF, images, Excel, text): send raw bytes ----
  for (const name of ['content-type', 'content-disposition', 'cache-control']) {
    const value = res.headers.get(name)
    if (value) setResponseHeader(event, name, value)
  }
  // Don't copy content-length / content-encoding: Nitro sets them itself.

  return raw
})