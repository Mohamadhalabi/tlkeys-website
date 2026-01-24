// server/api/sitemap-routes.ts
export default defineEventHandler(async (event) => {
    // 1. The Production URL
    const targetUrl = 'https://dev-srv.tlkeys.com/api/sitemap-data';

    console.log(`🔌 [Proxy] Fetching sitemap from: ${targetUrl}`);

    try {
        // 2. Fetch from Laravel with your Headers
        const data = await $fetch(targetUrl, {
            responseType: 'json',
            timeout: 25000, // 25 seconds
            headers: {
                'Accept': 'application/json',
                // 👇 COPY YOUR KEYS HERE EXACTLY AS YOU HAD THEM
                'api-key': process.env.API_KEY || '51fye5kzrx4xrakdrx3v9id4klp...',
                'secret-key': process.env.SECRET_KEY || '51lFyE6KzRX4XRAIDiopW1HXpX...'
            }
        });

        // 3. Safety Check
        if (!Array.isArray(data)) {
            console.error('❌ [Proxy] Error: Laravel returned valid JSON but not an array.');
            return [];
        }

        console.log(`✅ [Proxy] Success! Retrieved ${data.length} URLs.`);
        return data;

    } catch (err) {
        console.error('❌ [Proxy] Failed to fetch from Laravel:', err);
        return []; // Return empty array so Nuxt doesn't crash
    }
});