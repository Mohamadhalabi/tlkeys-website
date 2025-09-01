<!-- components/Footer.vue -->
<template>
  <footer class="relative text-white bg-black/85 backdrop-blur">
    <!-- Top -->
    <div class="mx-auto max-w-screen-2xl px-6 py-12">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-10">
        <!-- Brand / about -->
        <section class="md:col-span-5">
          <NuxtLinkLocale to="/" class="inline-flex items-center gap-2">
            <NuxtImg :src="logoSrc" alt="Logo" class="w-auto object-contain" width="160" />
          </NuxtLinkLocale>

          <p class="mt-4 text-sm leading-6 text-neutral-300">
            {{ t('footer.about', { company: companyName }) }}
          </p>

          <!-- Socials -->
          <div v-if="socials.length" class="mt-5 flex items-center gap-3">
            <a
              v-for="s in socials"
              :key="s.label"
              :href="s.href"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:bg-white/10 transition"
              :aria-label="s.label"
              v-html="s.svg"
            />
          </div>
        </section>

        <!-- Links -->
        <nav class="md:col-span-4" aria-label="Footer">
          <ul class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <li v-for="l in linksComputed" :key="l.to">
              <NuxtLinkLocale
                :to="l.to"
                class="inline-flex items-center gap-2 rounded-md px-1 py-1 hover:text-white hover:bg-white/5 transition"
              >
                <span>{{ l.label }}</span>
              </NuxtLinkLocale>
            </li>
          </ul>
        </nav>

        <!-- Contact -->
        <section class="md:col-span-3">
          <address class="mt-4 not-italic text-sm space-y-3">
            <p class="text-neutral-300">
              <span v-for="(line, i) in addressLines" :key="i">
                {{ line }}<br v-if="i < addressLines.length - 1" />
              </span>
            </p>

            <p v-if="phone">
              <a :href="`tel:${phone}`" class="hover:text-white transition">{{ phone }}</a>
            </p>
            <p v-if="email">
              <a :href="`mailto:${email}`" class="hover:text-white transition">{{ email }}</a>
            </p>
          </address>
        </section>
      </div>
    </div>

    <!-- Divider -->
    <div class="border-t border-white/10"></div>

    <!-- Bottom bar -->
    <div class="mx-auto max-w-screen-2xl px-6 py-5">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="text-xs text-neutral-400">
          {{ t('footer.copyright', { year, company: companyName }) }}
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '#imports'
import { NuxtImg } from '#components'

const { t } = useI18n()

const props = defineProps<{
  companyName?: string
  logoSrc?: string
  addressLines?: string[]
  phone?: string
  email?: string
  /** Optional override for the “About” links */
  links?: { label: string; to: string }[]
}>()

const companyName = computed(() => props.companyName ?? 'Techno Lock Keys Trading')
const logoSrc = computed(() => props.logoSrc ?? '/images/logo/techno-lock-desktop-logo.webp')
const addressLines = computed(() => props.addressLines ?? [
  'Sharjah – Industrial No. 5, behind Maliha Road',
  'Shop No. 8, Property of Ali Nasir Mohamed Suleiman',
  'United Arab Emirates'
])
const phone  = computed(() => props.phone  ?? '+971504429045')
const email  = computed(() => props.email  ?? 'support@tlkeys.com')

/** Default links (reactive to locale via computed) */
const defaultLinksComputed = computed(() => ([
  { label: t('links.about'),    to: '/about' },
  { label: t('links.contact'),  to: '/contact' },
  { label: t('links.delivery'), to: '/deliveryinfo' },
  { label: t('links.privacy'),  to: '/privacy-policy' },
  { label: t('links.terms'),    to: '/terms' },
  { label: t('links.returns'),  to: '/return-policy' },
]))

const linksComputed = computed(() => (props.links?.length ? props.links : defaultLinksComputed.value))

/** Inline SVGs (mono, fill-current) */
const svg = {
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4 fill-current"><path d="M22 12.06C22 6.49 17.52 2 11.95 2 6.39 2 1.9 6.49 1.9 12.06c0 4.99 3.65 9.13 8.42 9.94v-7.03H7.9v-2.91h2.42V9.41c0-2.4 1.43-3.73 3.61-3.73 1.05 0 2.15.19 2.15.19v2.37h-1.21c-1.19 0-1.56.74-1.56 1.5v1.8h2.66l-.43 2.91h-2.23V22c4.77-.81 8.42-4.95 8.42-9.94Z"/></svg>`,

  // Correct TikTok glyph
  tiktok: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4 fill-current"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,

  instagram:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4 fill-current"><path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-5.9 3 3 0 0 1 0 5.9Zm5.98-7.82a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 2.2c3.23 0 3.62.01 4.89.07 1.26.06 2.12.26 2.88.55.78.3 1.44.7 2.1 1.36.66.66 1.06 1.32 1.36 2.1.29.76.49 1.62.55 2.88.06 1.27.07 1.66.07 4.89s-.01 3.62-.07 4.89c-.06 1.26-.26 2.12-.55 2.88-.3.78-.7 1.44-1.36 2.1-.66.66-1.32 1.06-2.1 1.36-.76.29-1.62.49-2.88.55-1.27.06-1.66.07-4.89.07s-3.62-.01-4.89-.07c-1.26-.06-2.12-.26-2.88-.55a5.6 5.6 0 0 1-2.1-1.36 5.6 5.6 0 0 1-1.36-2.1c-.29-.76-.49-1.62-.55-2.88C.16 15.62.15 15.23.15 12s.01-3.62.07-4.89c.06-1.26.26-2.12.55-2.88A5.6 5.6 0 0 1 2.13 2.1 5.6 5.6 0 0 1 4.23.74c.76-.29 1.62-.49 2.88-.55C8.37.13 8.76.12 12 .12Z"/></svg>`,

  youtube:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4 fill-current"><path d="M23.5 6.2a4 4 0 0 0-2.8-2.8C18.7 3 12 3 12 3s-6.7 0-8.7.4A4 4 0 0 0 .5 6.2 41 41 0 0 0 0 12a41 41 0 0 0 .5 5.8 4 4 0 0 0 2.8 2.8C5.3 21 12 21 12 21s6.7 0 8.7-.4a4 4 0 0 0 2.8-2.8c.3-1.9.5-3.8.5-5.8s-.2-3.9-.5-5.8ZM9.7 15.5V8.5l6.2 3.5-6.2 3.5Z"/></svg>`
}

const socials = [
  { label: 'Facebook',  href: 'https://www.facebook.com/technolockkeystrade', svg: svg.facebook },
  { label: 'TikTok',    href: 'https://www.tiktok.com/@technolockkeys',       svg: svg.tiktok },
  { label: 'Instagram', href: 'https://www.instagram.com/technolock/',        svg: svg.instagram },
  { label: 'YouTube',   href: 'https://www.youtube.com/@technolock',          svg: svg.youtube },
]

const year = new Date().getFullYear()
</script>

<style scoped>
footer::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1200px 50% at 50% 120%, rgba(255,255,255,.06), transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,.03), transparent);
  pointer-events: none;
}
</style>
