// middleware/redirect-shop.js
export default defineNuxtRouteMiddleware((to, from) => {
  const segments = to.path.split('/').filter(Boolean);
  if (segments[0] === 'shop' && segments.length === 2) {
    return navigateTo(`/${segments[1]}`, { redirectCode: 301, replace: true });
  }
});