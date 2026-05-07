// server/middleware/fast-404.ts
export default defineEventHandler((event) => {
    // SWR Crash Protection
    if (event.node.res.headersSent) return;

    const url = event.node.req.url;

    // If there's no URL, just continue
    if (!url) return;

    // Block requests for common static extensions that don't exist
    if (url.match(/\.(php|jpg|jpeg|png|gif|pdf|env|txt|sql|zip|json|mp4|webp|ico)$/i)) {

        // ---> THE FIX: Added '/_ipx/' to the safe list so Nuxt Image works <---
        if (url.includes('sitemap') || url.includes('/_nuxt/') || url.includes('/_ipx/')) {
            return;
        }

        // Instantly return a raw 410 without booting up Vue SSR
        setResponseStatus(event, 410);
        return 'Gone';
    }
});