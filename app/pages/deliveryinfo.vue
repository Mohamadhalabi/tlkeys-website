<template>
  <main class="deliveryinfo-page">
    <!-- Breadcrumb -->
    <nav aria-label="breadcrumb">
      <div class="mx-auto max-w-7xl px-4">
        <ol class="flex items-center gap-2 py-3 text-sm text-gray-600">
          <li>
            <NuxtLinkLocale :to="localePath('/')" class="hover:text-gray-900 underline-offset-2 hover:underline">
              {{ t('shop.home') }}
            </NuxtLinkLocale>
          </li>
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium">
            {{ t('deliveryinfo.DeliveryInfo') }}
          </li>
        </ol>
      </div>
    </nav>

    <!-- Content -->
    <section class="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
        {{ t('deliveryinfo.DeliveryInfo') }}
      </h1>

      <div class="mt-6 md:mt-8 space-y-8 text-gray-700">
        <!-- Add to cart -->
        <section>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            {{ t('deliveryinfo.addToCart') }}
          </h2>
          <p class="leading-7">
            {{ t('deliveryinfo.firstStep') }}
          </p>
        </section>

        <!-- Processing -->
        <section>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            {{ t('deliveryinfo.processing') }}
          </h2>
          <p class="leading-7">
            {{ t('deliveryinfo.itTakes') }}
          </p>
        </section>

        <!-- Shipping -->
        <section>
          <h2 class="text-2xl font-bold text-gray-900 mb-3">
            {{ t('deliveryinfo.shipping') }}
          </h2>
          <ul class="list-disc pl-6 space-y-2 leading-7">
            <li>{{ t('deliveryinfo.shippingTime') }}</li>
            <li>{{ t('deliveryinfo.emailShipping') }}</li>
            <li>{{ t('deliveryinfo.makeSure') }}</li>
            <li>{{ t('deliveryinfo.pleaseNote') }}</li>
          </ul>
        </section>

        <!-- Shipping process -->
        <section>
          <h3 class="text-xl font-bold text-gray-900 mb-3">
            {{ t('deliveryinfo.ShippingProcess') }}
          </h3>

          <div class="space-y-5">
            <div>
              <h4 class="font-semibold text-gray-900">{{ t('deliveryinfo.OrderConfirmation') }}:</h4>
              <p class="leading-7">{{ t('deliveryinfo.storeVerify') }}</p>
            </div>

            <div>
              <h4 class="font-semibold text-gray-900">{{ t('deliveryinfo.Packaging') }}:</h4>
              <p class="leading-7">{{ t('deliveryinfo.packed') }}</p>
            </div>

            <div>
              <h4 class="font-semibold text-gray-900">{{ t('deliveryinfo.shippingService') }}</h4>
              <p class="leading-7">{{ t('deliveryinfo.reliable') }}</p>
            </div>

            <div>
              <h4 class="font-semibold text-gray-900">{{ t('deliveryinfo.shippmentTracking') }}</h4>
              <p class="leading-7">{{ t('deliveryinfo.customers') }}</p>
            </div>

            <div>
              <h4 class="font-semibold text-gray-900">{{ t('deliveryinfo.reciept') }}</h4>
              <p class="leading-7">{{ t('deliveryinfo.mustVerify') }}</p>
            </div>

            <div>
              <h4 class="font-semibold text-gray-900">{{ t('deliveryinfo.addressingIssue') }}:</h4>
              <p class="leading-7">{{ t('deliveryinfo.InCase') }}</p>
            </div>
          </div>
        </section>

        <!-- Delivery -->
        <section>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            {{ t('deliveryinfo.Delivery') }}
          </h2>
          <p class="leading-7">{{ t('deliveryinfo.youWill') }}</p>
          <p class="leading-7 mt-2">{{ t('deliveryinfo.weAreComitted') }}</p>
        </section>

        <!-- Fees -->
        <section>
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            {{ t('deliveryinfo.deliveryFees') }}
          </h3>
          <p class="leading-7">{{ t('deliveryinfo.OnlineStore') }}</p>
        </section>

        <!-- Free delivery -->
        <section>
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            {{ t('deliveryinfo.freeDelivery') }}
          </h3>
          <p class="leading-7">{{ t('deliveryinfo.theStoreMight') }}</p>
          <p class="leading-7 mt-2">{{ t('deliveryinfo.toFindOut') }}</p>
        </section>

        <!-- Delivery time -->
        <section>
          <h3 class="text-xl font-bold text-gray-900 mb-3">
            {{ t('deliveryinfo.deliveryTime') }}
          </h3>

          <h4 class="font-semibold text-gray-900">{{ t('deliveryinfo.localDelivery') }}</h4>
          <p class="leading-7">{{ t('deliveryinfo.localDeliveryTime') }}</p>

          <h4 class="font-semibold text-gray-900 mt-4">{{ t('deliveryinfo.internationalDelivery') }}</h4>
          <p class="leading-7">{{ t('deliveryinfo.internationalDeliveryTime') }}</p>
        </section>

        <!-- Notes -->
        <section class="space-y-2">
          <p class="leading-7">{{ t('deliveryinfo.PleaseNote') }}</p>
          <p class="leading-7">{{ t('deliveryinfo.checkSpam') }}</p>
          <p class="leading-7">
            <a href="https://www.tlkeys.com" class="text-orange-700 hover:underline">tlkeys.com</a>
            {{ t('deliveryinfo.willNot') }}
          </p>
          <p class="leading-7">{{ t('deliveryinfo.ifYouHaveAnyQuestion') }}</p>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

const baseUrl = 'https://www.tlkeys.com'
const canonical = `${baseUrl}/deliveryinfo`
const siteName = 'Techno Lock Keys'
const ogImage = 'https://dev-srv.tlkeys.com/storage/images/seo/og-image.jpg'
const logoUrl = 'https://www.tlkeys.com/images/logo/techno-lock-desktop-logo.webp'

useSeoMeta({
  title: t('deliveryinfo.seoTitle'),
  description: t('deliveryinfo.seoDescription'),
  ogType: 'website',
  ogSiteName: siteName,
  ogTitle: t('deliveryinfo.ogTitle'),
  ogDescription: t('deliveryinfo.ogDescription'),
  ogUrl: baseUrl,
  ogImage,
  twitterCard: 'summary_large_image'
})

/* --- JSON-LD objects --- */
const orgJsonLd = {
  "@context": "http://schema.org/",
  "@type": "Organization",
  "name": siteName,
  "url": `${baseUrl}/`,
  "image": logoUrl,
  "description": t('deliveryinfo.ogTitle'),
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Industrial No. 5, behind Maliah Road., shop No. 8",
    "addressCountry": "AE"
  },
  "telephone": "+971504429045",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Saturday","Sunday"],
      "opens": "08:00",
      "closes": "18:00"
    }
  ],
  "priceRange": "$$",
  "paymentAccepted": "Cash, Credit Card, Paypal",
  "sameAs": [
    "https://www.facebook.com/technolockkeys_world/",
    "https://twitter.com/techno_lock",
    "https://api.whatsapp.com/send?phone=971504429045"
  ]
}

const logoJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "url": baseUrl,
  "logo": logoUrl
}

/* --- Head (note: innerHTML, not children) --- */
useHead({
  htmlAttrs: { lang: locale.value },
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    { key: 'org-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(orgJsonLd) },
    { key: 'logo-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(logoJsonLd) }
  ]
})
</script>
<style scoped>
.deliveryinfo-page { display: block; }
</style>
