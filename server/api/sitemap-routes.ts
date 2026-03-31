// server/api/sitemap-routes.ts

// 1. Change to defineCachedEventHandler
export default defineCachedEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const baseUrl = config.apiBaseUrl || 'https://dev-srv.tlkeys.com/api';
    const targetUrl = `${baseUrl}/sitemap-data`;
    const extraLocales = ['ar', 'es', 'fr', 'ru', 'de', 'tr', 'pt', 'it'];

    console.log(`🔌 [Proxy] Fetching English sitemap from: ${targetUrl}`);

    try {
        const englishData = await $fetch(targetUrl, {
            responseType: 'json',
            timeout: 25000,
            headers: {
                'Accept': 'application/json',
                'api-key': config.apiKey,
                'secret-key': config.secretKey
            }
        });

        if (!Array.isArray(englishData)) {
            console.error('❌ [Proxy] Error: API returned invalid data.');
            return [];
        }

        console.log(`✅ [Proxy] Received ${englishData.length} English URLs. Generating other languages...`);

        let finalUrls = [...englishData];

        englishData.forEach(item => {
            if (item.loc) {
                const originalLoc = item.loc.startsWith('/') ? item.loc : `/${item.loc}`;
                extraLocales.forEach(lang => {
                    finalUrls.push({
                        ...item,
                        loc: `/${lang}${originalLoc}`
                    });
                });
            }
        });

        console.log(`🚀 [Proxy] DONE! Sending ${finalUrls.length} total URLs to Nuxt.`);
        return finalUrls;

    } catch (err) {
        console.error('❌ [Proxy] Failed to fetch sitemap:', err);
        return [];
    }
}, {
    // 2. Add Cache Configuration Here
    maxAge: 60 * 60 * 24, // Cache for 24 hours (in seconds)
    swr: true, // Stale-while-revalidate (serves old cache immediately while fetching new data in background)
    getKey: () => 'sitemap-urls' // Forces a single static cache key for all requests
});