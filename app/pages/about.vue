<template>
  <main class="about-page relative container">
    <!-- Breadcrumb -->
    <nav aria-label="breadcrumb">
      <div class="mx-auto max-w-7xl px-4">
        <ol class="flex items-center gap-2 py-3 text-sm text-gray-600">
          <li>
            <NuxtLinkLocale :to="localePath('/')" class="hover:text-gray-900 underline-offset-2 hover:underline">
              {{ t('header.home') }}
            </NuxtLinkLocale>
          </li>
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium" aria-current="page">
            {{ t('common.aboutUs') }}
          </li>
        </ol>
      </div>
    </nav>

    <!-- Intro -->
    <section class="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div class="flex flex-col-reverse lg:flex-row items-center gap-10">
        <div class="w-full lg:w-7/12">
          <p class="text-sm tracking-wide uppercase text-orange-600 font-semibold">
            {{ t('about.aboutTechnoLock') }}
          </p>
          <h1 class="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            {{ t('about.creativeTeam') }}
          </h1>
          <div class="mt-5 space-y-4 text-gray-700 leading-relaxed">
            <p>{{ t('about.securedBusiness') }}</p>
            <p>{{ t('about.WasEstablished') }}</p>
            <p>{{ t('about.hasBeenStriving') }}</p>
          </div>
          <div class="mt-8">
            <NuxtLinkLocale
              :to="localePath('/contact')"
              class="inline-flex items-center justify-center rounded-2xl border border-orange-200 bg-white px-5 py-3 text-sm font-medium text-orange-700 hover:bg-orange-50 hover:border-orange-300 transition"
            >
              {{ t('about.contactUs') }}
            </NuxtLinkLocale>
          </div>
        </div>

        <div class="w-full lg:w-5/12">
          <NuxtImg
            src="/images/about-us/about-us-1.jpg"
            format="webp"
            alt="Techno Lock Keys — About us"
            class="rounded-2xl shadow-sm w-full h-auto object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>

    <!-- Future Goals -->
    <section class="mx-auto max-w-7xl px-4 py-12 md:py-16">
      <div class="flex flex-col lg:flex-row items-center gap-10">
        <div class="w-full lg:w-7/12 order-2 lg:order-1">
          <p class="text-sm tracking-wide uppercase text-orange-600 font-semibold">
            {{ t('about.futureGoal') }}
          </p>
          <h2 class="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            {{ t('about.weWantToLead') }}
          </h2>
          <div class="mt-5 space-y-4 text-gray-700 leading-relaxed">
            <p>{{ t('about.increaseMarket') }}</p>
            <p>{{ t('about.improveCustomer') }}</p>
            <p>{{ t('about.streamline') }}</p>
            <p>{{ t('about.imlpementEco') }}</p>
            <p>{{ t('about.FosterApostive') }}</p>
          </div>
        </div>

        <div class="w-full lg:w-5/12 order-1 lg:order-2">
          <NuxtImg
            src="/images/about-us/about-us-2.jpg"
            format="webp"
            alt="Our future goals"
            class="rounded-2xl shadow-sm w-full h-auto object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>

    <!-- What we offer -->
    <section class="bg-gray-50 border-t">
      <div class="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div class="max-w-3xl">
          <p class="text-sm tracking-wide uppercase text-orange-600 font-semibold">
            {{ t('about.whatweoffer') }}
          </p>
          <h2 class="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            {{ t('about.ourComprehensive') }}
          </h2>
        </div>

        <div class="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <article class="rounded-2xl bg-white border shadow-sm p-6">
            <h3 class="text-lg font-bold text-gray-900">{{ t('about.veryConvinent') }}</h3>
            <p class="mt-2 text-gray-700">{{ t('about.ourCompanyOffer') }}</p>
          </article>

          <article class="rounded-2xl bg-white border shadow-sm p-6">
            <h3 class="text-lg font-bold text-gray-900">{{ t('about.keyprogramming') }}</h3>
            <p class="mt-2 text-gray-700">{{ t('about.weAreSpecialist') }}</p>
          </article>

          <article class="rounded-2xl bg-white border shadow-sm p-6">
            <h3 class="text-lg font-bold text-gray-900">{{ t('about.carKey') }}</h3>
            <p class="mt-2 text-gray-700">{{ t('about.weHaveTheExperience') }}</p>
          </article>

          <article class="rounded-2xl bg-white border shadow-sm p-6">
            <h3 class="text-lg font-bold text-gray-900">{{ t('about.lostKey') }}</h3>
            <p class="mt-2 text-gray-700">{{ t('about.ifYouHave') }}</p>
          </article>

          <article class="rounded-2xl bg-white border shadow-sm p-6">
            <h3 class="text-lg font-bold text-gray-900">{{ t('about.softwareUpdate') }}</h3>
            <p class="mt-2 text-gray-700">{{ t('about.weOfferSoftware') }}</p>
          </article>

          <article class="rounded-2xl bg-white border shadow-sm p-6">
            <h3 class="text-lg font-bold text-gray-900">{{ t('about.support') }}</h3>
            <p class="mt-2 text-gray-700">{{ t('about.weOfferSupport') }}</p>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
const { t, locale } = useI18n()

// SEO
const siteName = 'Techno Lock Keys'
const canonical = 'https://www.tlkeys.com/about'
const baseUrl = 'https://www.tlkeys.com'
const ogImage = 'https://dev-srv.tlkeys.com/storage/images/seo/og-image.jpg'
const logoUrl = 'https://www.tlkeys.com/tlk-logo.png'

useSeoMeta({
  title: t('about.seoTitle'),
  description: t('about.seoDescription'),
  ogType: 'website',
  ogSiteName: siteName,
  ogTitle: t('about.ogTitle'),
  ogDescription: t('about.ogDescription'),
  ogUrl: canonical, // use canonical here
  ogImage,
  twitterCard: 'summary_large_image'
})

// ---------- JSON-LD objects (no children; we use innerHTML) ----------
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: `${baseUrl}/`,
  image: logoUrl,
  description: t('about.ogDescription'),
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Industrial No. 5, behind Maliah Road., shop No. 8',
    addressCountry: 'AE'
  },
  telephone: '+971504429045',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Saturday','Sunday'],
      opens: '08:00',
      closes: '18:00'
    }
  ],
  priceRange: '$$',
  paymentAccepted: 'Cash, Credit Card, Paypal',
  sameAs: [
    'https://www.facebook.com/technolockkeys_world/',
    'https://twitter.com/techno_lock',
    'https://api.whatsapp.com/send?phone=971504429045'
  ]
}

const logoJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  url: baseUrl,
  logo: logoUrl
}

useHead({
  htmlAttrs: { lang: locale.value },
  link: [{ rel: 'canonical', href: canonical }],
  meta: [{ 'http-equiv': 'content-language', content: locale.value }],
  script: [
    { key: 'org-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(orgJsonLd) },
    { key: 'logo-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(logoJsonLd) }
  ]
})
</script>

<style scoped>
/* Namespaced wrapper to avoid legacy/global collisions if any exist */
.about-page { display: block; }
</style>