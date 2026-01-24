// server/api/sitemap-routes.ts

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const baseUrl = config.apiBaseUrl || 'https://dev-srv.tlkeys.com/api';
    const targetUrl = `${baseUrl}/sitemap-data`;

    // 1. Define your extra languages (Exclude 'en' because it's default)
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

        // 2. CREATE THE MASTER LIST
        // We start with the English list, then loop and add the others.
        let finalUrls = [...englishData];

        englishData.forEach(item => {
            // Check if item has a valid 'loc' (URL)
            if (item.loc) {
                // For each extra language, create a new entry
                extraLocales.forEach(lang => {
                    // Create a copy of the item
                    const newItem = { ...item };

                    // Add the language prefix (e.g., "/products/key" -> "/tr/products/key")
                    // Note: Ensure we handle the slash correctly
                    const originalLoc = item.loc.startsWith('/') ? item.loc : `/${item.loc}`;
                    newItem.loc = `/${lang}${originalLoc}`;

                    // Add to the final list
                    finalUrls.push(newItem);
                });
            }
        });

        console.log(`🚀 [Proxy] DONE! Sending ${finalUrls.length} total URLs to Nuxt.`);
        return finalUrls;

    } catch (err) {
        console.error('❌ [Proxy] Failed to fetch sitemap:', err);
        return [];
    }
});