<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, useRoute, useHead, useSeoMeta, useRuntimeConfig } from '#imports'

/* i18n + runtime */
const { locale } = useI18n()
const route = useRoute()
const runtime = useRuntimeConfig()

const siteName   = runtime.public.siteName || 'Techno Lock Keys'
const siteUrl    = (runtime.public.siteUrl || runtime.public.SITE_URL || 'https://www.tlkeys.com').replace(/\/+$/, '')
const ogImage    = 'https://www.tlkeys.com/images/og-image.jpg'

/* SEO */
const pageTitle = `Refund & Cancellation Policy | ${siteName}`
const pageDesc  = `Please review our refund and cancellation rules. Original products are not returnable or refundable.
Only eligible items returned within 15 days in unused condition, with original packaging and proof of purchase, may be considered.`

const canonicalUrl = computed(() => siteUrl ? `${siteUrl}${route.path}` : undefined)

useSeoMeta({
  title: pageTitle,
  description: pageDesc,
  ogTitle: pageTitle,
  ogDescription: pageDesc,
  ogType: 'website',
  ogUrl: canonicalUrl,
  ogImage: ogImage,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDesc,
  robots: 'index,follow',
  language: computed(() => String(locale.value || 'en'))
})

/* JSON-LD + canonical */
useHead(() => ({
  link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Refund & Cancellation Policy',
        description: pageDesc,
        url: canonicalUrl.value
      })
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Refund & Cancellation Policy', item: canonicalUrl.value }
        ]
      })
    }
  ]
}))
</script>

<template>
  <main class="py-6">
    <div class="container mx-auto px-4">
      <!-- Breadcrumbs -->
      <nav aria-label="Breadcrumb" class="mb-4">
        <ol class="flex flex-wrap items-center gap-1 text-sm text-gray-600">
          <li>
            <NuxtLinkLocale to="/" class="hover:text-gray-900">Home</NuxtLinkLocale>
          </li>
          <li class="mx-2 text-gray-400">/</li>
          <li class="text-gray-900 font-medium">Refund &amp; Cancellation Policy</li>
        </ol>
      </nav>

      <!-- Content -->
      <section class="rounded-2xl border bg-white/90 backdrop-blur px-5 md:px-7 py-6 shadow-sm">
        <h1 class="text-2xl md:text-3xl font-semibold">Refund &amp; Cancellation Policy</h1>

        <p class="mt-4 text-red-600">
          Please be aware that original products are not returnable or refundable. Only products that meet the
          eligibility criteria and are returned within 15 days of purchase will be considered for a refund or exchange.
          Thank you for your understanding.
        </p>

        <h2 class="mt-8 text-xl font-semibold">Eligibility for Refunds and Exchanges</h2>
        <ul class="mt-3 list-disc ps-6 space-y-2 text-gray-700">
          <li>Your item must be unused and in the same condition that you received it.</li>
          <li>The item must be in the original packaging.</li>
          <li>To complete your return, we require a receipt or proof of purchase.</li>
          <li>If you receive a refund, return shipping will be deducted from your refund.</li>
        </ul>

        <h2 class="mt-8 text-xl font-semibold">Partial Refunds Are Granted (If Applicable)</h2>
        <ul class="mt-3 list-disc ps-6 space-y-2 text-gray-700">
          <li>Any item not in its original condition, damaged, or missing parts for reasons not due to our error.</li>
          <li>Any item that is returned more than 15 days after delivery.</li>
          <li>Once your return is received and inspected, we will notify you via email.</li>
          <li>We will inform you of the approval or rejection of your refund.</li>
          <li>
            If approved, the refund will be processed and a credit will automatically be applied to your credit card
            or original method of payment within 10 to 45 days, depending on the issuing bank.
          </li>
        </ul>

        <h2 class="mt-8 text-xl font-semibold">Late or Missing Refunds</h2>
        <p class="mt-3 text-gray-700">If you have not received a refund yet, please:</p>
        <ul class="mt-2 list-disc ps-6 space-y-2 text-gray-700">
          <li>Check your bank account again.</li>
          <li>Contact your credit card company, as it may take some time before your refund is officially posted.</li>
          <li>
            If you have done all of this and still have not received your refund, please contact us at
            <a href="tel:+971504429045" class="text-orange-600 hover:text-orange-700">(+971) 50 442 9045</a>
            or
            <a href="mailto:support@tlkeys.com" class="text-orange-600 hover:text-orange-700">support@tlkeys.com</a>.
          </li>
        </ul>

        <h2 class="mt-8 text-xl font-semibold">Non-Exchangeable Items</h2>
        <ul class="mt-3 list-disc ps-6 space-y-2 text-gray-700">
          <li>Items that are damaged or abused.</li>
          <li>If the customer ordered the wrong item.</li>
          <li>Items can be exchanged for an identical item (if factory defective) but cannot be returned for a refund.</li>
        </ul>

        <h2 class="mt-8 text-xl font-semibold">Fraudulent Transactions &amp; Third-Party Payments</h2>
        <p class="mt-3 text-gray-700">
          We are not responsible if a customer uses someone else’s card to make a purchase. Refunds and cancellations
          will only be processed to the original payment method used during the transaction. Any disputes regarding
          unauthorized transactions should be addressed directly with the card issuer.
        </p>

        <h2 class="mt-8 text-xl font-semibold">Shipping</h2>
        <p class="mt-3 text-gray-700">
          Depending on your location, the time it may take for your exchanged product to reach you may vary.
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* Tailwind handles most styling; keep content tidy on long lines */
.ps-6 { padding-inline-start: 1.5rem; }
</style>
