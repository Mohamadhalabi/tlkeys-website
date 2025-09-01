// server/plugins/99-force-410-on-404.ts
import { defineNitroPlugin } from 'nitropack'
import { setResponseStatus } from 'h3'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    if (!event) return
    const code = (error as any)?.statusCode ?? (error as any)?.status
    // do NOT touch if it's already a redirect
    const resCode = event.node.res.statusCode
    if ([301,302,307,308].includes(resCode)) return
    if (code === 404) {
      setResponseStatus(event, 410, 'Gone')
      ;(error as any).statusCode = 410
      ;(error as any).statusMessage = 'Gone'
    }
  })

  nitroApp.hooks.hook('beforeResponse', (event) => {
    // still, don't override a redirect
    if ([301,302,307,308].includes(event.node.res.statusCode)) return
    if (event.node.res.statusCode === 404) {
      setResponseStatus(event, 410, 'Gone')
    }
  })
})
