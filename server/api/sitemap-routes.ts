// server/api/sitemap-routes.ts

export default defineEventHandler(async (event) => {
    // 1. Load the Secure Configuration from server runtime (private)
    const config = useRuntimeConfig();

    // 2. Get the Base URL
    const baseUrl = config.apiBaseUrl || 'https://dev-srv.tlkeys.com/api';
    const targetUrl = `${baseUrl}/sitemap-data`;

    // 3. Define your extra languages (Exclude 'en' because it's default)
    const extraLocales = ['ar', 'es', 'fr', 'ru', 'de', 'tr', 'pt', 'it'];

    console.log(`🔌 [Proxy] Fetching English sitemap from: ${targetUrl}`);

    try {
        // 4. Fetch the data using the PRIVATE keys (config.apiKey)
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

        // 5. MASTER LOOP: Create entries for ALL languages manually
        let finalUrls = [...englishData];

        englishData.forEach(item => {
            if (item.loc) {
                // Fix slash if missing
                const originalLoc = item.loc.startsWith('/') ? item.loc : `/${item.loc}`;

                // Create a duplicate for every extra language
                extraLocales.forEach(lang => {
                    finalUrls.push({
                        ...item,
                        loc: `/${lang}${originalLoc}` // e.g., /tr/products/key-123
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
});