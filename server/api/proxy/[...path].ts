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