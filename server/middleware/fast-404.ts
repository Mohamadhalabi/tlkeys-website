// server/middleware/fast-404.ts
export default defineEventHandler((event) => {
    if (event.node.res.headersSent) return;

    const url = event.node.req.url;
    if (!url) return;

    if (url.match(/\.(php|jpg|jpeg|png|gif|pdf|env|txt|sql|zip|json|mp4|webp|ico)$/i)) {

        // ADD url.includes('/_i18n/') HERE
        if (
            url.includes('sitemap') ||
            url.includes('/_nuxt/') ||
            url.includes('/_ipx/') ||
            url.includes('/_i18n/')
        ) {
            return;
        }

        setResponseStatus(event, 410);
        return 'Gone';
    }
});