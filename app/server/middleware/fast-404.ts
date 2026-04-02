export default defineEventHandler((event) => {
    const url = event.node.req.url;

    // If there's no URL, just continue
    if (!url) return;

    // We want to instantly block requests for common static extensions
    // that don't exist, EXCEPT for the sitemap which we need to render.
    if (url.match(/\.(php|jpg|jpeg|png|gif|pdf|env|txt|sql|zip|json)$/i)) {

        // Let sitemaps and Nuxt build meta JSONs pass through
        if (url.includes('sitemap') || url.includes('/_nuxt/')) {
            return;
        }

        // Instantly return a raw 404 without booting up Vue SSR
        setResponseStatus(event, 410);
        return 'Gone';
    }
});