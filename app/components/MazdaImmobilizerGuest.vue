<template>
  <section class="mx-auto w-full max-w-3xl rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
    <header class="border-b border-gray-200 px-6 py-5 sm:px-8 sm:py-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">
            {{ tt('mazda.calcTitle', 'Mazda immobilizer codes') }}
          </h3>
          <p class="mt-1.5 text-sm sm:text-base text-gray-500">
            {{ tt('mazda.calcSubtitle', 'Fill in the vehicle data, pay, and the codes are emailed to you. No account needed.') }}
          </p>
        </div>

        <div class="rounded-lg bg-orange-50 px-3 py-2 text-center ring-1 ring-orange-300">
          <p class="text-lg font-extrabold leading-none text-gray-900">{{ money(price) }}</p>
          <p class="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
            {{ tt('mazda.perRequest', 'Per request') }}
          </p>
        </div>
      </div>
    </header>

    <!-- ── Coverage warning ──────────────────────────────
         Above everything, before a single field is filled. This is the one
         fact that decides whether the customer should pay at all, so it does
         not go in the collapsed panel or the footnotes. -->
    <div class="border-b border-amber-200 bg-amber-50 px-6 py-5 sm:px-8">
      <div class="flex gap-3">
        <svg viewBox="0 0 20 20" fill="currentColor" class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" />
        </svg>
        <div>
          <p class="text-sm font-bold uppercase tracking-wide text-amber-900">
            {{ tt('mazda.coverageTitle', 'North American vehicles only') }}
          </p>
          <p class="mt-1 text-sm text-amber-800">
            {{ tt('mazda.coverageBody', 'Only immobilizer codes for North American spec vehicles are in this system. If the car was not sold in the USA or Canada, no code will be returned — check the VIN before you pay.') }}
          </p>
        </div>
      </div>
    </div>

    <!-- ── How it works ──────────────────────────────────── -->
    <div class="border-b border-gray-200 bg-gray-50 px-6 py-5 sm:px-8 sm:py-6">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 text-left"
        :aria-expanded="instructionsOpen"
        aria-controls="mz-instructions"
        @click="instructionsOpen = !instructionsOpen"
      >
        <span class="text-sm font-semibold uppercase tracking-wide text-gray-700">
          {{ tt('mazda.howItWorks', 'How it works') }}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          class="h-5 w-5 shrink-0 text-gray-400 transition-transform"
          :class="instructionsOpen ? 'rotate-180' : ''"
          aria-hidden="true"
        >
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" />
        </svg>
      </button>

      <div v-show="instructionsOpen" id="mz-instructions" class="mt-4">
        <ol class="grid gap-4 sm:grid-cols-3">
          <li v-for="(step, i) in steps" :key="i" class="flex gap-3">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-700 text-sm font-bold text-white">
              {{ i + 1 }}
            </span>
            <div>
              <p class="text-sm font-semibold text-gray-900">{{ step.title }}</p>
              <p class="mt-1 text-sm text-gray-600">{{ step.body }}</p>
            </div>
          </li>
        </ol>

        <ul class="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm text-gray-600">
          <li class="flex gap-2">
            <span aria-hidden="true" class="text-gray-400">•</span>
            <span>{{ tt('mazda.note1', 'The fields you need depend on the reason you pick. Fill them exactly as they appear on the module label.') }}</span>
          </li>
          <li class="flex gap-2">
            <span aria-hidden="true" class="text-gray-400">•</span>
            <span>{{ tt('mazda.note2', 'Codes are not shown on screen. Mazda emails them to the address you enter, usually within 15 minutes.') }}</span>
          </li>
          <li class="flex gap-2">
            <span aria-hidden="true" class="text-gray-400">•</span>
            <span>{{ tt('mazda.note3', 'If Mazda rejects the request, the payment is refunded automatically and we help you on WhatsApp.') }}</span>
          </li>
          <li class="flex gap-2">
            <span aria-hidden="true" class="text-gray-400">•</span>
            <span>{{ tt('mazda.note4', 'The price depends on where you are ordering from. You see the exact amount before you pay.') }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="px-6 py-6 sm:px-8 sm:py-8">
      <!-- ── 1. Vehicle & job details ─────────────────────── -->
      <p class="text-xs font-bold uppercase tracking-wider text-gray-400">
        {{ tt('mazda.section1', '1. Vehicle & job details') }}
      </p>

      <!-- Email -->
      <div class="mt-4">
        <label for="mz-email" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
          {{ tt('mazda.email', 'Destination email') }} <span class="text-red-500">*</span>
        </label>
        <input
          id="mz-email"
          v-model.trim="form.email"
          type="email"
          autocomplete="email"
          inputmode="email"
          :disabled="locked"
          :placeholder="tt('mazda.emailPlaceholder', 'you@workshop.com')"
          class="mt-2 w-full rounded-xl border-2 px-4 py-3 text-base text-gray-900 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
          :class="fieldClass('email')"
          :aria-invalid="showError('email')"
          @blur="touch('email')"
        >
        <p class="mt-2 text-sm" :class="showError('email') ? 'text-red-600 font-medium' : 'text-gray-500'">
          <template v-if="showError('email')">{{ errors.email }}</template>
          <template v-else>{{ tt('mazda.emailHint', 'Mazda sends the codes here. Double-check it — we cannot change it after payment.') }}</template>
        </p>
      </div>

      <!-- VIN -->
      <div class="mt-6">
        <label for="mz-vin" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
          {{ tt('mazda.vin', 'VIN') }} <span class="text-red-500">*</span>
        </label>
        <input
          id="mz-vin"
          v-model="form.vin"
          type="text"
          autocomplete="off"
          spellcheck="false"
          maxlength="17"
          :disabled="locked"
          :placeholder="tt('mazda.vinPlaceholder', '17-DIGIT VIN')"
          class="mt-2 w-full rounded-xl border-2 px-4 py-4 font-mono text-lg sm:text-xl uppercase tracking-[0.15em] text-gray-900 transition placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-gray-300 focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
          :class="fieldClass('vin')"
          :aria-invalid="showError('vin')"
          @input="onVinInput"
          @blur="touch('vin')"
        >
        <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p :class="showError('vin') ? 'text-red-600 font-medium' : 'text-gray-500'">
            <template v-if="showError('vin')">{{ errors.vin }}</template>
            <template v-else>{{ tt('mazda.vinHint', 'All 17 characters, exactly as printed on the vehicle.') }}</template>
          </p>
          <span class="font-mono text-xs tabular-nums" :class="form.vin.length === 17 ? 'text-green-600' : 'text-gray-400'">
            {{ form.vin.length }}/17
          </span>
        </div>
      </div>

      <!-- Part number + serial -->
      <!-- One field per row, in the portal's order. Two columns would save
           space but breaks the eye's path down the label sequence that
           technicians already know from the Mazda screen. -->
      <div class="mt-6 grid gap-6">
        <div>
          <label for="mz-part" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
            {{ tt('mazda.partNumber', 'Part number') }} <span class="text-red-500">*</span>
          </label>
          <input
            id="mz-part"
            v-model="form.partNumber"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :disabled="locked"
            class="mt-2 w-full rounded-xl border-2 px-4 py-3 font-mono text-base uppercase text-gray-900 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
            :class="fieldClass('partNumber')"
            :aria-invalid="showError('partNumber')"
            @input="upper('partNumber', $event)"
            @blur="touch('partNumber')"
          >
          <p v-if="showError('partNumber')" class="mt-2 text-sm font-medium text-red-600">{{ errors.partNumber }}</p>
        </div>

        <div>
          <label for="mz-serial" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
            {{ tt('mazda.serialNumber', 'Serial number') }} <span class="text-red-500">*</span>
          </label>
          <input
            id="mz-serial"
            v-model="form.serialNumber"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :disabled="locked"
            class="mt-2 w-full rounded-xl border-2 px-4 py-3 font-mono text-base uppercase text-gray-900 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
            :class="fieldClass('serialNumber')"
            :aria-invalid="showError('serialNumber')"
            @input="upper('serialNumber', $event)"
            @blur="touch('serialNumber')"
          >
          <p v-if="showError('serialNumber')" class="mt-2 text-sm font-medium text-red-600">{{ errors.serialNumber }}</p>
        </div>
      </div>

      <!-- Reason -->
      <div class="mt-6">
        <label for="mz-reason" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
          {{ tt('mazda.reason', 'Reason') }} <span class="text-red-500">*</span>
        </label>
        <select
          id="mz-reason"
          v-model="form.reason"
          :disabled="locked"
          class="mt-2 w-full rounded-xl border-2 bg-white px-4 py-3 text-base text-gray-900 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
          :class="fieldClass('reason')"
          :aria-invalid="showError('reason')"
          @blur="touch('reason')"
        >
          <option value="">{{ tt('mazda.reasonPlaceholder', 'Please select…') }}</option>
          <option v-for="r in REASONS" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
        <p class="mt-2 text-sm" :class="showError('reason') ? 'text-red-600 font-medium' : 'text-gray-500'">
          <template v-if="showError('reason')">{{ errors.reason }}</template>
          <template v-else>{{ tt('mazda.reasonHint', 'This decides which code fields Mazda needs.') }}</template>
        </p>
      </div>

      <!-- ── 2. Primary codes ─────────────────────────────── -->
      <div class="mt-8 border-t border-gray-200 pt-6">
        <p class="text-xs font-bold uppercase tracking-wider text-gray-400">
          {{ tt('mazda.section2', '2. Primary codes') }}
        </p>

        <!-- Outcode 1 → Outcode 2 → Error control, one per row, exactly as the
             portal orders them, so a technician copying codes across reads
             them in the same sequence on both screens. -->
        <div class="mt-4 grid gap-6">
          <div>
            <label for="mz-out1" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
              {{ tt('mazda.outcode1', 'Outcode 1') }} <span class="text-red-500">*</span>
            </label>
            <input
              id="mz-out1"
              v-model="form.outCode"
              type="text"
              autocomplete="off"
              spellcheck="false"
              :disabled="locked"
              class="mt-2 w-full rounded-xl border-2 px-4 py-3 font-mono text-base uppercase tracking-widest text-gray-900 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
              :class="fieldClass('outCode')"
              :aria-invalid="showError('outCode')"
              @input="upper('outCode', $event)"
              @blur="touch('outCode')"
            >
            <p v-if="showError('outCode')" class="mt-2 text-sm font-medium text-red-600">{{ errors.outCode }}</p>
          </div>

          <!-- Outcode 2 — only for reasons that use it -->
          <div v-if="reasonConfig.outCode2">
            <label for="mz-out2" class="flex items-baseline justify-between gap-2">
              <span class="text-sm font-semibold uppercase tracking-wide text-gray-700">
                {{ tt('mazda.outcode2', 'Outcode 2') }}
              </span>
              <span class="text-xs text-gray-400">{{ tt('mazda.ifApplicable', '(if applicable)') }}</span>
            </label>
            <input
              id="mz-out2"
              v-model="form.outCode2"
              type="text"
              autocomplete="off"
              spellcheck="false"
              :disabled="locked"
              :placeholder="tt('mazda.optional', 'OPTIONAL')"
              class="mt-2 w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-mono text-base uppercase tracking-widest text-gray-900 transition placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-300 focus:border-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-500/20 disabled:bg-gray-50 disabled:text-gray-500"
              @input="upper('outCode2', $event)"
            >
            <!-- The two outcodes are halves of one code, joined before they
                 are sent. A 16-character half on its own is what the portal
                 answers NOT_FOUND to, so it is worth saying out loud. -->
            <p class="mt-2 text-sm text-gray-500">
              {{ tt('mazda.outcode2Hint', 'If the outcode is printed in two parts, enter the second part here. Leave empty if there is only one.') }}
              <span v-if="form.outCode" class="font-mono text-xs tabular-nums text-gray-400">
                ({{ (form.outCode + form.outCode2).length }} {{ tt('mazda.charsTotal', 'characters total') }})
              </span>
            </p>
          </div>

          <div>
            <label for="mz-ec" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
              {{ tt('mazda.errorControl', 'Error control') }} <span class="text-red-500">*</span>
            </label>
            <input
              id="mz-ec"
              v-model="form.errorControl"
              type="text"
              autocomplete="off"
              spellcheck="false"
              :disabled="locked"
              class="mt-2 w-full rounded-xl border-2 px-4 py-3 font-mono text-base uppercase tracking-widest text-gray-900 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
              :class="fieldClass('errorControl')"
              :aria-invalid="showError('errorControl')"
              @input="upper('errorControl', $event)"
              @blur="touch('errorControl')"
            >
            <p v-if="showError('errorControl')" class="mt-2 text-sm font-medium text-red-600">{{ errors.errorControl }}</p>
          </div>
        </div>
      </div>

      <!-- ── 3. Secondary codes (SSU) ─────────────────────── -->
      <div v-if="reasonConfig.ssu" class="mt-8 border-t border-gray-200 pt-6">
        <p class="text-xs font-bold uppercase tracking-wider text-gray-400">
          {{ tt('mazda.section3', '3. Secondary codes (SSU)') }}
        </p>

        <div class="mt-4 grid gap-6 rounded-xl bg-gray-50 p-5 ring-1 ring-gray-200">
          <div>
            <label for="mz-sout" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
              {{ tt('mazda.secondaryOutcode', 'Secondary outcode') }} <span class="text-red-500">*</span>
            </label>
            <input
              id="mz-sout"
              v-model="form.secondaryOutCode"
              type="text"
              autocomplete="off"
              spellcheck="false"
              :disabled="locked"
              class="mt-2 w-full rounded-xl border-2 bg-white px-4 py-3 font-mono text-base uppercase tracking-widest text-gray-900 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
              :class="fieldClass('secondaryOutCode')"
              :aria-invalid="showError('secondaryOutCode')"
              @input="upper('secondaryOutCode', $event)"
              @blur="touch('secondaryOutCode')"
            >
            <p v-if="showError('secondaryOutCode')" class="mt-2 text-sm font-medium text-red-600">{{ errors.secondaryOutCode }}</p>
          </div>

          <div>
            <label for="mz-sec" class="block text-sm font-semibold uppercase tracking-wide text-gray-700">
              {{ tt('mazda.secondaryErrorControl', 'Secondary error control') }} <span class="text-red-500">*</span>
            </label>
            <input
              id="mz-sec"
              v-model="form.secondaryErrorControl"
              type="text"
              autocomplete="off"
              spellcheck="false"
              :disabled="locked"
              class="mt-2 w-full rounded-xl border-2 bg-white px-4 py-3 font-mono text-base uppercase tracking-widest text-gray-900 transition focus:outline-none focus:ring-4 disabled:bg-gray-50 disabled:text-gray-500"
              :class="fieldClass('secondaryErrorControl')"
              :aria-invalid="showError('secondaryErrorControl')"
              @input="upper('secondaryErrorControl', $event)"
              @blur="touch('secondaryErrorControl')"
            >
            <p v-if="showError('secondaryErrorControl')" class="mt-2 text-sm font-medium text-red-600">{{ errors.secondaryErrorControl }}</p>
          </div>
        </div>

        <p class="mt-3 text-xs text-gray-500">
          {{ tt('mazda.ssuNote', 'A PCM Replacement is sent to Mazda as two requests. If either is refused, the whole payment is refunded.') }}
        </p>
      </div>

      <!-- ── Pay ──────────────────────────────────────────── -->
      <div v-show="!result && !rejected" class="mt-8 border-t border-gray-200 pt-6">
        <!-- A deliberate speed bump. Someone who ticks this and then disputes
             the charge has already told you the vehicle was in scope, which is
             most of a chargeback defence. Delete this block and the
             `naConfirmed &&` in canPay if you would rather not add friction. -->
        <label class="flex cursor-pointer gap-3 rounded-xl bg-gray-50 px-5 py-4 ring-1 ring-gray-200">
          <input
            v-model="naConfirmed"
            type="checkbox"
            :disabled="locked"
            class="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-orange-700 focus:ring-4 focus:ring-orange-500/20"
          >
          <span class="text-sm text-gray-700">
            {{ tt('mazda.naConfirm', 'I confirm this vehicle is USA or Canada spec. Codes are not available for any other market.') }}
          </span>
        </label>

        <div class="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-xl border-2 border-gray-200 bg-gray-50 px-5 py-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ tt('mazda.amountDue', 'Amount') }}
            </p>
            <p class="mt-1 text-2xl font-extrabold text-gray-900">{{ money(price) }}</p>
          </div>
          <p class="text-sm text-gray-600">{{ tt('mazda.oneRequest', 'One request, one VIN.') }}</p>
        </div>

        <div class="mt-5">
          <!-- The mount node stays in the DOM at all times. PayPal renders into
               it once, on page load, and the buttons sit disabled until the form
               is valid — rendering them only after a valid form meant an empty
               box for anyone who had not typed yet.
               `isolate` gives the PayPal iframe its own stacking context so it
               cannot paint over a sticky site header. -->
          <div v-show="!working" ref="paypalMount" class="relative isolate z-0 min-h-[52px]" />

          <div v-if="sdkError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p class="text-sm font-medium text-red-800">
              {{ tt('mazda.sdkError', 'The payment window could not load. Refresh the page and try again.') }}
            </p>
            <p v-if="isDev" class="mt-1 font-mono text-xs text-red-700">{{ sdkErrorHint }}</p>
          </div>
          <p v-else-if="!sdkReady" class="text-sm text-gray-500">
            {{ tt('mazda.sdkLoading', 'Loading payment options…') }}
          </p>
          <p v-else-if="!canPay" class="text-sm text-gray-500">
            {{ tt('mazda.fillFirst', 'Fill in every required field to pay.') }}
          </p>
        </div>

        <p class="mt-4 text-xs text-gray-400">
          {{ tt('mazda.submitNote', 'You are charged once. If Mazda rejects the request, the payment is refunded automatically.') }}
        </p>

        <!-- Errors sit directly under the buttons, where the customer is
             already looking, rather than at the bottom of the card. -->
        <div v-if="errorMessage" class="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4" role="alert">
          <p class="text-sm font-medium text-red-800">{{ errorMessage }}</p>
        </div>
      </div>

      <!-- Working -->
      <div v-if="working" class="mt-6 flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 px-5 py-4">
        <svg class="h-5 w-5 shrink-0 animate-spin text-orange-700" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p class="text-sm font-medium text-orange-900">
          {{ tt('mazda.workingBody', 'Payment received. Sending your request to Mazda — do not close this page.') }}
        </p>
      </div>

      <div v-if="result || rejected" class="mt-6">
        <button
          type="button"
          class="text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
          @click="reset"
        >
          {{ tt('mazda.newRequest', 'New request') }}
        </button>
      </div>
    </div>

    <!-- Mazda refused → refunded + WhatsApp -->
    <div v-if="rejected" class="mx-6 mb-6 sm:mx-8 rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-5" role="alert">
      <p class="text-base font-semibold text-amber-900">
        {{ tt('mazda.rejectedTitle', 'Mazda did not accept this request') }}
      </p>
      <p class="mt-1 text-sm text-amber-800">
        {{ refunded
          ? tt('mazda.rejectedRefunded', 'Your payment has been refunded. Contact us and we will sort it out on WhatsApp.')
          : tt('mazda.rejectedRefunding', 'Your payment is being refunded. Contact us and we will sort it out on WhatsApp.') }}
      </p>
      <p v-if="rejectReason" class="mt-2 text-sm text-amber-800">{{ rejectReason }}</p>

      <p class="mt-3 font-mono text-sm tracking-wider text-amber-900">{{ lastVin }}</p>

      <a
        :href="whatsappLink"
        target="_blank"
        rel="noopener noreferrer nofollow"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/30"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.83 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.24-.02-.38.1-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
        </svg>
        {{ tt('mazda.contactWhatsapp', 'Contact us on WhatsApp') }}
      </a>
    </div>

    <!-- Submitted -->
    <div v-if="result" class="border-t border-gray-200 bg-gray-50 px-6 py-6 sm:px-8" aria-live="polite">
      <p class="text-base font-semibold text-green-800">
        {{ tt('mazda.submittedTitle', 'Sent to Mazda') }}
      </p>
      <p class="mt-1 text-sm text-gray-600">
        {{ tt('mazda.submittedBody', 'The codes are emailed to you, usually within 15 minutes — check spam if you do not see them.') }}
      </p>

      <div class="mt-5 flex flex-wrap items-start justify-between gap-4">
        <dl class="grid gap-3 text-sm">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ tt('mazda.vin', 'VIN') }}</dt>
            <dd class="mt-1 font-mono text-xl font-bold tracking-[0.2em] text-gray-900 break-all">{{ result.vin }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ tt('mazda.reference', 'Reference') }}</dt>
            <dd class="mt-1 font-mono text-xl font-bold tracking-[0.2em] text-gray-900">{{ result.reference }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ tt('mazda.sentTo', 'Sent to') }}</dt>
            <dd class="mt-1 text-base font-semibold text-gray-900 break-all">{{ result.email }}</dd>
          </div>
        </dl>

        <button
          type="button"
          class="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-orange-500/20"
          @click="copyResult"
        >
          {{ copied ? tt('mazda.copied', 'Copied') : tt('mazda.copyAll', 'Copy details') }}
        </button>
      </div>

      <p class="mt-5 text-sm text-gray-500">
        {{ tt('mazda.keepReference', 'Keep the reference. Quote it if you need to contact us about this request.') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  /** Base path of the guest endpoints, appended to API_BASE_URL. */
  endpoint?: string
  /** Display price. The charged amount always comes from the server. */
  price?: number
  currency?: string
  /** PayPal client id. Falls back to runtimeConfig.public.PAYPAL_CLIENT_ID. */
  paypalClientId?: string
  whatsappPhone?: string
  instructionsExpanded?: boolean
  noIndex?: boolean
}>(), {
  endpoint: '/mazda-immobilizer/guest',
  price: 35,
  currency: 'USD',
  paypalClientId: '',
  whatsappPhone: '971502519501',
  instructionsExpanded: false,
  noIndex: true,
})

const emit = defineEmits<{
  (e: 'pay', payload: any): void
  (e: 'success', payload: any): void
  (e: 'error', payload: any): void
}>()

const { t, te } = useI18n()
const { public: pub } = useRuntimeConfig()
const API_BASE_URL = (pub as any).API_BASE_URL

/* Every call goes through $customApi, not $fetch. The plugin attaches the
 * api-key / secret-key headers the backend requires — a bare $fetch is
 * rejected with "you dont have permission to use this api". */
const { $customApi } = useNuxtApp()

useHead({
  title: 'Mazda immobilizer codes',
  meta: [
    { name: 'robots', content: props.noIndex ? 'noindex, nofollow, noarchive, nosnippet' : 'index, follow' },
    { name: 'googlebot', content: props.noIndex ? 'noindex, nofollow' : 'index, follow' },
  ],
})

function tt(key: string, fallback: string) {
  return te(key) ? t(key) : fallback
}

/* ─────────── reasons ───────────
 * Each reason decides which extra code fields appear. `value` is sent to the
 * API verbatim — keep it identical to what the Mazda portal expects.
 *   outCode2 : show the optional second outcode
 *   ssu      : show the secondary outcode + secondary error control pair
 *
 * Only the first two are confirmed from the portal. Delete or correct the
 * others before going live.
 */
const REASONS = [
  { value: 'Reprogram Key', label: 'Reprogram Key', outCode2: true, ssu: false },
  { value: 'PCM Replacement', label: 'PCM Replacement', outCode2: false, ssu: true },
  { value: 'All Keys Lost', label: 'All Keys Lost', outCode2: true, ssu: false },
  { value: 'Immobilizer Replacement', label: 'Immobilizer Replacement', outCode2: false, ssu: false },
] as const

const reasonConfig = computed(() =>
  REASONS.find(r => r.value === form.reason) ?? { outCode2: false, ssu: false })

/* ─────────── state ─────────── */
const form = reactive({
  email: '',
  vin: '',
  partNumber: '',
  serialNumber: '',
  reason: '',
  outCode: '',
  outCode2: '',
  errorControl: '',
  secondaryOutCode: '',
  secondaryErrorControl: '',
})

/** Ticked to confirm the vehicle is in scope. Kept out of `form` because it is
 *  an acknowledgement, not data the portal receives. */
const naConfirmed = ref(false)

const touched = reactive<Record<string, boolean>>({})
const working = ref(false)
const copied = ref(false)
const errorMessage = ref('')
const rejected = ref(false)
const refunded = ref(false)
const rejectReason = ref('')
const lastVin = ref('')
const instructionsOpen = ref(props.instructionsExpanded)

const sdkReady = ref(false)
const sdkError = ref(false)
const sdkErrorReason = ref('')
const paypalMount = ref<HTMLElement | null>(null)

/** Reference + secret for the order currently in flight. */
const order = ref<{ reference: string, accessToken: string } | null>(null)

const result = ref<{ vin: string, reference: string, email: string } | null>(null)

const locked = computed(() => working.value || !!result.value || rejected.value)

const steps = computed(() => [
  {
    title: tt('mazda.step1Title', 'Enter the vehicle data'),
    body: tt('mazda.step1Body', 'VIN, part number, serial number and the codes from the module. Pick the reason that matches the job.'),
  },
  {
    title: tt('mazda.step2Title', 'Pay with PayPal'),
    body: tt('mazda.step2Body', 'No account with us is required. Pay with your PayPal balance or any card PayPal accepts.'),
  },
  {
    title: tt('mazda.step3Title', 'Get the codes by email'),
    body: tt('mazda.step3Body', 'We forward the request to Mazda. The codes arrive at the address you entered.'),
  },
])

/* ─────────── validation ─────────── */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const errors = computed<Record<string, string>>(() => {
  const e: Record<string, string> = {}

  if (!form.email) e.email = tt('mazda.emailRequired', 'Enter the email that should receive the codes.')
  else if (!EMAIL_RE.test(form.email)) e.email = tt('mazda.emailInvalid', 'Check this email address.')

  if (!form.vin) e.vin = tt('mazda.vinRequired', 'Enter the VIN.')
  else if (!VIN_RE.test(form.vin)) e.vin = tt('mazda.vinInvalid', 'A VIN is exactly 17 characters and never contains I, O or Q.')

  if (!form.partNumber) e.partNumber = tt('mazda.partRequired', 'Enter the part number.')
  if (!form.serialNumber) e.serialNumber = tt('mazda.serialRequired', 'Enter the serial number.')
  if (!form.reason) e.reason = tt('mazda.reasonRequired', 'Pick a reason.')
  if (!form.outCode) e.outCode = tt('mazda.outcodeRequired', 'Enter outcode 1.')
  if (!form.errorControl) e.errorControl = tt('mazda.errorControlRequired', 'Enter the error control number.')

  // The API rejects one SSU field without the other, so mirror that here.
  if (reasonConfig.value.ssu) {
    if (!form.secondaryOutCode) e.secondaryOutCode = tt('mazda.secondaryOutcodeRequired', 'Enter the secondary outcode.')
    if (!form.secondaryErrorControl) e.secondaryErrorControl = tt('mazda.secondaryErrorControlRequired', 'Enter the secondary error control.')
  }

  return e
})

const formValid = computed(() => Object.keys(errors.value).length === 0)
const canPay = computed(() => formValid.value && naConfirmed.value && !locked.value)

function touch(field: string) { touched[field] = true }
function touchAll() { Object.keys(form).forEach(k => (touched[k] = true)) }
function showError(field: string) { return !!touched[field] && !!errors.value[field] }

function fieldClass(field: string) {
  return showError(field)
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
    : 'border-gray-200 focus:border-orange-600 focus:ring-orange-500/20'
}

/** The first problem in visual order — what the pay button complains about. */
const firstError = computed(() => {
  const fields = ['email', 'vin', 'partNumber', 'serialNumber', 'reason', 'outCode', 'errorControl', 'secondaryOutCode', 'secondaryErrorControl']
  const key = fields.find(k => errors.value[k])
  if (key) return errors.value[key]
  if (!naConfirmed.value) {
    return tt('mazda.naConfirmRequired', 'Confirm the vehicle is USA or Canada spec before paying.')
  }
  return ''
})

/* ─────────── input handling ─────────── */
function onVinInput(e: Event) {
  const el = e.target as HTMLInputElement
  const clean = el.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17)
  form.vin = clean
  el.value = clean
  clearFeedback()
}

function upper(field: keyof typeof form, e: Event) {
  const el = e.target as HTMLInputElement
  const clean = el.value.toUpperCase().replace(/\s+/g, '')
  ;(form as any)[field] = clean
  el.value = clean
  clearFeedback()
}

function clearFeedback() {
  errorMessage.value = ''
  rejected.value = false
  refunded.value = false
  rejectReason.value = ''
}

// Switching reason hides fields that no longer apply — clear them so stale
// values never reach the API.
watch(() => form.reason, () => {
  if (!reasonConfig.value.outCode2) form.outCode2 = ''
  if (!reasonConfig.value.ssu) {
    form.secondaryOutCode = ''
    form.secondaryErrorControl = ''
  }
  clearFeedback()
})

function money(value: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: props.currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${props.currency} ${value}`
  }
}

/* ─────────── WhatsApp fallback ─────────── */
const whatsappLink = computed(() => {
  const message = `${tt('mazda.waMessage', 'Hello, my Mazda immobilizer request was rejected for this VIN')}: ${lastVin.value}`
  return `https://api.whatsapp.com/send?phone=${props.whatsappPhone}&text=${encodeURIComponent(message)}`
})

/* ─────────── the payload ───────────
 * Built once, sent at createOrder. The server stores it and replays it to the
 * Mazda portal after capture — the browser never gets a second say. Field
 * names match the Laravel validator exactly.
 */
function payload() {
  const body: Record<string, string> = {
    vin: form.vin,
    part_number: form.partNumber,
    serial_number: form.serialNumber,
    reason: form.reason,
    out_code: form.outCode,
    error_control_number: form.errorControl,
    destination_email: form.email,
  }
  if (reasonConfig.value.outCode2 && form.outCode2) body.out_code_2 = form.outCode2
  if (reasonConfig.value.ssu) {
    body.secondary_out_code = form.secondaryOutCode
    body.secondary_error_control = form.secondaryErrorControl
  }
  return body
}

/* ─────────── PayPal SDK ─────────── */
/* Deliberately NO fallback to the site-wide PAYPAL_CLIENT_ID. That id belongs
 * to the live shop app; borrowing it here while the server is on sandbox makes
 * PayPal open paypal.com/checkoutnow, fail to find the sandbox order, and show
 * "Things don't appear to be working at the moment." An empty id gives a clear
 * error instead of a broken checkout. */
const clientId = computed(() =>
  props.paypalClientId || (pub as any).PAYPAL_MAZDA_CLIENT_ID || '')

const isDev = import.meta.dev === true

const sdkErrorHint = computed(() => {
  switch (sdkErrorReason.value) {
    case 'no-client-id':
      return 'No client id reached the browser. Set runtimeConfig.public.PAYPAL_CLIENT_ID (env: NUXT_PUBLIC_PAYPAL_CLIENT_ID) or pass :paypal-client-id.'
    case 'script-blocked':
      return `Script blocked or rejected: https://www.paypal.com/sdk/js?client-id=${clientId.value.slice(0, 8)}… — check the Network tab, ad blockers, and your CSP.`
    case 'ineligible':
      return `No eligible funding source for currency ${props.currency}. Check the currency and that the account is a live/sandbox business account.`
    case 'render-failed':
      return 'Buttons.render() threw. See the console.'
    default:
      return ''
  }
})

/* The PayPal SDK normally installs itself as window.paypal — one global for the
 * whole page. If anything else on the site (the PIN checkout, a plugin, the
 * header) loaded it first with a different client id, reusing that global gives
 * this page someone else's account and mode: sandbox order, live popup, "Things
 * don't appear to be working at the moment."
 *
 * data-namespace makes PayPal install under window.paypalMazda instead, so this
 * component always gets an SDK built with ITS client id. Two SDK instances on
 * one page is supported and is exactly what the attribute is for. */
const SDK_NAMESPACE = 'paypalMazda'
const SDK_PROMISE_KEY = '__paypalMazdaSdkPromise'

/** The exact script URL in use. Shown in dev so you can read the client id
 *  without digging through the Network tab. */
const sdkUrl = ref('')

function loadPayPal(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  const w = window as any
  if (w[SDK_NAMESPACE]) return Promise.resolve(w[SDK_NAMESPACE])
  if (w[SDK_PROMISE_KEY]) return w[SDK_PROMISE_KEY]

  w[SDK_PROMISE_KEY] = new Promise((resolve, reject) => {
    if (!clientId.value) {
      reject(new Error('no-client-id'))
      return
    }
    const params = new URLSearchParams({
      'client-id': clientId.value,
      currency: props.currency,
      intent: 'capture',
      components: 'buttons',
      'disable-funding': 'credit,paylater',
    })
    const src = `https://www.paypal.com/sdk/js?${params.toString()}`
    sdkUrl.value = src

    if (isDev) {
      console.info('[MAZDA] loading PayPal SDK', src)
    }

    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.setAttribute('data-namespace', SDK_NAMESPACE)
    s.onload = () => (w[SDK_NAMESPACE] ? resolve(w[SDK_NAMESPACE]) : reject(new Error('script-blocked')))
    s.onerror = () => reject(new Error('script-blocked'))
    document.head.appendChild(s)
  })

  // A rejected promise must not stay cached, or every later attempt in this
  // page session replays the same failure without retrying the script.
  w[SDK_PROMISE_KEY].catch(() => { delete w[SDK_PROMISE_KEY] })

  return w[SDK_PROMISE_KEY]
}

let buttonsInstance: any = null

async function mountButtons() {
  if (!paypalMount.value || buttonsInstance) return

  let paypal: any
  try {
    paypal = await loadPayPal()
    sdkReady.value = true
  } catch (e: any) {
    sdkError.value = true
    sdkErrorReason.value = e?.message === 'no-client-id' ? 'no-client-id' : 'script-blocked'
    console.error('[MAZDA] PayPal SDK failed to load.', e)
    emit('error', e)
    return
  }

  buttonsInstance = paypal.Buttons({
    style: { layout: 'vertical', shape: 'rect', color: 'gold', label: 'paypal', height: 48 },

    // Rendered once and gated by enable/disable — PayPal's supported way.
    // Re-rendering on every keystroke is slow and flickers.
    onInit: (_data: any, actions: any) => {
      const sync = () => (canPay.value ? actions.enable() : actions.disable())
      sync()
      watch(canPay, sync)
    },

    onClick: (_data: any, actions: any) => {
      touchAll()
      if (!canPay.value) {
        errorMessage.value = firstError.value
        return actions.reject()
      }
      return actions.resolve()
    },

    // Ask OUR server for the order. It sets the price — the browser never does.
    createOrder: async () => {
      touchAll()
      if (!canPay.value) throw new Error('invalid input')

      clearFeedback()

      // retry:0 matters here — the plugin retries once by default, and a
      // retried POST would open a second PayPal order for the same form.
      const res: any = await $customApi(`${props.endpoint}/orders`, {
        method: 'POST',
        body: payload(),
        retry: 0,
      })

      order.value = { reference: res.reference, accessToken: res.access_token }
      lastVin.value = form.vin
      rememberOrder()
      instructionsOpen.value = false

      emit('pay', res)

      return res.paypal_order_id
    },

    onApprove: async () => {
      working.value = true
      try {
        await captureOrder()
      } finally {
        working.value = false
      }
    },

    onCancel: () => {
      errorMessage.value = tt('mazda.paymentCancelled', 'Payment cancelled. Nothing was charged.')
    },

    onError: (err: any) => {
      // createOrder throws land here too, so prefer a specific message.
      errorMessage.value = firstError.value
        || tt('mazda.payError', 'The payment could not be started. Try again in a moment.')
      emit('error', err)
    },
  })

  if (buttonsInstance.isEligible?.() === false) {
    sdkError.value = true
    sdkErrorReason.value = 'ineligible'
    console.error('[MAZDA] No PayPal funding source is eligible.')
    return
  }

  try {
    await buttonsInstance.render(paypalMount.value)
  } catch (e) {
    sdkError.value = true
    sdkErrorReason.value = 'render-failed'
    console.error('[MAZDA] PayPal buttons failed to render.', e)
  }
}

/* ─────────── capture + result ───────────
 * Response shapes come straight from GuestMazdaController:
 *   200 { status: 'submitted', reference, vin, destination_email }
 *   400 { rejected: true, refunded, error }   → Mazda refused, money returned
 *   400 { error }                             → payment did not complete
 *   202 { error }                             → PayPal still reviewing
 *   502 { error }                             → capture unconfirmed, retryable
 */
async function captureOrder() {
  if (!order.value) return

  try {
    const res: any = await $customApi(
      `${API_BASE_URL}${props.endpoint}/orders/${order.value.reference}/capture`,
      { method: 'POST', headers: { 'X-Order-Token': order.value.accessToken }, retry: 0 },
    )
    applyOrderState(res)
  } catch (err: any) {
    const status = err?.status ?? err?.statusCode ?? err?.response?.status
    const body = err?.data ?? err?.response?._data ?? {}

    // Mazda refused and the server has already refunded — show the WhatsApp
    // panel, not a hard error.
    if (body?.rejected) {
      applyOrderState(body)
      return
    }

    if (status === 202) {
      errorMessage.value = body?.error
        || tt('mazda.pendingReview', 'PayPal is still reviewing this payment. We will send your request as soon as it clears.')
      return
    }

    errorMessage.value = body?.error
      || body?.message   // middleware errors (auth, api-key) use `message`
      || tt('mazda.captureError', 'We could not confirm the payment. Contact us with your PayPal receipt and we will sort it out.')
    emit('error', err)
    // status 0 / undefined here means the browser blocked it — usually CORS,
    // and usually a missing X-Order-Token in allowed_headers.
    console.error('[MAZDA] capture failed', { status, body, err })
  }
}

function applyOrderState(body: any) {
  if (body?.status === 'submitted') {
    result.value = {
      vin: String(body.vin ?? lastVin.value),
      reference: String(body.reference ?? order.value?.reference ?? ''),
      email: String(body.destination_email ?? form.email ?? ''),
    }
    rejected.value = false
    errorMessage.value = ''
    forgetOrder()
    emit('success', body)
    return
  }

  if (body?.rejected || ['rejected', 'refunded', 'failed'].includes(body?.status)) {
    rejected.value = true
    refunded.value = body?.status === 'refunded' || Boolean(body?.refunded)
    rejectReason.value = String(body?.error ?? '')
    forgetOrder()
    emit('error', body)
  }
}

/* ─────────── recovery after a refresh ─────────── */
const STORAGE_KEY = 'tlk.mazdaOrder'

function rememberOrder() {
  try {
    if (order.value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...order.value,
        vin: form.vin,
        email: form.email,
        at: Date.now(),
      }))
    }
  } catch { /* private mode, ignore */ }
}

function forgetOrder() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

async function recoverOrder() {
  let saved: any = null
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch { return }

  // Anything older than an hour is not worth chasing.
  if (!saved?.reference || !saved?.accessToken || Date.now() - (saved.at ?? 0) > 3600_000) {
    forgetOrder()
    return
  }

  order.value = { reference: saved.reference, accessToken: saved.accessToken }
  form.vin = saved.vin ?? ''
  form.email = saved.email ?? ''
  lastVin.value = saved.vin ?? ''

  try {
    const res: any = await $customApi(`${props.endpoint}/orders/${saved.reference}`, {
      headers: { 'X-Order-Token': saved.accessToken },
    })

    // 'pending' means they never finished paying — let them start over.
    // 'capturing' means a capture is mid-flight somewhere; leave it alone.
    if (res?.status === 'pending' || res?.status === 'capturing') {
      forgetOrder()
      return
    }

    applyOrderState(res)
  } catch {
    forgetOrder()
  }
}

/* ─────────── copy ─────────── */
async function copyResult() {
  if (!result.value) return

  const lines = [
    `VIN: ${result.value.vin}`,
    `REFERENCE: ${result.value.reference}`,
    `EMAIL: ${result.value.email}`,
  ]

  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { copied.value = false }
}

function reset() {
  Object.keys(form).forEach(k => ((form as any)[k] = ''))
  Object.keys(touched).forEach(k => (touched[k] = false))
  naConfirmed.value = false
  lastVin.value = ''
  result.value = null
  order.value = null
  working.value = false
  clearFeedback()
  forgetOrder()
  nextTick(mountButtons)
}

onMounted(async () => {
  await recoverOrder()
  if (!result.value && !rejected.value) await mountButtons()
})

defineExpose({ reset, recoverOrder })
</script>