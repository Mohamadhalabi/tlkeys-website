<template>
  <main class="privacy-page">
    <!-- Breadcrumb -->
    <nav aria-label="breadcrumb">
      <div class="mx-auto max-w-7xl px-4">
        <ol class="flex items-center gap-2 py-3 text-sm text-gray-600">
          <li>
            <NuxtLink to="/" class="hover:text-gray-900 underline-offset-2 hover:underline">
              {{ t('shop.home') }}
            </NuxtLink>
          </li>
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium">
            {{ t('privacypolicy.title') }}
          </li>
        </ol>
      </div>
    </nav>

    <!-- Content -->
    <section class="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
        {{ t('privacypolicy.title') }}
      </h1>

      <div class="mt-6 md:mt-8 space-y-4 text-base leading-7 text-gray-700">
        <p>{{ t('privacypolicy.creditDebit') }}</p>

        <p>
          {{ t('privacypolicy.websitePolicies') }}
          <NuxtLinkLocale :to="('/terms')" class="text-blue-600 hover:underline">
            {{ t('privacypolicy.TermsAndConditions') }}
          </NuxtLinkLocale>
          {{ t('privacypolicy.mayBeChanged') }}<br />
          {{ t('privacypolicy.therfore') }}<br />
          {{ t('privacypolicy.modifications') }}
        </p>

        <p>
          {{ t('privacypolicy.someOfTheAd') }}<br />
          {{ t('privacypolicy.thirdParties') }}<br />
          {{ t('privacypolicy.pleaseRemember') }}<br />
          {{ t('privacypolicy.theInformation') }}
        </p>

        <p>{{ t('privacypolicy.weRespect') }}</p>

        <p>{{ t('privacypolicy.theinfocollected') }}</p>

        <p>{{ t('privacypolicy.weDontShare') }}</p>

        <p>{{ t('privacypolicy.wePrioritize') }}</p>

        <p>
          {{ t('privacypolicy.at') }}
          <NuxtLinkLocale :to="('/')" class="text-blue-600 hover:underline">tlkeys.com</NuxtLinkLocale>,
          {{ t('privacypolicy.WeAre') }}
        </p>

        <p>{{ t('privacypolicy.weEncourage') }}</p>

        <p>
          {{ t('privacypolicy.PleasebeAware') }}
          <NuxtLinkLocale :to="('/')" class="text-blue-600 hover:underline">tlkeys.com</NuxtLinkLocale>
          {{ t('privacypolicy.mayContain') }}
        </p>

        <p>{{ t('privacypolicy.WhenYouAccess') }}</p>

        <p>{{ t('privacypolicy.ifyouchoose') }}</p>

        <p>
          {{ t('privacypolicy.yourPrivacy') }}
          <NuxtLinkLocale :to="('/')" class="text-blue-600 hover:underline">tlkeys.com</NuxtLinkLocale>,
          {{ t('privacypolicy.doNotHesitate') }}
          <NuxtLinkLocale :to="('/contact')" class="text-blue-600 hover:underline">
            {{ t('privacypolicy.contactUs') }}
          </NuxtLinkLocale>.
          {{ t('privacypolicy.ThankYouFor') }}
        </p>

        <p>
          {{ t('privacypolicy.ifYouHaveAny') }}
          <NuxtLinkLocale :to="('/contact')" class="text-blue-600 hover:underline">
            {{ t('privacypolicy.contactUs') }}
          </NuxtLinkLocale>
          {{ t('privacypolicy.viaThe') }}
          <a :href="`mailto:${email}`" class="text-blue-600 hover:underline">{{ t('privacypolicy.email') }}</a>
          {{ t('privacypolicy.or') }}
          <a :href="`tel:${phone}`" class="text-blue-600 hover:underline">{{ t('privacypolicy.phoneNumber') }}</a>.
        </p>

        <p>{{ t('privacypolicy.trust') }}</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

/* ---- Constants ---- */
const baseUrl = 'https://www.tlkeys.com'
const canonical = `${baseUrl}/privacy-policy`
const siteName = 'Techno Lock Keys'
const ogImage = 'https://dev-srv.tlkeys.com/storage/images/seo/og-image.jpg'
const logoUrl = 'https://www.tlkeys.com/tlk-logo.png'
const email = 'info@tlkeys.com'
const phone = '+971504429045'

/* ---- SEO Meta ---- */
useSeoMeta({
  title: t('privacypolicy.seoTitle'),
  description: t('privacypolicy.seoDescription'),
  ogType: 'website',
  ogSiteName: siteName,
  ogTitle: t('privacypolicy.ogTitle'),
  ogDescription: t('privacypolicy.ogDescription'),
  ogUrl: canonical,
  ogImage,
  twitterCard: 'summary_large_image'
})

/* ---- JSON-LD (without children) ---- */
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: `${baseUrl}/`,
  image: logoUrl,
  description: t('privacypolicy.ogDescription'),
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

/* ---- Head (note: use innerHTML, not children) ---- */
useHead({
  htmlAttrs: { lang: locale.value },
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    { key: 'org-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(orgJsonLd) },
    { key: 'logo-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(logoJsonLd) }
  ]
})
</script>