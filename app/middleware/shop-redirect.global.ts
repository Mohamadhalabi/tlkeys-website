// middleware/redirect-shop.js
export default defineNuxtRouteMiddleware((to, from) => {
  // Check if the path starts with /shop/ and has a segment after it
  const segments = to.path.split('/').filter(Boolean); // Split and remove empty segments
  if (segments[0] === 'shop' && segments.length === 2) {
    // Redirect to /xhorse (or whatever the second segment is)
    return navigateTo(`/${segments[1]}`, { redirectCode: 301 });
  }
});