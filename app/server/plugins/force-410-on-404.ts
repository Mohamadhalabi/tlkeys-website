import { defineNitroPlugin } from 'nitropack'
import { setResponseStatus } from 'h3'

export default defineNitroPlugin((nitroApp) => {
  // When Nuxt/Nitro throws an error (including notFound())
  nitroApp.hooks.hook('error', (error, { event }) => {
    const code = (error as any)?.statusCode ?? (error as any)?.status
    if (code === 404 && event) {
      setResponseStatus(event, 410, 'Gone')
      ;(error as any).statusCode = 410
      ;(error as any).statusMessage = 'Gone'
    }
  })

  // Extra safety: if something rendered with 404 anyway, flip it before send
  nitroApp.hooks.hook('beforeResponse', (event, { body }) => {
    if (event.node.res.statusCode === 404) {
      setResponseStatus(event, 410, 'Gone')
    }
  })
})
