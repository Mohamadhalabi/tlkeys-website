<template>
  <!-- Fixed header (no hide on scroll) -->
  <header
    id="app-header"
    ref="hdrRef"
    class="fixed left-0 right-0 z-40"
    :style="{ top: 'env(safe-area-inset-top, 0px)' }"
  >
    <!-- Row 1: top white bar -->
    <div class="row-top bg-white py-2 shadow-sm">
      <div class="mx-auto px-4 flex items-center justify-between">
        <!-- Hamburger (mobile only, bigger) -->
        <button
          class="lg:hidden mr-3 text-gray-700"
          aria-label="Menu"
          @click="drawerOpen = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <!-- Logo -->
        <NuxtLinkLocale to="/" class="flex items-center">
          <NuxtImg
            src="/images/logo/techno-lock-desktop-logo.webp"
            alt="Logo"
            class="h-16 object-contain"
          />
        </NuxtLinkLocale>

        <!-- Right icons -->
        <div class="flex items-center gap-3 ml-auto">
          <NuxtLinkLocale to="/account" class="flex items-center">
            <UserPlusIcon class="w-6 h-6 text-gray-700" />
          </NuxtLinkLocale>
          <NuxtLinkLocale to="/cart" class="relative flex items-center">
            <ShoppingCartIcon class="w-6 h-6 text-gray-700" />
          </NuxtLinkLocale>
        </div>
      </div>
    </div>

    <hr />

    <!-- Row 2: mobile search -->
    <div class="row-search bg-white lg:hidden shadow-lg">
      <div class="px-4 py-2">
        <div class="relative" ref="searchWrap">
          <div class="flex rounded-full overflow-hidden bg-white border border-gray-300 focus-within:ring-2 focus-within:ring-emerald-400">
            <input
              ref="searchInput"
              v-model="term"
              type="text"
              class="flex-1 px-4 py-2 text-sm text-gray-900 focus:outline-none"
              :placeholder="typedText"
              @keydown.down.prevent="move(1)"
              @keydown.up.prevent="move(-1)"
              @keydown.enter.prevent="goToShop"
              @focus="onFocus"
            />
            <button class="px-4 flex items-center justify-center bg-orange-600 text-white" @click="goToShop()">
              <MagnifyingGlassIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Suggestions -->
          <transition name="fade">
            <div
              v-if="open && (loading || error || suggestions.length || hasMore)"
              class="absolute left-0 right-0 z-[99999] mt-2 rounded-xl border bg-white text-gray-900 shadow-2xl overflow-hidden"
              @mousedown.prevent
            >
              <div v-if="loading" class="px-4 py-3 text-sm text-gray-500">Loading…</div>
              <div v-else-if="error" class="px-4 py-3 text-sm text-red-600">{{ error }}</div>

              <template v-else>
                <ul v-if="suggestions.length" role="listbox" :aria-activedescendant="activeId" class="max-h-96 overflow-auto">
                  <li
                    v-for="(p, idx) in suggestions"
                    :id="`sug-${idx}`"
                    :key="p.id ?? p.slug ?? idx"
                    role="option"
                    :aria-selected="idx === active"
                    @mouseenter="active = idx"
                    @mouseleave="active = -1"
                    @click="pick(p)"
                    class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                    :class="idx === active ? 'bg-gray-100' : ''"
                  >
                    <NuxtImg v-if="p.image" :src="p.image" width="80" height="80" class="rounded border object-cover shrink-0" />
                    <div class="min-w-0 flex-1">
                      <div class="text-md font-medium line-clamp-4" v-html="highlight(p.title)"></div>
                      <div class="text-sm font-bold text-green-700 line-clamp-1" v-if="p.sku" v-html="highlight('SKU: ' + p.sku)"></div>
                    </div>
                    <!-- price block -->
                    <div v-if="!p.hide_price" class="text-right whitespace-nowrap">
                      <div class="text-base font-semibold text-red-700">
                        {{ formatMoney(p.price) }}
                      </div>
                      <div v-if="p.old_price && p.old_price > p.price" class="text-xs text-gray-500 line-through">
                        {{ formatMoney(p.old_price) }}
                      </div>
                    </div>

                    <!-- WhatsApp CTA when price is hidden -->
                    <a
                      v-else
                      :href="waLink(p)"
                      target="_blank"
                      rel="noopener"
                      class="inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 text-xs font-semibold whitespace-nowrap"
                      @click.stop
                      :aria-label="t('search.contactOnWhatsApp')"
                    >
                      <svg id='WhatsApp_24' width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'><rect width='24' height='24' stroke='none' fill='#000000' opacity='0'/>
                      <g transform="matrix(0.42 0 0 0.42 12 12)" >
                      <g style="" >
                      <g transform="matrix(1 0 0 1 -0.07 0.15)" >
                      <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" transform=" translate(-23.93, -24.15)" d="M 4.868 43.303 L 7.562 33.467999999999996 C 5.9 30.59 5.026 27.324 5.027 23.979 C 5.032 13.514 13.548 5 24.014 5 C 29.093 5.002 33.859 6.979 37.444 10.565999999999999 C 41.028000000000006 14.154 43.002 18.921999999999997 43 23.994 C 42.996 34.459 34.478 42.974000000000004 24.014 42.974000000000004 C 24.012999999999998 42.974000000000004 24.014 42.974000000000004 24.014 42.974000000000004 L 24.006 42.974000000000004 C 20.829 42.973000000000006 17.706 42.176 14.933 40.663000000000004 L 4.868 43.303 z" stroke-linecap="round" />
                      </g>
                      <g transform="matrix(1 0 0 1 -0.07 0.15)" >
                      <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: nonzero; opacity: 1;" transform=" translate(-23.93, -24.15)" d="M 4.868 43.803 C 4.736000000000001 43.803 4.6080000000000005 43.751 4.513 43.654999999999994 C 4.388 43.52799999999999 4.3389999999999995 43.342999999999996 4.386 43.172 L 7.025 33.536 C 5.389 30.630000000000003 4.526 27.330000000000002 4.5280000000000005 23.980000000000004 C 4.532 13.238 13.273 4.5 24.014 4.5 C 29.224 4.502 34.119 6.531000000000001 37.798 10.213000000000001 C 41.477000000000004 13.896 43.502 18.79 43.5 23.994 C 43.496 34.735 34.754 43.474000000000004 24.014 43.474000000000004 C 20.825 43.473000000000006 17.669999999999998 42.68600000000001 14.87 41.197 L 4.994999999999999 43.786 C 4.953 43.798 4.911 43.803 4.868 43.803 z" stroke-linecap="round" />
                      </g>
                      <g transform="matrix(1 0 0 1 -0.07 0.15)" >
                      <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(207,216,220); fill-rule: nonzero; opacity: 1;" transform=" translate(-23.93, -24.15)" d="M 24.014 5 C 29.093 5.002 33.859 6.979 37.444 10.565999999999999 C 41.028000000000006 14.154 43.002 18.921999999999997 43 23.994 C 42.996 34.459 34.478 42.974000000000004 24.014 42.974000000000004 L 24.006 42.974000000000004 C 20.829 42.973000000000006 17.706 42.176 14.933 40.663000000000004 L 4.868 43.303 L 7.562 33.467999999999996 C 5.9 30.59 5.026 27.324 5.027 23.979 C 5.032 13.514 13.548 5 24.014 5 M 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 M 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 C 24.014 42.974 24.014 42.974 24.014 42.974 M 24.014 4 C 24.014 4 24.014 4 24.014 4 C 12.998 4 4.032 12.962 4.027 23.979 C 4.026 27.346 4.876 30.663999999999998 6.4879999999999995 33.601 L 3.9029999999999996 43.04 C 3.8089999999999997 43.385 3.9049999999999994 43.753 4.157 44.007 C 4.347 44.199 4.604 44.303999999999995 4.868 44.303999999999995 C 4.953 44.303999999999995 5.038 44.29299999999999 5.122 44.270999999999994 L 14.809 41.730999999999995 C 17.637 43.199 20.807 43.974 24.006 43.974999999999994 C 35.03 43.974999999999994 43.995999999999995 35.01199999999999 44.001000000000005 23.994999999999994 C 44.00300000000001 18.65599999999999 41.926 13.635999999999994 38.153000000000006 9.859999999999994 C 34.378 6.083 29.357 4.002 24.014 4 L 24.014 4 z" stroke-linecap="round" />
                      </g>
                      <g transform="matrix(1 0 0 1 0.01 -0.01)" >
                      <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(64,195,81); fill-rule: nonzero; opacity: 1;" transform=" translate(-24.01, -23.99)" d="M 35.176 12.832 C 32.196000000000005 9.850000000000001 28.235000000000003 8.207 24.019000000000002 8.206 C 15.315000000000001 8.206 8.236000000000002 15.282 8.232000000000001 23.979999999999997 C 8.231000000000002 26.961 9.065000000000001 29.862999999999996 10.645000000000001 32.376 L 11.021 32.973 L 9.426 38.794 L 15.399000000000001 37.227999999999994 L 15.976 37.56999999999999 C 18.398 39.007999999999996 21.176000000000002 39.767999999999994 24.008000000000003 39.76899999999999 L 24.014000000000003 39.76899999999999 C 32.712 39.76899999999999 39.791000000000004 32.69199999999999 39.794000000000004 23.99299999999999 C 39.795 19.778 38.156 15.814 35.176 12.832 z" stroke-linecap="round" />
                      </g>
                      <g transform="matrix(1 0 0 1 0.01 0.16)" >
                      <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: rgb(255,255,255); fill-rule: evenodd; opacity: 1;" transform=" translate(-24.01, -24.16)" d="M 19.268 16.045 C 18.913 15.255000000000003 18.539 15.239 18.2 15.225000000000001 C 17.923 15.213000000000001 17.607 15.214000000000002 17.291 15.214000000000002 C 16.975 15.214000000000002 16.461000000000002 15.333000000000002 16.026 15.808000000000002 C 15.591 16.283 14.365 17.430000000000003 14.365 19.764000000000003 C 14.365 22.098000000000003 16.065 24.354000000000003 16.302 24.67 C 16.538999999999998 24.986 19.584 29.929000000000002 24.406 31.831000000000003 C 28.412999999999997 33.411 29.229 33.097 30.098999999999997 33.018 C 30.968999999999998 32.939 32.906 31.871000000000002 33.300999999999995 30.763 C 33.696 29.655 33.696 28.706000000000003 33.577999999999996 28.508000000000003 C 33.458999999999996 28.310000000000002 33.142999999999994 28.192000000000004 32.669 27.954000000000004 C 32.195 27.716000000000005 29.862 26.569000000000003 29.426999999999996 26.411000000000005 C 28.991999999999997 26.253000000000004 28.675999999999995 26.174000000000007 28.358999999999995 26.649000000000004 C 28.042999999999996 27.123000000000005 27.133999999999993 28.192000000000004 26.856999999999996 28.508000000000003 C 26.579999999999995 28.825000000000003 26.302999999999997 28.865000000000002 25.828999999999997 28.627000000000002 C 25.354999999999997 28.389000000000003 23.826999999999998 27.889000000000003 22.013999999999996 26.273000000000003 C 20.603999999999996 25.016000000000002 19.651999999999994 23.463000000000005 19.374999999999996 22.988000000000003 C 19.097999999999995 22.514000000000003 19.344999999999995 22.257 19.582999999999995 22.020000000000003 C 19.795999999999996 21.807000000000002 20.056999999999995 21.466000000000005 20.294999999999995 21.189000000000004 C 20.531999999999993 20.912000000000003 20.610999999999994 20.714000000000002 20.768999999999995 20.398000000000003 C 20.926999999999996 20.081000000000003 20.847999999999995 19.804000000000002 20.728999999999996 19.567000000000004 C 20.612 19.329 19.69 16.983 19.268 16.045 z" stroke-linecap="round" />
                      </g>
                      </g>
                      </g>
                      </svg>
                      {{ t('search.contactOnWhatsApp') }}
                    </a>

                  </li>

                  <li v-if="hasMore || totalResults > suggestions.length" class="border-t">
                    <NuxtLinkLocale
                      :to="`/shop?search=${encodeURIComponent(term.trim())}`"
                      class="block px-3 py-2 text-emerald-700 hover:bg-emerald-50 text-sm text-center font-medium"
                      @click="open=false"
                    >
                      Show more results<span v-if="totalResults"> ({{ totalResults }})</span>
                    </NuxtLinkLocale>
                  </li>
                </ul>

                <div v-else class="px-4 py-3 text-sm text-gray-500">
                  No results
                </div>
              </template>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </header>

  <!-- Spacer equals header height (prevents CLS) -->
  <div :style="{ height: `calc(var(--hdr-h, 0px) * 0.6)` }"></div>

  <!-- Page content -->
  <slot />

  <!-- Drawer: accordion mega menu -->
  <transition name="slide">
    <div v-if="drawerOpen" class="fixed inset-0 z-50 flex" @click.self="drawerOpen = false">
      <!-- Panel -->
      <div class="bg-white text-gray-900 w-80 max-w-full h-full shadow-lg overflow-y-auto">
        <!-- Close row -->
        <div class="flex items-center justify-between p-4 border-b">
          <span class="text-orange-600 font-bold">Techno Lock Keys Trading</span>
          <button class="p-2 text-gray-700" @click="drawerOpen = false">✕</button>
        </div>

        <!-- Simple links -->
        <nav class="px-1 ">
          <ul class=" divide-y">
            <li>
              <NuxtLinkLocale
                class="block px-3 py-3 hover:bg-gray-50"
                to="/"
                @click="close"
              >
                {{ t('header.home') }}
              </NuxtLinkLocale>
            </li>
          </ul>
        </nav>
        <hr />
        <!-- ACCORDION -->
        <div class="divide-y">
          <!-- Cars -->
          <section>
            <button class="w-full flex items-center justify-between px-4 py-3 font-medium" @click="toggleCars">
              <span>{{ $t('cars') || 'Cars' }}</span>
              <svg class="w-4 h-4 transition-transform" :class="openCars ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/></svg>
            </button>
            <div v-if="openCars" class="px-4 pb-4">
              <div v-if="loadingCars" class="text-sm text-gray-500">{{ $t('loading') || 'Loading…' }}</div>
              <div v-else-if="errorCars" class="text-sm text-red-600">{{ errorCars }}</div>
              <div v-else class="grid grid-cols-2 gap-3">
                <button
                  v-for="item in filteredCars"
                  :key="item.slug"
                  class="group flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                  @click="goToBrand(item.slug)"
                >
                  <NuxtImg :src="item.image" :alt="item.name" class="h-16 w-16 object-contain" />
                  <span class="text-xs text-gray-800 line-clamp-1">{{ item.name }}</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Manufacturers -->
          <section>
            <button class="w-full flex items-center justify-between px-4 py-3 font-medium" @click="toggleManufacturers">
              <span>{{ $t('manufacturers') || 'Manufacturers' }}</span>
              <svg class="w-4 h-4 transition-transform" :class="openManufacturers ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/></svg>
            </button>
            <div v-if="openManufacturers" class="px-4 pb-4">
              <div v-if="loadingManufacturers" class="text-sm text-gray-500">{{ $t('loading') || 'Loading…' }}</div>
              <div v-else-if="errorManufacturers" class="text-sm text-red-600">{{ errorManufacturers }}</div>
              <div v-else class="grid grid-cols-2 gap-3">
                <button
                  v-for="item in filteredManufacturers"
                  :key="item.slug"
                  class="group flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                  @click="goToBrand(item.slug)"
                >
                  <NuxtImg :src="item.image" :alt="item.name" class="h-16 w-16 object-contain" />
                  <span class="text-xs text-gray-800 line-clamp-1">{{ item.name }}</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Keys & Remotes -->
          <section>
            <button class="w-full flex items-center justify-between px-4 py-3 font-medium" @click="toggleKeys">
              <span>{{ $t('keysRemotes') || 'Keys & Remotes' }}</span>
              <svg class="w-4 h-4 transition-transform" :class="openKeys ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/></svg>
            </button>
            <div v-if="openKeys" class="px-4 pb-4">
              <div v-if="loadingKeys" class="text-sm text-gray-500">{{ $t('loading') || 'Loading…' }}</div>
              <div v-else-if="errorKeys" class="text-sm text-red-600">{{ errorKeys }}</div>
              <div v-else class="grid grid-cols-2 gap-3">
                <button
                  v-for="item in filteredKeys"
                  :key="item.slug"
                  class="group flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                  @click="goToBrand(item.slug)"
                >
                  <NuxtImg :src="item.image" :alt="item.name" class="h-16 w-16 object-contain" />
                  <span class="text-xs text-gray-800 line-clamp-1">{{ item.name }}</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Devices & Machines -->
          <section>
            <button class="w-full flex items-center justify-between px-4 py-3 font-medium" @click="toggleDevices">
              <span>{{ $t('devicesMachines') || 'Devices & Machines' }}</span>
              <svg class="w-4 h-4 transition-transform" :class="openDevices ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/></svg>
            </button>
            <div v-if="openDevices" class="px-4 pb-4">
              <div v-if="loadingDevices" class="text-sm text-gray-500">{{ $t('loading') || 'Loading…' }}</div>
              <div v-else-if="errorDevices" class="text-sm text-red-600">{{ errorDevices }}</div>
              <div v-else class="grid grid-cols-2 gap-3">
                <button
                  v-for="item in filteredDevices"
                  :key="item.slug"
                  class="group flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                  @click="goToBrand(item.slug)"
                >
                  <NuxtImg :src="item.image" :alt="item.name" class="h-16 w-16 object-contain" />
                  <span class="text-xs text-gray-800 line-clamp-1">{{ item.name }}</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Accessories & Tools -->
          <section>
            <button class="w-full flex items-center justify-between px-4 py-3 font-medium" @click="toggleAccessories">
              <span>{{ $t('accessoriesTools') || 'Accessories & Tools' }}</span>
              <svg class="w-4 h-4 transition-transform" :class="openAccessories ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/></svg>
            </button>
            <div v-if="openAccessories" class="px-4 pb-4">
              <div v-if="loadingAccessories" class="text-sm text-gray-500">{{ $t('loading') || 'Loading…' }}</div>
              <div v-else-if="errorAccessories" class="text-sm text-red-600">{{ errorAccessories }}</div>
              <div v-else class="grid grid-cols-2 gap-3">
                <button
                  v-for="item in filteredAccessories"
                  :key="item.slug"
                  class="group flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                  @click="goToBrand(item.slug)"
                >
                  <NuxtImg :src="item.image" :alt="item.name" class="h-16 w-16 object-contain" />
                  <span class="text-xs text-gray-800 line-clamp-1">{{ item.name }}</span>
                </button>
              </div>
            </div>
          </section>

          <!-- Software & Tokens (two blocks) -->
          <section>
            <button class="w-full flex items-center justify-between px-4 py-3 font-medium" @click="toggleSoftTok">
              <span>{{ $t('softwareTokens') || 'Software & Tokens' }}</span>
              <svg class="w-4 h-4 transition-transform" :class="openSoftTok ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd"/></svg>
            </button>
            <div v-if="openSoftTok" class="px-4 pb-4">
              <div v-if="loadingSoftTok" class="text-sm text-gray-500">{{ $t('loading') || 'Loading…' }}</div>
              <div v-else-if="errorSoftTok" class="text-sm text-red-600">{{ errorSoftTok }}</div>

              <div v-else class="grid grid-cols-1 gap-6">
                <div>
                  <h4 class="mb-2 font-semibold text-gray-900">{{ $t('softwares') || 'Softwares' }}</h4>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      v-for="item in filteredSoftwares"
                      :key="'soft-'+item.slug"
                      class="group flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                      @click="goToBrand(item.slug)"
                    >
                      <NuxtImg :src="item.image" :alt="item.name" class="h-16 w-16 object-contain" />
                      <span class="text-xs text-gray-800 line-clamp-1">{{ item.name }}</span>
                    </button>
                  </div>
                </div>
                <div>
                  <h4 class="mb-2 font-semibold text-gray-900">{{ $t('tokens') || 'Tokens' }}</h4>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      v-for="item in filteredTokens"
                      :key="'tok-'+item.slug"
                      class="group flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                      @click="goToBrand(item.slug)"
                    >
                      <NuxtImg :src="item.image" :alt="item.name" class="h-16 w-16 object-contain" />
                      <span class="text-xs text-gray-800 line-clamp-1">{{ item.name }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <!-- Links under Software & Tokens -->
          <div class="">
            <ul class="divide-y">
              <li>
                <NuxtLinkLocale
                  to="/downloads"
                  class="block px-3 py-3 hover:bg-gray-50"
                  @click="close"
                >
                  {{ $t('downloads') || 'Downloads' }}
                </NuxtLinkLocale>
              </li>
              <li class="bg-red-600 text-white">
                <NuxtLinkLocale
                  to="/pin-code"
                  class="block px-3 py-3 hover:bg-gray-50"
                  @click="close"
                >
                  {{ $t('pinCodes') || 'Pin Codes' }}
                </NuxtLinkLocale>
              </li>
            </ul>
          </div>

        </div>

        <!-- Footer spacer -->
        <div class="h-4"></div>
      </div>

      <!-- Backdrop -->
      <div class="flex-1 bg-black/50" @click="drawerOpen = false"></div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute, useNuxtApp, useRuntimeConfig } from '#app'
import {
  UserPlusIcon,
  ShoppingCartIcon,
  MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'

const { t, locale } = useI18n()
const router = useRouter()
const route  = useRoute()
const { $customApi } = useNuxtApp()
const { public: { API_BASE_URL } } = useRuntimeConfig()

/* Drawer */
const drawerOpen = ref(false)
function close(){ drawerOpen.value = false }

/* Header height measurement (no shy) */
const hdrRef = ref<HTMLElement|null>(null)
function setHeaderHeightVar() {
  const el = hdrRef.value
  if (!el) return
  requestAnimationFrame(() => {
    const h = el.offsetHeight
    document.documentElement.style.setProperty('--hdr-h', `${h}px`)
  })
}
function onResize(){ setHeaderHeightVar() }
onMounted(async () => {
  await nextTick()
  setHeaderHeightVar()
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('orientationchange', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('orientationchange', onResize)
})

/* ---------- Typewriter placeholder ---------- */
const phrases = computed(() => [ t('searchPlaceholder'), t('carRemotes'), t('keyCuttingMachines'), t('accessoriesTools') ])
const typedText = ref('')
let phraseIndex = 0, charIndex = 0, deleting = false, timerId: any
function tick() {
  const list = phrases.value, current = list[phraseIndex] || ''
  if (!deleting) { typedText.value = current.substring(0, charIndex + 1); charIndex++; if (charIndex >= current.length) { deleting = true; timerId = setTimeout(tick, 1200); return } }
  else { typedText.value = current.substring(0, Math.max(0, charIndex - 1)); charIndex--; if (charIndex <= 0) { deleting = false; phraseIndex = (phraseIndex + 1) % list.length } }
  timerId = setTimeout(tick, deleting ? 45 : 90)
}
function startTyping() { stopTyping(); phraseIndex=0; charIndex=0; deleting=false; tick() }
function stopTyping() { if (timerId) clearTimeout(timerId); timerId = null }
onMounted(startTyping)
onBeforeUnmount(stopTyping)
watch(() => locale.value, () => startTyping())

/* ---------- Search suggest (same API as desktop) ---------- */
const term = ref('')
const suggestions = ref<any[]>([])
const hasMore = ref(false)
const totalResults = ref(0)
const loading = ref(false)
const error = ref('')
const open = ref(false)
const active = ref(-1)
const searchWrap = ref<HTMLElement|null>(null)
const activeId = computed(() => active.value >= 0 ? `sug-${active.value}` : undefined)
function onFocus(){ if (term.value.trim().length >= 3) open.value = true }
let debounceId: number | undefined
watch(term, (v) => {
  if (debounceId) clearTimeout(debounceId)
  if (!v || v.trim().length < 3) {
    suggestions.value = []; hasMore.value = false; error.value = ''; open.value = false; totalResults.value = 0
    return
  }
  open.value = true
  debounceId = window.setTimeout(fetchSuggest, 200)
})
async function fetchSuggest() {
  const q = term.value.trim(); if (q.length < 3) return
  loading.value = true; error.value = ''
  try {
    const res: any = await $customApi('/search/suggest', { params: { search: q, limit: 5 } })
    const root = res?.data ?? res ?? {}
    const raw  = root.data ?? root
    const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Object.values(raw || {})
    const mapped = (items || []).map((p: any) => ({
      ...p,
      title: nameFromJson(p?.title),
      image: isString(p?.image) ? p.image : null
    }))
    suggestions.value = mapped
    hasMore.value = !!(root?.meta?.has_more)
    totalResults.value = Number(root?.meta?.total ?? mapped.length) || mapped.length
    active.value = mapped.length ? 0 : -1
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to fetch suggestions'
    suggestions.value = []; hasMore.value = false; totalResults.value = 0; active.value = -1
  } finally {
    loading.value = false; open.value = true
  }
}
function move(delta:number){
  if (!open.value || !suggestions.value.length) return
  const n = suggestions.value.length
  active.value = ((active.value + delta + n) % n)
}
function pick(p:any){ open.value = false; router.push(p.href || `/products/${p.slug || p.id}`); drawerOpen.value = false }
function goToShop(){
  const q = term.value.trim(); if (!q) return
  open.value = false
  router.push(`/shop?search=${encodeURIComponent(q)}`)
  drawerOpen.value = false
}

/* ---------- Drawer mega menu data/states (mirrors desktop) ---------- */
const openCars           = ref(false)
const openManufacturers  = ref(false)
const openKeys           = ref(false)
const openDevices        = ref(false)
const openAccessories    = ref(false)
const openSoftTok        = ref(false)

const cars               = ref<any[]>([])
const manufacturers      = ref<any[]>([])
const keysRemotes        = ref<any[]>([])
const devicesMachines    = ref<any[]>([])
const accessoriesTools   = ref<any[]>([])
const softwares          = ref<any[]>([])
const tokens             = ref<any[]>([])

const loadingCars = ref(false);          const errorCars = ref('')
const loadingManufacturers = ref(false); const errorManufacturers = ref('')
const loadingKeys = ref(false);          const errorKeys = ref('')
const loadingDevices = ref(false);       const errorDevices = ref('')
const loadingAccessories = ref(false);   const errorAccessories = ref('')
const loadingSoftTok = ref(false);       const errorSoftTok = ref('')

const carsQuery = ref('');           const manufacturersQuery = ref('')
const keysQuery = ref('');           const devicesQuery = ref('')
const accessoriesQuery = ref('');    const softTokQuery = ref('')

/* extractors (same as desktop) */
function extractCars(res:any){ return res?.menu?.car_menu ?? res?.data?.menu?.car_menu ?? res?.car_menu ?? (Array.isArray(res) ? res : []) }
function extractManufacturers(res:any){ return res?.menu?.manufacturer_menu ?? res?.data?.menu?.manufacturer_menu ?? res?.manufacturer_menu ?? (Array.isArray(res) ? res : []) }
function extractKeysRemotes(res:any){ return res?.menu?.keys_and_remotes_menu ?? res?.data?.menu?.keys_and_remotes_menu ?? res?.keys_and_remotes_menu ?? (Array.isArray(res) ? res : []) }
function extractDevicesMachines(res:any){ return res?.menu?.devices_and_machines_menu ?? res?.data?.menu?.devices_and_machines_menu ?? res?.devices_and_machines_menu ?? (Array.isArray(res) ? res : []) }
function extractAccessoriesTools(res:any){ return res?.menu?.accessories_and_tools_menu ?? res?.data?.menu?.accessories_and_tools_menu ?? res?.accessories_and_tools_menu ?? (Array.isArray(res) ? res : []) }
function extractSoftwareTokens(res:any){
  const node = res?.menu?.software_and_tokens ?? res?.data?.menu?.software_and_tokens ?? res?.software_and_tokens ?? res ?? {}
  return { softwares: Array.isArray(node.softwares) ? node.softwares : [], tokens: Array.isArray(node.tokens) ? node.tokens : [] }
}

/* filters */
const filteredCars = computed(() => {
  const q = carsQuery.value.trim().toLowerCase()
  return q ? cars.value.filter(i => i.name?.toLowerCase().includes(q)) : cars.value
})
const filteredManufacturers = computed(() => {
  const q = manufacturersQuery.value.trim().toLowerCase()
  return q ? manufacturers.value.filter(i => i.name?.toLowerCase().includes(q)) : manufacturers.value
})
const filteredKeys = computed(() => {
  const q = keysQuery.value.trim().toLowerCase()
  return q ? keysRemotes.value.filter(i => i.name?.toLowerCase().includes(q)) : keysRemotes.value
})
const filteredDevices = computed(() => {
  const q = devicesQuery.value.trim().toLowerCase()
  return q ? devicesMachines.value.filter(i => i.name?.toLowerCase().includes(q)) : devicesMachines.value
})
const filteredAccessories = computed(() => {
  const q = accessoriesQuery.value.trim().toLowerCase()
  return q ? accessoriesTools.value.filter(i => i.name?.toLowerCase().includes(q)) : accessoriesTools.value
})
const filteredSoftwares = computed(() => {
  const q = softTokQuery.value.trim().toLowerCase()
  return q ? (softwares.value || []).filter(i => i.name?.toLowerCase().includes(q)) : (softwares.value || [])
})
const filteredTokens = computed(() => {
  const q = softTokQuery.value.trim().toLowerCase()
  return q ? (tokens.value || []).filter(i => i.name?.toLowerCase().includes(q)) : (tokens.value || [])
})

/* toggles (lazy-load on first open, close others) */
function closeAllAcc(){ openCars.value = openManufacturers.value = openKeys.value = openDevices.value = openAccessories.value = openSoftTok.value = false }
async function toggleCars(){ const next=!openCars.value; closeAllAcc(); openCars.value=next; if(next && !cars.value.length) await fetchCars() }
async function toggleManufacturers(){ const next=!openManufacturers.value; closeAllAcc(); openManufacturers.value=next; if(next && !manufacturers.value.length) await fetchManufacturers() }
async function toggleKeys(){ const next=!openKeys.value; closeAllAcc(); openKeys.value=next; if(next && !keysRemotes.value.length) await fetchKeysRemotes() }
async function toggleDevices(){ const next=!openDevices.value; closeAllAcc(); openDevices.value=next; if(next && !devicesMachines.value.length) await fetchDevicesMachines() }
async function toggleAccessories(){ const next=!openAccessories.value; closeAllAcc(); openAccessories.value=next; if(next && !accessoriesTools.value.length) await fetchAccessoriesTools() }
async function toggleSoftTok(){ const next=!openSoftTok.value; closeAllAcc(); openSoftTok.value=next; if(next && (!softwares.value.length && !tokens.value.length)) await fetchSoftwareTokens() }

/* fetchers */
async function fetchCars(){ loadingCars.value = true; errorCars.value=''; try{ const res = await $customApi(`${API_BASE_URL}/get_cars_menu`, { method:'GET' }); cars.value = extractCars(res) }catch(err:any){ errorCars.value = err?.data?.message || err?.message || (t('error') as string) }finally{ loadingCars.value=false } }
async function fetchManufacturers(){ loadingManufacturers.value = true; errorManufacturers.value=''; try{ const res = await $customApi(`${API_BASE_URL}/get_manufacturers_menu`, { method:'GET' }); manufacturers.value = extractManufacturers(res) }catch(err:any){ errorManufacturers.value = err?.data?.message || err?.message || (t('error') as string) }finally{ loadingManufacturers.value=false } }
async function fetchKeysRemotes(){ loadingKeys.value = true; errorKeys.value=''; try{ const res = await $customApi(`${API_BASE_URL}/get_keys_and_remotes_menu`, { method:'GET' }); keysRemotes.value = extractKeysRemotes(res) }catch(err:any){ errorKeys.value = err?.data?.message || err?.message || (t('error') as string) }finally{ loadingKeys.value=false } }
async function fetchDevicesMachines(){ loadingDevices.value = true; errorDevices.value=''; try{ const res = await $customApi(`${API_BASE_URL}/get_devices_and_machines`, { method:'GET' }); devicesMachines.value = extractDevicesMachines(res) }catch(err:any){ errorDevices.value = err?.data?.message || err?.message || (t('error') as string) }finally{ loadingDevices.value=false } }
async function fetchAccessoriesTools(){ loadingAccessories.value = true; errorAccessories.value=''; try{ const res = await $customApi(`${API_BASE_URL}/get_accessories_and_tools`, { method:'GET' }); accessoriesTools.value = extractAccessoriesTools(res) }catch(err:any){ errorAccessories.value = err?.data?.message || err?.message || (t('error') as string) }finally{ loadingAccessories.value=false } }
async function fetchSoftwareTokens(){ loadingSoftTok.value = true; errorSoftTok.value=''; try{ const res = await $customApi(`${API_BASE_URL}/get_softwares_and_tokens`, { method:'GET' }); const {softwares:s,tokens:tks}=extractSoftwareTokens(res); softwares.value=s; tokens.value=tks }catch(err:any){ errorSoftTok.value = err?.data?.message || err?.message || (t('error') as string) }finally{ loadingSoftTok.value=false } }

/* navigation + close */
function goToBrand(slug:string){ drawerOpen.value = false; router.push({ path: `/${slug}` }) }

/* utils for highlight */
const isString = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const nameFromJson = (n: any): string => {
  if (!n) return ''
  if (typeof n === 'string') { try { const o = JSON.parse(n); return (o?.en ?? Object.values(o || {})[0] ?? '') as string } catch { return n } }
  if (typeof n === 'object') return (n.en ?? Object.values(n)[0] ?? '') as string
  return String(n)
}
const { formatMoney } = useCurrency()
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))
const buildRegex = (q: string) => {
  const words = q.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp('(' + escaped.join('|') + ')', 'gi')
}
const highlight = (text: string) => {
  const t = term.value.trim()
  const rx = buildRegex(t)
  const safe = escapeHtml(String(text || ''))
  return rx ? safe.replace(rx, '<mark class="bg-yellow-200">$1</mark>') : safe
}
/* WhatsApp link builder */
const WHATSAPP_NUMBER = '971504429045'
function waLink(p: any) {
  const msg = t('search.askAboutProduct', { title: p?.title || '' }) as string
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

/* close drawer on route change */
watch(() => route.fullPath, () => { drawerOpen.value = false })
</script>

<style scoped>
/* transitions */
.fade-enter-active, .fade-leave-active { transition: opacity .12s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform .2s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); }

/* ensure no translate ever applied */
#app-header .row-top,
#app-header .row-search { transform: none !important; }

/* minor */
mark { padding: 0 2px; border-radius: 2px; }
</style>
