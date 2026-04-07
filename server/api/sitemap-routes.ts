export default defineCachedEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const query = getQuery(event)
    const lang = (query.lang as string) || 'en'

    let baseData: any[] = []

    try {
        baseData = await $fetch<any[]>(`${config.apiBaseUrl}/sitemap-data`, {
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'api-key': config.apiKey,
                'secret-key': config.secretKey,
            }
        })
    } catch (err) {
        console.error(`[sitemap] Failed to fetch base data:`, err)
        return []
    }

    if (!Array.isArray(baseData) || baseData.length === 0) return []

    // English uses slugs as-is
    if (lang === 'en') return baseData

    // All other languages just prefix the loc — no extra DB call needed
    return baseData.map(item => ({
        ...item,
        loc: `/${lang}${item.loc.startsWith('/') ? item.loc : `/${item.loc}`}`
    }))

}, {
    maxAge: 60 * 60 * 24, // 24 hours
    swr: true,
    name: 'sitemap-routes',
    getKey: (event) => {
        const query = getQuery(event)
        return `sitemap-urls-${query.lang || 'en'}`
    }
})