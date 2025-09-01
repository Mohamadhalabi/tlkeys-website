export default defineNuxtPlugin(() => {
  if (!process.client) return

  const gtmId = useRuntimeConfig().public.gtmId || 'GTM-PWSSMVC7'
  if (!gtmId) return

  // init dataLayer
  ;(window as any).dataLayer = (window as any).dataLayer || []
  ;(window as any).dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })

  // inject GTM script
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`
  document.head.appendChild(s)

  // push page view on initial load + every route change
  const pushView = () => {
    (window as any).dataLayer.push({
      event: 'nuxt.pageView',
      page_path: location.pathname + location.search + location.hash,
      page_location: location.href,
      page_title: document.title
    })
  }
  if (document.readyState === 'complete') pushView()
  else window.addEventListener('load', pushView, { once: true })

  const router = useRouter()
  router.afterEach(() => pushView())
})
