// server/api/sitemap-routes.ts

export default defineEventHandler(async (event) => {
    // 1. Load the Secure Configuration
    const config = useRuntimeConfig();

    // 2. Get the Base URL (fallback to hardcoded if env missing)
    const baseUrl = config.apiBaseUrl || 'https://dev-srv.tlkeys.com/api';
    const targetUrl = `${baseUrl}/sitemap-data`;

    console.log(`🔌 [Proxy] Fetching sitemap from: ${targetUrl}`);

    try {
        const data = await $fetch(targetUrl, {
            responseType: 'json',
            timeout: 25000,
            headers: {
                'Accept': 'application/json',
                // 3. Use the Secure Keys from Config
                'api-key': config.apiKey,
                'secret-key': config.secretKey
            }
        });

        if (!Array.isArray(data)) {
            console.error('❌ [Proxy] Error: API returned valid JSON but not an array.');
            return [];
        }

        console.log(`✅ [Proxy] Success! Retrieved ${data.length} URLs.`);
        return data;

    } catch (err) {
        console.error('❌ [Proxy] Failed to fetch sitemap:', err);
        return [];
    }
});