<template>
  <main class="contact-page">
    <!-- Breadcrumb -->
    <nav aria-label="breadcrumb">
      <div class="mx-auto max-w-7xl px-4">
        <ol class="flex items-center gap-2 py-3 text-sm text-gray-600">
          <li>
            <NuxtLinkLocale :to="localePath('/')" class="hover:text-gray-900 underline-offset-2 hover:underline">
              {{ t('common.home') }}
            </NuxtLinkLocale>
          </li>
          <li aria-hidden="true" class="text-gray-400">/</li>
          <li class="text-gray-900 font-medium" aria-current="page">
            {{ t('common.contactUs') }}
          </li>
        </ol>
      </div>
    </nav>

    <!-- Full-bleed Map -->
    <section class="w-full bg-white">
      <div class="mx-auto w-full">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14426.129258436238!2d55.407002!3d25.3199127!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f59569ff46675%3A0xc1d5d1a7ec3407f9!2zVGVjaG5vIExvY2sgS2V5cyBUcmFkaW5nICgg2KrZg9mG2Ygg2YTZiNmDINmE2KrYrNin2LHYqSDYp9mE2YXZgdin2KrZititICk!5e0!3m2!1sen!2str!4v1679480353420!5m2!1sen!2str"
          title="Google Map"
          class="block w-full"
          style="min-height: 400px;"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>

    <!-- Contact + Details -->
    <section class="mx-auto max-w-7xl px-4 py-12 md:py-16 bg-gradient-to-b from-white to-gray-50">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        <!-- Form Card -->
        <div class="lg:col-span-8">
          <div class="rounded-2xl border bg-white shadow-sm ring-1 ring-gray-100">
            <!-- Card header -->
            <div class="p-6 md:p-8 border-b">
              <h2
                class="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900"
                :class="dir === 'rtl' ? 'text-right' : ''"
              >
                {{ t('contact.leave') }} <span class="text-orange-600">{{ t('contact.message') }}</span>
              </h2>
            </div>

            <!-- Card body -->
            <form class="p-6 md:p-8" @submit.prevent="sendMessage">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div>
                  <label for="contact-name" class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t('contact.name') }}
                  </label>
                  <input
                    id="contact-name"
                    v-model="contactName"
                    type="text"
                    autocomplete="name"
                    required
                    class="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-gray-900 placeholder-gray-400
                           focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition"
                    :placeholder="t('contact.name')"
                  />
                </div>

                <div>
                  <label for="contact-email" class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t('contact.email') }}
                  </label>
                  <input
                    id="contact-email"
                    v-model="contactEmail"
                    type="email"
                    autocomplete="email"
                    required
                    class="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-gray-900 placeholder-gray-400
                           focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition"
                    :placeholder="t('contact.email')"
                  />
                </div>

                <div class="md:col-span-2">
                  <label for="contact-subject" class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t('contact.subject') }}
                  </label>
                  <input
                    id="contact-subject"
                    v-model="contactSubject"
                    type="text"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-gray-900 placeholder-gray-400
                           focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition"
                  />
                </div>

                <div class="md:col-span-2">
                  <label for="contact-message" class="block text-sm font-medium text-gray-700 mb-1">
                    {{ t('contact.message') }}
                  </label>
                  <textarea
                    id="contact-message"
                    v-model="contactMsg"
                    rows="7"
                    required
                    class="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-gray-900 placeholder-gray-400
                           focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition resize-y"
                    :placeholder="t('contact.message')"
                  />
                </div>
              </div>

              <!-- Sticky-ish footer for button on mobile -->
              <div class="mt-6 pt-3 border-t">
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <button
                    type="submit"
                    :disabled="submitting"
                    class="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl
                           px-6 py-3 text-white font-semibold shadow-sm transition
                           bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 96 960 960" width="20" height="20" fill="currentColor">
                      <path d="M120 896V256l760 320-760 320Zm60-93 544-227-544-230v168l242 62-242 60v167Zm0 0V346v457Z"/>
                    </svg>
                    <span>{{ submitting ? (t('common.sending') || 'Sending…') : t('contact.sendMessage') }}</span>
                  </button>

                  <!-- Optional secondary action -->
                  <button
                    type="button"
                    @click="resetForm"
                    class="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl px-6 py-3 font-semibold
                           border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    {{ t('common.clear') || 'Clear' }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <!-- Contact details Card -->
        <div class="lg:col-span-4">
          <div class="rounded-2xl border bg-white p-6 md:p-8 shadow-sm h-full ring-1 ring-gray-100">
            <h2
              class="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900"
              :class="dir === 'rtl' ? 'text-right' : ''"
            >
              {{ t('contact.contact') }} <span class="text-oragne-600">{{ t('contact.details') }}</span>
            </h2>

            <div class="mt-6 space-y-4">
              <div v-if="contactPhone" class="flex items-center gap-4 rounded-xl border bg-gray-50 p-4">
                <div class="shrink-0 rounded-lg bg-white p-3 shadow">
                  <i class="fa-solid fa-mobile-screen-button"></i>
                </div>
                <a class="text-gray-800 hover:underline" :href="`tel:${contactPhone}`">{{ contactPhone }}</a>
              </div>

              <div v-if="contactEmailDisplay" class="flex items-center gap-4 rounded-xl border bg-gray-50 p-4">
                <div class="shrink-0 rounded-lg bg-white p-3 shadow">
                  <i class="fa-regular fa-envelope"></i>
                </div>
                <a class="text-gray-800 break-all hover:underline" :href="`mailto:${contactEmailDisplay}`">
                  {{ contactEmailDisplay }}
                </a>
              </div>

              <div v-if="contactAddress" class="flex items-center gap-4 rounded-xl border bg-gray-50 p-4">
                <div class="shrink-0 rounded-lg bg-white p-3 shadow">
                  <i class="fa-solid fa-location-arrow"></i>
                </div>
                <div class="text-gray-800">{{ contactAddress }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Branches (unchanged) -->
    <section class="mx-auto max-w-7xl px-4 pb-5">
      <h3 class="text-center text-2xl md:text-3xl font-extrabold text-gray-900">
        {{ t('contact.ourBranches') }}
      </h3>

      <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <article class="rounded-2xl bg-white p-6 ring-1 ring-gray-100">
          <div class="text-lg font-semibold text-gray-900">United Arab Emirates</div>
          <div class="mt-4 flex flex-col sm:flex-row gap-6 items-center">
            <NuxtImg src="/images/flags/uae-flag.webp" alt="UAE flag" width="200" class="rounded-md" />
            <div class="text-center sm:text-left">
              <p>{{ t('contact.address') }}: {{ t('contact.uaeAddress') }}</p>
              <p class="mt-1">
                {{ t('contact.Mobile') }}:
                <a href="tel:+971504429045" class="text-orange-700 hover:underline">+971 50 442 9045</a>
              </p>
            </div>
          </div>
        </article>

        <article class="rounded-2xl border bg-white shadow-sm p-6 ring-1 ring-gray-100">
          <div class="text-lg font-semibold text-gray-900">Saudi Arabia</div>
          <div class="mt-4 flex flex-col sm:flex-row gap-6 items-center">
            <NuxtImg src="/images/flags/Flag_of_Saudi_Arabia.gif" alt="Saudi Arabia flag" width="200" class="rounded-md" />
            <div class="text-center sm:text-left">
              <p>{{ t('contact.address') }}: {{ t('contact.ksaAddress') }}</p>
              <p class="mt-1">
                {{ t('contact.Mobile') }}:
                <a href="tel:+966505953232" class="text-orange-700 hover:underline">+966 50 595 3232</a>
              </p>
            </div>
          </div>
        </article>

        <article class="rounded-2xl border bg-white shadow-sm p-6 ring-1 ring-gray-100">
          <div class="text-lg font-semibold text-gray-900">United States of America</div>
          <div class="mt-4 flex flex-col sm:flex-row gap-6 items-center">
            <NuxtImg src="/images/flags/usa-flag.webp" alt="USA flag" width="200" class="rounded-md" />
            <div class="text-center sm:text-left">
              <p>{{ t('contact.address') }}: {{ t('contact.usaAddress') }}</p>
              <p class="mt-1">
                {{ t('contact.Mobile') }}:
                <a href="tel:+19734624473" class="text-orange-700 hover:underline">+1 973 462 4473</a>
              </p>
            </div>
          </div>
        </article>

        <article class="rounded-2xl border bg-white shadow-sm p-6 ring-1 ring-gray-100">
          <div class="text-lg font-semibold text-gray-900">Turkey</div>
          <div class="mt-4 flex flex-col sm:flex-row gap-6 items-center">
            <NuxtImg src="/images/flags/turkey-flag.webp" alt="Turkey flag" width="200" class="rounded-md" />
            <div class="text-center sm:text-left">
              <p>{{ t('contact.address') }}: {{ t('contact.turkeyAddress') }}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useAlertStore } from '~/stores/alert'

/* i18n / routing */
const { t, locale, localeProperties } = useI18n()
const localePath = useLocalePath()
const dir = computed(() => localeProperties.value?.dir || 'ltr')

/* Props */
const props = withDefaults(defineProps<{
  apiBaseUrl: string
  contactPhone?: string | null
  contactEmail?: string | null
  contactAddress?: string | null
}>(), {
  contactPhone: "+971504429045",
  contactEmail: "support@tlkeys.com",
  contactAddress: "Sharjah – Industrial No. 5, behind Maliha Road Shop No. 8, Property of Ali Nasir Mohamed Suleiman United Arab Emirates"
})

/* Form state */
const contactName = ref('')
const contactEmail = ref('')
const contactSubject = ref('')
const contactMsg = ref('')
const submitting = ref(false)
const alert = useAlertStore()

/* Derived */
const contactPhone = computed(() => props.contactPhone ?? '')
const contactEmailDisplay = computed(() => props.contactEmail ?? '')
const contactAddress = computed(() => props.contactAddress ?? '')

/* API */
const { public: { API_BASE_URL } } = useRuntimeConfig()
const { $customApi } = useNuxtApp() as any
const auth = (useNuxtApp() as any)?.$auth

function resetForm() {
  contactName.value = ''
  contactEmail.value = ''
  contactSubject.value = ''
  contactMsg.value = ''
}

async function sendMessage() {
  try {
    submitting.value = true
    await $customApi(`${API_BASE_URL}/contact-us`, {
      method: 'POST',
      body: {
        name: (contactName.value || auth?.user?.name || '') ?? '',
        email: (contactEmail.value || auth?.user?.email || '') ?? '',
        subject: (contactSubject.value || ''),
        message: contactMsg.value,
        type: 'contact',
      }
    })
    resetForm()
    alert.showAlert({
      type: 'success',
      title: t('contact.alertSuccessTitle'),
      message: t('contact.alertSuccessBody'),
      timeout: 3500,
    })
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || t('contact.error')
    ;(useNuxtApp() as any)?.$notify?.({ group: 'errorMessage', type: 'error', text: msg })
  } finally {
    submitting.value = false
  }
}

/* SEO */
const siteName = 'Techno Lock Keys'
const canonical = 'https://www.tlkeys.com/contact'
const baseUrl = 'https://www.tlkeys.com'
const ogImage = 'https://www.tlkeys.com/images/og-image.jpg'
const logoUrl = 'https://www.tlkeys.com/images/logo/techno-lock-desktop-logo.webp'

useSeoMeta({
  title: t('contact.seoTitle'),
  description: t('contact.seoDescription'),
  ogType: 'website',
  ogSiteName: siteName,
  ogTitle: t('contact.ogTitle'),
  ogDescription: t('contact.ogDescription'),
  ogUrl: canonical,           // use canonical here
  ogImage,
  twitterCard: 'summary_large_image'
})

/* ---------- JSON-LD (no children; injected via innerHTML) ---------- */
const sameAs = [
  'https://www.facebook.com/technolockkeys_world/',
  'https://twitter.com/techno_lock',
  'https://api.whatsapp.com/send?phone=971504429045'
]

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteName,
  url: `${baseUrl}/`,
  image: logoUrl,
  description: t('contact.ogDescription'),
  sameAs,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Industrial No. 5, behind Maliha Road., shop No. 8',
    addressLocality: 'Sharjah',
    addressCountry: 'AE'
  },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+971504429045',
      email: 'support@tlkeys.com',
      areaServed: ['AE'],
      availableLanguage: ['en', 'ar', 'tr']
    },
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+966505953232',
      areaServed: ['SA'],
      availableLanguage: ['ar', 'en']
    },
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+19734624473',
      areaServed: ['US'],
      availableLanguage: ['en', 'es']
    },
    {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: '+905531468475',
      areaServed: ['TR'],
      availableLanguage: ['tr', 'en']
    }
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Saturday','Sunday'],
      opens: '08:00',
      closes: '18:00'
    }
  ],
  priceRange: '$$',
  paymentAccepted: 'Cash, Credit Card, Paypal'
}

const logoJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  url: baseUrl,
  logo: logoUrl
}

const contactPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: t('contact.ogTitle'),
  url: canonical,
  description: t('contact.seoDescription'),
  inLanguage: locale.value,
  isPartOf: {
    '@type': 'WebSite',
    name: siteName,
    url: baseUrl
  },
  hasMap: 'https://www.google.com/maps?ll=25.3199127,55.407002&z=14'
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: t('common.home'),
      item: `${baseUrl}/`
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: t('common.contactUs'),
      item: canonical
    }
  ]
}

/* Head: canonical + JSON-LD */
useHead({
  htmlAttrs: { lang: locale.value },
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    { key: 'org-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(orgJsonLd) },
    { key: 'logo-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(logoJsonLd) },
    { key: 'contactpage-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(contactPageJsonLd) },
    { key: 'breadcrumb-ldjson', type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbJsonLd) }
  ]
})
</script>


<style scoped>
.contact-page { display: block; }
</style>
