<template>
  <main class="terms-page">
    <!-- Breadcrumb -->
    <nav aria-label="breadcrumb">
      <div class="mx-auto max-w-7xl px-4">
        <ol class="flex items-center gap-2 py-3 text-sm text-gray-600">
          <li>
            <NuxtLink :to="localePath('/')" class="hover:text-gray-900 underline-offset-2 hover:underline">
              {{ t('shop.home') }}
            </NuxtLink>
          </li>
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium">
            {{ t('terms.title') }}
          </li>
        </ol>
      </div>
    </nav>

    <!-- Content -->
    <section class="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
        {{ t('terms.title') }}
      </h1>

      <div class="prose prose-neutral max-w-none mt-6 md:mt-8">
        <h3 class="!mt-8">{{ t('terms.definition') }}</h3>
        <p class="text-gray-700">{{ t('terms.theseTerms') }}</p>

        <h3 class="!mt-8">{{ t('terms.acceptanceTerms') }}</h3>
        <p class="text-gray-700">{{ t('terms.byUsing') }}</p>

        <h3 class="!mt-8">{{ t('terms.services') }}</h3>
        <p class="text-gray-700">{{ t('terms.ourWebsite') }}</p>

        <h3 class="!mt-8">{{ t('terms.userAccount') }}</h3>
        <ul class="list-disc pl-6 text-gray-700 space-y-2">
          <li>{{ t('terms.youMayNeed') }}</li>
          <li>{{ t('terms.youAre') }}</li>
          <li>{{ t('terms.youMust') }}</li>
        </ul>

        <h3 class="!mt-8">{{ t('terms.purchase') }}</h3>
        <ul class="list-disc pl-6 text-gray-700 space-y-2">
          <li>{{ t('terms.whenMaking') }}</li>
          <li>{{ t('terms.allSales') }}</li>
          <li>{{ t('terms.prices') }}</li>
        </ul>

        <h3 class="!mt-8">{{ t('terms.intellectual') }}</h3>
        <ul class="list-disc pl-6 text-gray-700 space-y-2">
          <li>{{ t('terms.allContent') }}</li>
          <li>{{ t('terms.YouMayNot') }}</li>
        </ul>

        <h3 class="!mt-8">{{ t('terms.privacy') }}</h3>
        <ul class="list-disc pl-6 text-gray-700 space-y-2">
          <li>{{ t('terms.weCollect') }}</li>
          <li>{{ t('terms.ByUsing') }}</li>
        </ul>

        <h3 class="!mt-8">{{ t('terms.Contact') }}</h3>
        <p class="text-gray-700">
          {{ t('terms.IfYouHave') }}
          <a :href="`mailto:${email}`" class="text-blue-600 hover:underline">{{ t('terms.email') }}</a>.
        </p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

/* ---- Constants ---- */
const baseUrl = 'https://www.tlkeys.com'
const canonical = `${baseUrl}/terms`
const siteName = 'Techno Lock Keys'
const ogImage = 'httphttps://www.tlkeys.com/images/og-image.jpg'
const logoUrl = 'https://www.tlkeys.com/images/logo/techno-lock-desktop-logo.webp'
const email = 'info@tlkeys.com'
const phone = '+971504429045'

/* ---- SEO Meta ---- */
useSeoMeta({
  title: t('terms.seoTitle'),
  description: t('terms.seoDescription'),
  ogType: 'website',
  ogSiteName: siteName,
  ogTitle: t('terms.ogTitle'),
  ogDescription: t('terms.ogDescription'),
  ogUrl: canonical,
  ogImage,
  twitterCard: 'summary_large_image'
})

/* ---- JSON-LD (no children; inject via innerHTML) ---- */
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: `${baseUrl}/`,
  image: logoUrl,
  description: t('terms.ogDescription'),
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Industrial No. 5, behind Maliah Road., shop No. 8',
    addressCountry: 'AE'
  },
  telephone: phone,
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
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

/* ---- Head ---- */
useHead({
  htmlAttrs: { lang: locale.value },
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    { key: 'org-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(orgJsonLd) },
    { key: 'logo-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(logoJsonLd) }
  ]
})
</script>
