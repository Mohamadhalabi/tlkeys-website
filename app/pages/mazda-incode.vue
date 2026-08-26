<template>
  <main class="min-h-screen bg-gray-100">
    <!-- ── Page header ─────────────────────────────────────
         Kept deliberately plain: the calculator card is the page, and a busy
         hero above it just pushes the VIN field below the fold on a phone. -->
    <header class="border-b border-gray-200 bg-white">
      <div class="mx-auto w-full max-w-3xl px-6 py-8 sm:px-8 sm:py-10">
        <p class="text-xs font-bold uppercase tracking-wider text-orange-700">
          {{ tt('mazda.eyebrow', 'Mazda') }}
        </p>
        <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
          {{ tt('mazda.pageTitle', 'Mazda immobilizer security codes') }}
        </h1>
        <p class="mt-2 max-w-2xl text-base text-gray-600">
          {{ tt('mazda.pageIntro', 'Send an outcode request straight to the Mazda portal. Pay once, and the codes are emailed to the address you enter.') }}
        </p>
      </div>
    </header>

    <div class="px-4 py-8 sm:py-12">
      <!-- `price` starts at the rest-of-world rate and updates once the API
           answers, so the card renders immediately instead of waiting on a
           round trip. The server decides what is actually charged either way. -->
      <MazdaImmobilizerGuest
        ref="calculator"
        :price="price"
        :currency="currency"
        whatsapp-phone="971502519501"
        @success="onSuccess"
        @error="onError"
      />

      <!-- ── Questions people ask before paying ────────────
           Static, so it renders on the server and costs nothing. Below the
           card on purpose — it answers hesitation, it does not compete with
           the form. -->
      <section class="mx-auto mt-10 w-full max-w-3xl">
        <h2 class="px-2 text-sm font-bold uppercase tracking-wider text-gray-500">
          {{ tt('mazda.faqTitle', 'Before you pay') }}
        </h2>

        <dl class="mt-4 divide-y divide-gray-200 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
          <div v-for="(item, i) in faqs" :key="i" class="px-6 py-5 sm:px-8">
            <dt class="text-sm font-semibold text-gray-900">{{ item.q }}</dt>
            <dd class="mt-1.5 text-sm text-gray-600">{{ item.a }}</dd>
          </div>
        </dl>

        <p class="mt-6 px-2 text-xs text-gray-400">
          {{ tt('mazda.legal', 'Codes are supplied by Mazda. We forward your request and are not affiliated with Mazda Motor Corporation.') }}
        </p>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

/* The component owns its own <head> — it sets the title and the noindex
   robots tag. Adding another useHead() here would fight it, so this page
   deliberately sets nothing. If you ever want this page indexed, pass
   :no-index="false" to the component instead of adding meta here. */

/* Auto-imported from app/composables/useMazdaPrice.ts. Asks the API what this
   visitor pays; the same server-side rule sets the PayPal amount. */
const { price, currency } = useMazdaPrice()

const { t, te } = useI18n()

function tt(key: string, fallback: string) {
  return te(key) ? t(key) : fallback
}

const calculator = ref<{ reset: () => void } | null>(null)

const faqs = computed(() => [
  {
    q: tt('mazda.faq0Q', 'Which vehicles are covered?'),
    a: tt('mazda.faq0A', 'North American spec only. If the vehicle was not sold in the USA or Canada, its immobilizer data is not in this system and no code will be returned.'),
  },
  {
    q: tt('mazda.faq1Q', 'When do the codes arrive?'),
    a: tt('mazda.faq1A', 'Within 15 minutes.'),
  },
  {
    q: tt('mazda.faq2Q', 'What if Mazda rejects the request?'),
    a: tt('mazda.faq2A', 'The payment is refunded automatically and a WhatsApp link appears so we can look at the data with you. Rejections are almost always a mistyped outcode or serial number.'),
  },
  {
    q: tt('mazda.faq3Q', 'Do I need an account?'),
    a: tt('mazda.faq3A', 'No. Enter the vehicle data, pay with PayPal, and you are done. Nothing is stored against a login.'),
  },
  {
    q: tt('mazda.faq4Q', 'Can I change the email after paying?'),
    a: tt('mazda.faq4A', 'No — the request goes to Mazda with the address you entered, so check it carefully before you pay. Message us on WhatsApp if you got it wrong.'),
  },
])

function onSuccess(payload: any) {
  // Hook for analytics. Send the reference only — never the VIN or the codes.
  if (import.meta.dev) console.info('[mazda page] submitted', payload?.reference)
}

function onError(payload: any) {
  if (import.meta.dev) console.warn('[mazda page] failed', payload)
}
</script>