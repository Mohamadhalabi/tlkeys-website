<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNuxtApp } from '#app'

type Address = {
  id: number; country_id?: number | null; state?: string | null; city?: string | null;
  address: string; postal_code?: string | null; phone?: string | null; is_default?: number|boolean;
}

const { $customApi } = useNuxtApp()
const list = ref<Address[]>([])
const loading = ref(false)
const error = ref('')

const editing = ref<Address | null>(null)
const form = ref<Address>({ id: 0, address: '', city: '', state: '', postal_code: '', phone: '', is_default: false })

function startAdd()  { editing.value = null; form.value = { id: 0, address: '', city: '', state: '', postal_code: '', phone: '', is_default: false } }
function startEdit(a: Address) { editing.value = a; form.value = { ...a } }

async function fetchAddresses() {
  loading.value = true; error.value = ''
  try {
    const res: any = await $customApi('/addresses', { method: 'GET' })
    list.value = res?.data ?? res ?? []
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to load addresses.'
  } finally { loading.value = false }
}

async function save() {
  try {
    if (editing.value) {
      await $customApi(`/addresses/${editing.value.id}`, { method: 'PUT', body: form.value })
    } else {
      await $customApi('/addresses', { method: 'POST', body: form.value })
    }
    await fetchAddresses()
    editing.value = null
  } catch (e: any) { alert(e?.data?.message || e?.message || 'Save failed.') }
}

async function remove(id: number) {
  if (!confirm('Delete this address?')) return
  try {
    await $customApi(`/addresses/${id}`, { method: 'DELETE' })
    await fetchAddresses()
  } catch (e: any) { alert(e?.data?.message || e?.message || 'Delete failed.') }
}

onMounted(fetchAddresses)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold text-lg">Addresses</h2>
      <button class="btn-primary" @click="startAdd()">Add new</button>
    </div>

    <div v-if="error" class="mb-3 text-red-600">{{ error }}</div>
    <div v-if="loading">Loading…</div>

    <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="a in list" :key="a.id" class="rounded-xl border p-4 bg-gray-50">
        <div class="text-sm text-gray-800 whitespace-pre-line">
          <div class="font-medium mb-1">{{ a.city || '—' }}, {{ a.state || '' }}</div>
          <div>{{ a.address }}</div>
          <div v-if="a.postal_code">Postal code: {{ a.postal_code }}</div>
          <div v-if="a.phone">Phone: {{ a.phone }}</div>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <span v-if="a.is_default" class="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Default</span>
          <button class="px-3 py-1 rounded bg-white border" @click="startEdit(a)">Edit</button>
          <button class="px-3 py-1 rounded bg-white border" @click="remove(a.id)">Delete</button>
        </div>
      </div>
    </div>

    <!-- Drawer-style form -->
    <dialog v-if="editing !== null || form.id === 0" open class="fixed inset-0 bg-black/40 z-50 grid place-items-center">
      <div class="bg-white rounded-xl shadow-xl w-[min(92vw,520px)] p-5">
        <h3 class="font-semibold mb-3">{{ editing ? 'Edit address' : 'Add address' }}</h3>
        <div class="grid sm:grid-cols-2 gap-3">
          <label class="block">
            <span class="text-sm text-gray-700">City</span>
            <input v-model="form.city" class="mt-1 input" />
          </label>
          <label class="block">
            <span class="text-sm text-gray-700">State</span>
            <input v-model="form.state" class="mt-1 input" />
          </label>
          <label class="block sm:col-span-2">
            <span class="text-sm text-gray-700">Address</span>
            <textarea v-model="form.address" rows="3" class="mt-1 input"></textarea>
          </label>
          <label class="block">
            <span class="text-sm text-gray-700">Postal code</span>
            <input v-model="form.postal_code" class="mt-1 input" />
          </label>
          <label class="block">
            <span class="text-sm text-gray-700">Phone</span>
            <input v-model="form.phone" class="mt-1 input" />
          </label>
          <label class="inline-flex items-center gap-2 sm:col-span-2 mt-1">
            <input type="checkbox" v-model="form.is_default" />
            <span class="text-sm">Set as default</span>
          </label>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2">
          <button class="px-4 py-2 rounded bg-gray-100" @click="editing = null">Cancel</button>
          <button class="btn-primary" @click="save">Save</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.input{ @apply w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300; }
.btn-primary{ @apply inline-flex items-center gap-2 rounded-lg bg-orange-600 text-white px-4 py-2 hover:bg-orange-700; }
</style>
