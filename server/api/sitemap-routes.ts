// server/api/sitemap-routes.ts

export default defineCachedEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const baseUrl = config.apiBaseUrl || 'https://dev-srv.tlkeys.com/api';
    const targetUrl = `${baseUrl}/sitemap-data`;

    // 1. Get the language from the query parameter (defaults to 'en')
    const query = getQuery(event);
    const lang = (query.lang as string) || 'en';

    console.log(`🔌 [Proxy] Fetching base sitemap data for lang: ${lang}`);

    try {
        const baseData = await $fetch(targetUrl, {
            responseType: 'json',
            timeout: 25000,
            headers: {
                'Accept': 'application/json',
                'api-key': config.apiKey,
                'secret-key': config.secretKey
            }
        });

        if (!Array.isArray(baseData)) {
            console.error('❌ [Proxy] Error: API returned invalid data.');
            return [];
        }

        // 2. If English, return the base URLs exactly as they are
        if (lang === 'en') {
            console.log(`🚀 [Proxy] DONE! Sending ${baseData.length} URLs for EN.`);
            return baseData;
        }

        // 3. If another language, safely map the prefix onto the URLs
        const localizedData = baseData.map(item => {
            const originalLoc = item.loc.startsWith('/') ? item.loc : `/${item.loc}`;
            return {
                ...item,
                loc: `/${lang}${originalLoc}`
            };
        });

        console.log(`🚀 [Proxy] DONE! Sending ${localizedData.length} URLs for ${lang.toUpperCase()}.`);
        return localizedData;

    } catch (err) {
        console.error(`❌ [Proxy] Failed to fetch sitemap for ${lang}:`, err);
        return [];
    }
}, {
    maxAge: 60 * 60 * 24, // Cache the API response for 24 hours
    swr: true,
    // Ensure the cache key is unique per language so /ar doesn't serve /en data
    getKey: (event) => {
        const query = getQuery(event);
        return `sitemap-urls-${query.lang || 'en'}`;
    }
});