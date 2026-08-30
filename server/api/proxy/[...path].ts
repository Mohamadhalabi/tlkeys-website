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
  const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(event) : undefined

  const res = await $fetch(`${config.apiBaseUrl}/${path}`, {
    method: method as any,
    headers,
    query,
    body,
  })

  // Laravel returns relative image paths that used to resolve against its own
  // origin. Now that the browser talks to Nitro, rewrite them to absolute.
  const origin = new URL(config.apiBaseUrl).origin
  const json = JSON.stringify(res).replace(
    /"(\/storage\/[^"]*)"/g,
    (_m, p) => JSON.stringify(origin + p)
  )
  return JSON.parse(json)
})