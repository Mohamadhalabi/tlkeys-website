export default defineCachedEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const baseUrl = config.apiBaseUrl || 'https://dev-srv.tlkeys.com/api';
    const targetUrl = `${baseUrl}/sitemap-data`;

    console.log(`🔌 [Proxy] Fetching base sitemap from: ${targetUrl}`);

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

        // We removed the 9x manual duplication here! 
        // Returning 5,700 items instead of 51,000 saves massive RAM/CPU.
        // The Nuxt module's `autoI18n: true` will handle translations automatically.
        console.log(`🚀 [Proxy] DONE! Sending ${baseData.length} base URLs to Nuxt.`);
        return baseData;

    } catch (err) {
        console.error('❌ [Proxy] Failed to fetch sitemap:', err);
        return [];
    }
}, {
    maxAge: 60 * 60 * 24, // Cache for 24 hours
    swr: true, // Stale-while-revalidate 
    getKey: () => 'sitemap-urls-base' // Static cache key
});