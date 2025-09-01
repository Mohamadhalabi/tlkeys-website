// // app/plugins/seo-defaults.ts
// export default defineNuxtPlugin(() => {
//   const { public: pub } = useRuntimeConfig()
//   const route = useRoute()

//   // canonical for every route (pages can override)
//   const canonical = computed(() => {
//     try {
//       return new URL(route.fullPath, pub.siteUrl).toString()
//     } catch {
//       return pub.siteUrl
//     }
//   })

//   useHead({
//     link: [{ rel: 'canonical', href: canonical.value }]
//   })

//   // global OG/Twitter fallbacks (pages can override with useSeoMeta)
//   useSeoMeta({
//     ogSiteName: pub.siteName,
//     ogType: 'website',
//     ogImage: pub.defaultOgImage,
//     twitterCard: 'summary_large_image',
//     twitterImage: pub.defaultOgImage,
//     description: pub.defaultDescription,
//     ogDescription: pub.defaultDescription
//   })
// })
