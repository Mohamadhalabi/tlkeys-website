<script setup lang="ts">
import { computed } from 'vue'
import { useI18n, useRoute, useHead, useSeoMeta, useRuntimeConfig } from '#imports'

const { t, locale } = useI18n()
const route = useRoute()
const runtime = useRuntimeConfig()

const siteName = runtime.public.siteName || 'Techno Lock Keys'
const siteUrl  = (runtime.public.siteUrl || runtime.public.SITE_URL || 'https://www.tlkeys.com').replace(/\/+$/, '')
const ogImage  = runtime.public.defaultOgImage || '/images/og-image.jpg'

const pageTitle = `Cancellation & Replacement Policy | ${siteName}`
const pageDesc =
  'Original products cannot be returned or refunded. Exchanges may be eligible within 15 days if items are unused, in original packaging, and accompanied by proof of purchase. Defective/damaged items can be replaced.'

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

useHead(() => ({
  link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Cancellation & Replacement Policy',
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
          { '@type': 'ListItem', position: 1, name: t('shop.home') || 'Home', item: `${siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Cancellation & Replacement Policy', item: canonicalUrl.value }
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
            <NuxtLinkLocale to="/" class="hover:text-gray-900">
              {{ t('shop.home') || 'Home' }}
            </NuxtLinkLocale>
          </li>
          <li class="mx-2 text-gray-400">/</li>
          <li class="text-gray-900 font-medium">Cancellation &amp; Replacement Policy</li>
        </ol>
      </nav>

      <!-- Content -->
      <section class="rounded-2xl border bg-white/90 backdrop-blur px-5 md:px-7 py-6 shadow-sm">
        <h1 class="text-2xl md:text-3xl font-semibold">Cancellation &amp; Replacement Policy</h1>

        <p class="mt-4 text-red-600">
          Please note that original products cannot be returned or refunded. Only products meeting the eligibility
          criteria and returned within 15 days of purchase will be considered for a refund or exchange.
          We appreciate your understanding.
        </p>

        <h2 class="mt-8 text-xl font-semibold">Eligibility for Exchanges - Cancellation &amp; Replacement Policy</h2>
        <ul class="mt-3 list-disc ps-6 space-y-2 text-gray-700">
          <li>The item must be unused and in the same condition as received.</li>
          <li>It must be in the original packaging.</li>
          <li>To complete your exchange (if applicable), we require a receipt or proof of purchase.</li>
          <li>We replace items only if they are defective or damaged.</li>
        </ul>

        <p class="mt-4 text-gray-700">
          If you need to exchange it for the same item, please email us at
          <a href="mailto:order@tlkeys.com" class="text-orange-600 hover:text-orange-700">order@tlkeys.com</a>
          and send your item to:
        </p>

        <address class="mt-2 not-italic text-gray-700">
          Warehouse No. 1, Techno Lock Keys Trading, Maleha Road, Industrial 5, Sharjah, UAE 26480<br />
          Sharjah, United Arab Emirates
        </address>
      </section>
    </div>
  </main>
</template>

<style scoped>
.ps-6 { padding-inline-start: 1.5rem; }
</style>
