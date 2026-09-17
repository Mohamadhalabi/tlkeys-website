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

  // TEMPORARY — remove once the IP is landing correctly
  console.log('proxy ip debug', {
    path,
    cf:  incoming['cf-connecting-ip'],
    xff: incoming['x-forwarded-for'],
    resolved: clientIp,
  })

  if (clientIp) headers['x-forwarded-for'] = clientIp

  const method = event.method
  // Raw bytes so JSON, form data and file uploads are all forwarded unchanged
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
      responseType: 'arrayBuffer', // never let ofetch turn binary into a Blob
      ignoreResponseError: true,   // pass Laravel's 4xx/5xx through as-is
    })
  } catch (err) {
    console.error('proxy upstream error', path, err)
    throw createError({ statusCode: 502, statusMessage: 'Upstream unavailable' })
  }

  setResponseStatus(event, res.status)

  const contentType = res.headers.get('content-type') || ''
  const raw = Buffer.from((res._data as ArrayBuffer | undefined) ?? new ArrayBuffer(0))

  // ---- JSON: keep the /storage/ rewrite ----
  if (contentType.includes('application/json')) {
    if (raw.length === 0) return null
    try {
      // Laravel returns relative image paths that used to resolve against its own
      // origin. Now that the browser talks to Nitro, rewrite them to absolute.
      const origin = new URL(config.apiBaseUrl).origin
      const json = JSON.stringify(JSON.parse(raw.toString('utf8'))).replace(
        /"(\/storage\/[^"]*)"/g,
        (_m, p) => JSON.stringify(origin + p)
      )
      return JSON.parse(json)
    } catch {
      // Malformed JSON: send it through unchanged
      setResponseHeader(event, 'content-type', contentType)
      return raw
    }
  }

  // ---- Everything else (PDF, images, Excel, text): raw bytes ----
  for (const name of ['content-type', 'content-disposition', 'cache-control']) {
    const value = res.headers.get(name)
    if (value) setResponseHeader(event, name, value)
  }
  // Don't copy content-length / content-encoding: Nitro sets them correctly

  return raw
})