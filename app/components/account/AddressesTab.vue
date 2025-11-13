<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNuxtApp } from '#app'
import { useI18n } from '#imports'

/* ---------------- Types ---------------- */
type Address = {
  id: number
  country_id?: number | null
  country_name?: string | null
  zone_id?: number | null
  city?: string | null
  street?: string | null
  address: string
  postal_code?: string | null
  phone?: string | null
  is_default?: number | boolean
}

type Country = {
  id: number
  name: string | Record<string, string>
  iso2?: string | null
  iso3?: string | null
  zone_id?: number | null
}

/* ---------------- Setup ---------------- */
const { $customApi } = useNuxtApp()
const { t, locale } = useI18n()

const list = ref<Address[]>([])
const loading = ref(false)
const error = ref('')

/* ---- Countries (for dropdown like checkout) ---- */
const countries = ref<Country[]>([])
const countriesLoading = ref(false)
const countriesError = ref<string | null>(null)

function countryDisplayName(c: Country, loc: string): string {
  try {
    if (typeof c.name === 'string') {
      const parsed = JSON.parse(c.name as string)
      if (parsed && typeof parsed === 'object') {
        return parsed[loc] || (parsed as any).en || (Object.values(parsed)[0] as string) || ''
      }
      return c.name
    }
    if (c.name && typeof c.name === 'object') {
      return (c.name[loc] || (c.name as any).en || (Object.values(c.name)[0] as string) || '') as string
    }
  } catch {
    // ignore
  }
  return String(c.name ?? '')
}

/* ---------------- Address modal state ---------------- */
type AddressForm = Partial<Address> & { is_default?: boolean }

const addressModalOpen = ref(false)
const addressForm = ref<AddressForm>({})
const isEditing = computed(() => !!addressForm.value.id)

/* ---------------- Fetchers ---------------- */
async function fetchAddresses() {
  loading.value = true
  error.value = ''
  try {
    const res: any = await $customApi('/addresses', { method: 'GET' })
    list.value = res?.data ?? res ?? []
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to load addresses.'
  } finally {
    loading.value = false
  }
}

async function fetchCountries() {
  countriesLoading.value = true
  countriesError.value = null
  try {
    const res = await $customApi<any>('/get-countries')
    const arr = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : [])
    countries.value = (arr || []) as Country[]
  } catch (e: any) {
    countriesError.value = t('errors.failedToLoadCountries') || e?.message || 'Failed to load countries'
  } finally {
    countriesLoading.value = false
  }
}

/* ---------------- Modal helpers ---------------- */
function openAddressForm(a?: Address) {
  if (a) {
    addressForm.value = {
      id: a.id,
      country_id: a.country_id ?? undefined,
      city: a.city ?? '',
      street: a.street ?? '',
      address: a.address ?? '',
      phone: a.phone ?? '',
      postal_code: a.postal_code ?? '',
      is_default: !!a.is_default,
    }
  } else {
    addressForm.value = {
      country_id: undefined as any,
      city: '',
      street: '',
      address: '',
      phone: '',
      postal_code: '',
      is_default: false,
    }
  }
  addressModalOpen.value = true
}

function closeAddressForm() {
  addressModalOpen.value = false
}

/* ---------------- Save/Delete ---------------- */
async function saveAddress() {
  const body = { ...addressForm.value }

  // basic validation like checkout
  if (
    !body.country_id ||
    !String(body.city || '').trim() ||
    !String(body.street || '').trim() ||
    !String(body.address || '').trim() ||
    !String(body.postal_code || '').trim() ||
    !String(body.phone || '').trim()
  ) {
    alert(
      t('checkout.allAddressFieldsRequired') ||
        'Please fill in all address fields.',
    )
    return
  }

  try {
    let savedId: number | null = null

    if (isEditing.value && body.id) {
      // UPDATE (keep your RESTful endpoint)
      await $customApi(`/addresses/${body.id}`, {
        method: 'PUT',
        body,
      })
      savedId = Number(body.id)
    } else {
      // CREATE
      const res = await $customApi<{ id: number }>(`/addresses`, {
        method: 'POST',
        body,
      })
      savedId = (res as any)?.id ?? null
    }

    // Set as default if checked, like in checkout
    if (body.is_default && (savedId || body.id)) {
      const idToSet = Number(savedId || body.id)
      if (Number.isFinite(idToSet)) {
        await $customApi(`/addresses/${idToSet}/default`, { method: 'POST' })
      }
    }

    await fetchAddresses()
    addressModalOpen.value = false
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Save failed.')
  }
}

async function removeAddress(id: number) {
  if (!confirm(t('checkout.deleteAddressConfirm') || 'Delete this address?')) return
  try {
    await $customApi(`/delete-addresses/${id}`, { method: 'POST' }) // 👈 same as checkout
    await fetchAddresses()
  } catch (e: any) {
    alert(e?.data?.message || e?.message || 'Delete failed.')
  }
}


/* ---------------- Mount ---------------- */
onMounted(async () => {
  await Promise.all([fetchAddresses(), fetchCountries()])
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold text-lg">Addresses</h2>
      <button class="btn-primary" @click="openAddressForm()">
        {{ $t('checkout.addAddress') || 'Add new' }}
      </button>
    </div>

    <div v-if="error" class="mb-3 text-red-600">{{ error }}</div>
    <div v-if="loading">Loading…</div>

    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="a in list"
        :key="a.id"
        class="rounded-xl border p-4 bg-gray-50"
      >
        <div class="text-sm text-gray-800 whitespace-pre-line">
          <div class="font-medium mb-1">
            {{ a.city || '—' }}
            <span v-if="a.state">, {{ a.state }}</span>
          </div>
          <div v-if="a.country_name" class="text-xs text-gray-500 mb-1">
            {{ a.country_name }}
          </div>
          <div>
            <template v-if="a.street">{{ a.street }}<br /></template>
            {{ a.address }}
          </div>
          <div v-if="a.postal_code">Postal code: {{ a.postal_code }}</div>
          <div v-if="a.phone">Phone: {{ a.phone }}</div>
        </div>
        <div class="mt-3 flex items-center gap-2 flex-wrap">
          <span
            v-if="a.is_default"
            class="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700"
          >
            {{ $t('checkout.default') || 'Default' }}
          </span>
          <button
            class="px-3 py-1 rounded bg-white border"
            @click="openAddressForm(a)"
          >
            {{ $t('edit') || 'Edit' }}
          </button>
          <button
            class="px-3 py-1 rounded bg-white border"
            @click="removeAddress(a.id)"
          >
            {{ $t('delete') || 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Address Modal (same UX as checkout) -->
    <Teleport to="body">
      <div
        v-if="addressModalOpen"
        class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3"
        @click.self="closeAddressForm"
      >
        <div
          class="bg-white w-full sm:max-w-md rounded-xl p-4 sm:p-5 max-h-[85vh] overflow-y-auto shadow-xl"
          role="dialog"
          aria-modal="true"
        >
          <h4 class="text-lg font-semibold mb-3">
            {{
              isEditing
                ? $t('checkout.editAddress') || 'Edit address'
                : $t('checkout.newAddress') || 'New address'
            }}
          </h4>

          <form @submit.prevent="saveAddress" class="space-y-3">
            <div>
              <label class="text-sm block mb-1">
                {{ $t('checkout.country') || 'Country' }}
              </label>
              <select
                v-model.number="addressForm.country_id"
                class="w-full rounded-xl border px-3 py-2"
                required
              >
                <option value="">
                  {{ $t('checkout.selectCountry') || 'Select country' }}
                </option>
                <option
                  v-for="c in countries"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ countryDisplayName(c, String($i18n?.locale || locale)) }}
                </option>
              </select>
              <p v-if="countriesLoading" class="text-xs text-gray-500 mt-1">
                {{ $t('loading') || 'Loading' }}…
              </p>
              <p v-if="countriesError" class="text-xs text-red-600 mt-1">
                {{
                  $t('errors.failedToLoadCountries') ||
                    countriesError
                }}
              </p>
            </div>

            <div>
              <label class="text-sm block mb-1">
                {{ $t('checkout.city') || 'City' }}
              </label>
              <input
                v-model="addressForm.city"
                type="text"
                class="w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div>
              <label class="text-sm block mb-1">
                {{ $t('checkout.street') || 'Street' }}
              </label>
              <input
                v-model="addressForm.street"
                type="text"
                class="w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div>
              <label class="text-sm block mb-1">
                {{ $t('checkout.address') || 'Address' }}
              </label>
              <textarea
                v-model="addressForm.address"
                rows="3"
                class="w-full rounded-xl border px-3 py-2"
                required
              ></textarea>
            </div>

            <div>
              <label class="text-sm block mb-1">
                {{ $t('checkout.postalCode') || 'Postal code' }}
              </label>
              <input
                v-model="addressForm.postal_code"
                type="text"
                class="w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <div>
              <label class="text-sm block mb-1">
                {{ $t('checkout.phone') || 'Phone' }}
              </label>
              <input
                v-model="addressForm.phone"
                type="text"
                class="w-full rounded-xl border px-3 py-2"
                required
              />
            </div>

            <label class="inline-flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                v-model="addressForm.is_default"
                class="accent-emerald-600"
              />
              <span class="text-sm">
                {{ $t('checkout.setAsDefault') || 'Set as default' }}
              </span>
            </label>

            <div class="pt-2 flex justify-end gap-3">
              <button
                type="button"
                class="px-4 py-2 rounded border hover:bg-gray-50"
                @click="closeAddressForm"
              >
                {{ $t('cancel') || 'Cancel' }}
              </button>
              <button
                type="submit"
                class="px-4 py-2 rounded bg-orange-500 text-white hover:bg-emerald-700"
              >
                {{ $t('save') || 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.input {
  @apply w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300;
}
.btn-primary {
  @apply inline-flex items-center gap-2 rounded-lg bg-orange-600 text-white px-4 py-2 hover:bg-orange-700;
}
</style>
