/* server/middleware/x-robots.ts */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const hasQuery = (url.search || '').replace('?', '').length > 0
  setResponseHeader(event, 'X-Robots-Tag', hasQuery ? 'noindex, follow' : 'index, follow')
})
