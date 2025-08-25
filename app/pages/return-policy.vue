<template>
  <main class="return-page">
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
            {{ t('return.short_title') }}
          </li>
        </ol>
      </div>
    </nav>

    <!-- Content -->
    <section class="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
        {{ t('return.title') }}
      </h1>

      <p class="mt-4 text-red-600 font-medium">
        {{ t('return.note') }}
      </p>

      <div class="prose prose-neutral max-w-none mt-6 md:mt-8">
        <h3 class="!mt-8">{{ t('return.eligibility') }}</h3>
        <ul class="list-disc pl-6 text-gray-700 space-y-2">
          <li>{{ t('return.yourItem') }}</li>
          <li>{{ t('return.TheItem') }}</li>
          <li>{{ t('return.ToComplete') }}</li>
          <li>{{ t('return.IfYou') }}</li>
        </ul>

        <h3 class="!mt-8">{{ t('return.Partial') }}</h3>
        <ul class="list-disc pl-6 text-gray-700 space-y-2">
          <li>{{ t('return.anyItem') }}</li>
          <li>{{ t('return.anyItemThat') }}</li>
          <li>{{ t('return.onceYour') }}</li>
          <li>{{ t('return.WeWill') }}</li>
          <li>{{ t('return.IfYouAre') }}</li>
        </ul>

        <h3 class="!mt-8">{{ t('return.LateOr') }}</h3>
        <p class="text-gray-700">{{ t('return.ifYouHave') }}</p>
        <p class="text-gray-700">{{ t('return.ifyouhavedone') }}</p>

        <h3 class="!mt-8">{{ t('return.nonexchangable') }}</h3>
        <ul class="list-disc pl-6 text-gray-700 space-y-2">
          <li>{{ t('return.damageorabused') }}</li>
          <li>{{ t('return.ifthecustomer') }}</li>
          <li>{{ t('return.itemscanbe') }}</li>
        </ul>

        <h3 class="!mt-8">{{ t('return.Shipping') }}</h3>
        <p class="text-gray-700">{{ t('return.dependingon') }}</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

/* ---- Constants ---- */
const baseUrl = 'https://www.tlkeys.com'
const canonical = `${baseUrl}/return-policy`
const siteName = 'Techno Lock Keys'
const ogImage = 'https://dev-srv.tlkeys.com/storage/images/seo/og-image.jpg'
const logoUrl = 'https://www.tlkeys.com/tlk-logo.png'
const email = 'info@tlkeys.com'
const phone = '+971504429045'

/* ---- SEO Meta ---- */
useSeoMeta({
  title: t('return.seoTitle'),
  description: t('return.seoDescription'),
  ogType: 'website',
  ogSiteName: siteName,
  ogTitle: t('return.ogTitle'),
  ogDescription: t('return.ogDescription'),
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
  description: t('return.ogDescription'),
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Industrial No. 5, behind Maliah Road., shop No. 8',
    addressCountry: 'AE'
  },
  telephone: phone,
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'],
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
