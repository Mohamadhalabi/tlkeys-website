<template>
  <main class="terms-page">
    <!-- Breadcrumb -->
    <nav aria-label="breadcrumb">
      <div class="mx-auto max-w-7xl px-4">
        <ol class="flex items-center gap-2 py-3 text-sm text-gray-600">
          <li>
            <NuxtLinkLocale to="/" class="hover:text-gray-900 underline-offset-2 hover:underline">
              {{ t('shop.home') }}
            </NuxtLinkLocale>
          </li>
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium">
            {{ t('terms.title') }}
          </li>
        </ol>
      </div>
    </nav>

    <!-- Content -->
    <section class="mx-auto max-w-4xl px-4 py-10 md:py-16">
      <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
        {{ t('terms.title') }}
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        {{ t('terms.lastUpdated', { date: lastUpdated }) }}
      </p>
      <p class="mt-6 text-base leading-7 text-gray-700">
        {{ t('terms.intro') }}
      </p>

      <div class="mt-8 space-y-8 text-base leading-7 text-gray-700">
        <section
          v-for="s in sections"
          :key="s.id"
          :id="s.id"
          :aria-labelledby="`${s.id}-heading`"
          :class="s.highlight ? 'rounded-lg border border-amber-200 bg-amber-50 p-4 md:p-5' : ''"
        >
          <h2 :id="`${s.id}-heading`" class="text-xl font-bold text-gray-900">
            {{ t(s.title) }}
          </h2>
          <div class="mt-2 space-y-3">
            <p v-for="p in s.paragraphs" :key="p">{{ t(p, params) }}</p>
          </div>
          <p v-if="s.link" class="mt-3">
            <NuxtLinkLocale :to="s.link.to" class="text-blue-600 hover:underline">
              {{ t(s.link.label) }}
            </NuxtLinkLocale>
          </p>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()

/* ---- Company details (fill these in) ---- */
const company = 'Techno Lock Keys Trading'            // TODO: exact registered legal name
const address = 'Warehouse Shed No. 1, Maleha Road, Industrial Area 5, Sharjah, UAE'
const email = 'info@tlkeys.com'
const phone = '+971504429045'
const lastUpdated = '2026-09-30'                        // TODO: update whenever the Terms change

/* ---- Routes (adjust to your actual paths) ---- */
const ROUTES = {
  returns: '/return-policy',
  privacy: '/privacy-policy',
  delivery: '/delivery-info',
  contact: '/contact'
}

/* Values injected into {placeholders} in the translations */
const params = { company, address, email, phone }

/* ---- Constants ---- */
const baseUrl = 'https://www.tlkeys.com'
const canonical = `${baseUrl}/terms`
const siteName = 'Techno Lock Keys'
const ogImage = 'https://www.tlkeys.com/images/og-image.jpg'

type Section = {
  id: string
  title: string
  paragraphs: string[]
  highlight?: boolean
  link?: { to: string; label: string }
}

const sections: Section[] = [
  { id: 'who', title: 'terms.whoTitle', paragraphs: ['terms.who1', 'terms.who2'] },
  { id: 'acceptance', title: 'terms.acceptTitle', paragraphs: ['terms.accept1', 'terms.accept2'] },
  { id: 'lawful-use', title: 'terms.useTitle', paragraphs: ['terms.use1', 'terms.use2', 'terms.use3'] },
  { id: 'account', title: 'terms.accountTitle', paragraphs: ['terms.account1', 'terms.account2'] },
  { id: 'compatibility', title: 'terms.productTitle', paragraphs: ['terms.product1', 'terms.product2', 'terms.product3', 'terms.product4'] },
  { id: 'orders', title: 'terms.orderTitle', paragraphs: ['terms.order1', 'terms.order2', 'terms.order3', 'terms.order4'] },
  {
    id: 'shipping', title: 'terms.shipTitle',
    paragraphs: ['terms.ship1', 'terms.ship2', 'terms.ship3', 'terms.ship4'],
    link: { to: ROUTES.delivery, label: 'terms.relatedDelivery' }
  },
  {
    id: 'customs', title: 'terms.customsTitle', highlight: true,
    paragraphs: ['terms.customs1', 'terms.customs2', 'terms.customs3', 'terms.customs4']
  },
  { id: 'declared-value', title: 'terms.declaredTitle', paragraphs: ['terms.declared1', 'terms.declared2'] },
  { id: 'digital', title: 'terms.digitalTitle', paragraphs: ['terms.digital1', 'terms.digital2', 'terms.digital3', 'terms.digital4'] },
  {
    id: 'returns', title: 'terms.returnsTitle',
    paragraphs: ['terms.returns1', 'terms.returns2'],
    link: { to: ROUTES.returns, label: 'terms.relatedReturn' }
  },
  { id: 'warranty', title: 'terms.warrantyTitle', paragraphs: ['terms.warranty1', 'terms.warranty2'] },
  { id: 'liability', title: 'terms.liabilityTitle', paragraphs: ['terms.liability1', 'terms.liability2', 'terms.liability3'] },
  {
    id: 'disputes', title: 'terms.disputeTitle', highlight: true,
    paragraphs: ['terms.dispute1', 'terms.dispute2', 'terms.dispute3'],
    link: { to: ROUTES.contact, label: 'terms.relatedContact' }
  },
  { id: 'intellectual-property', title: 'terms.ipTitle', paragraphs: ['terms.ip1', 'terms.ip2'] },
  {
    id: 'privacy', title: 'terms.privacyTitle',
    paragraphs: ['terms.privacy1'],
    link: { to: ROUTES.privacy, label: 'terms.relatedPrivacy' }
  },
  { id: 'force-majeure', title: 'terms.forceTitle', paragraphs: ['terms.force1'] },
  { id: 'changes', title: 'terms.changesTitle', paragraphs: ['terms.changes1'] },
  { id: 'governing-law', title: 'terms.lawTitle', paragraphs: ['terms.law1', 'terms.law2'] },
  { id: 'contact', title: 'terms.contactTitle', paragraphs: ['terms.contact1'] }
]

/* ---- SEO ---- */
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

useHead({
  htmlAttrs: { lang: locale.value },
  link: [{ rel: 'canonical', href: canonical }]
})
</script>