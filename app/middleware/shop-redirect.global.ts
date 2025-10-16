// middleware/shop-redirect.global.ts
export default defineNuxtRouteMiddleware((to) => {
  // /shop or /shop/
  if (to.path === '/shop' || to.path === '/shop/') {
    return navigateTo('/', { redirectCode: 301 })
  }

  // /shop/*  -> /*   (preserve query)
  if (to.path.startsWith('/shop/')) {
    const target = to.fullPath.replace(/^\/shop/, '')
    return navigateTo(target, { redirectCode: 301 })
  }
})
