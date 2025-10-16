// middleware/redirect-shop.js
export default defineNuxtRouteMiddleware((to, from) => {
  console.log('Middleware triggered for path:', to.path); // Debug log
  const segments = to.path.split('/').filter(Boolean);
  if (segments[0] === 'shop' && segments.length === 2) {
    console.log('Redirecting to:', `/${segments[1]}`); // Debug log
    return navigateTo(`/${segments[1]}`, { redirectCode: 301, replace: true });
  }
});