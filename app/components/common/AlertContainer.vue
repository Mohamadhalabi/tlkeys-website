<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAlertStore } from '~/stores/alert'
import { useRouter } from '#imports'
import { storeToRefs } from 'pinia'

const store = useAlertStore()
const router = useRouter()
const { items } = storeToRefs(store)

const mounted = ref(false)
onMounted(() => { mounted.value = true })

function go(a: { route?: string; onClick?: () => void } | undefined) {
  if (!a) return
  if (a.onClick) return a.onClick()
  if (a.route) router.push(a.route)
}
</script>

<template>
  <ClientOnly>
    <teleport to="body">
      <div
        v-if="mounted"
        class="fixed z-[1000] right-2 top-2 w-[calc(100vw-1rem)] max-w-full sm:right-4 sm:top-4 sm:w-[92vw] sm:max-w-md space-y-3"
        aria-live="polite"
      >
        <!-- Transition group for smooth in/out -->
        <TransitionGroup name="alert" tag="div" class="space-y-3">
          <div
            v-for="a in items"
            :key="a.id"
            class="rounded-2xl border shadow-lg p-3 sm:p-4 bg-white flex gap-3 items-center"
            :class="{
              'border-green-200': a.type==='success',
              'border-red-200':   a.type==='error',
              'border-gray-200':  a.type==='info'
            }"
            role="status"
          >
            <!-- Bigger image; responsive -->
            <img
              v-if="a.image"
              :src="a.image"
              alt=""
              class="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover shrink-0"
            />

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span
                  class="inline-block text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full"
                  :class="{
                    'bg-green-50 text-green-700 border border-green-200': a.type==='success',
                    'bg-red-50 text-red-700 border border-red-200': a.type==='error',
                    'bg-gray-50 text-gray-700 border border-gray-200': a.type==='info'
                  }"
                >
                  {{ a.type === 'success' ? 'Success' : a.type === 'error' ? 'Error' : 'Notice' }}
                </span>
                <button
                  class="ms-auto text-gray-400 hover:text-gray-600"
                  @click="store.dismiss(a.id)"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>

              <p v-if="a.title" class="mt-1 font-medium truncate text-sm sm:text-base">{{ a.title }}</p>
              <p v-if="a.sku" class="text-xs text-gray-500">SKU: {{ a.sku }}</p>
              <p
                v-if="a.message"
                class="mt-1 text-[13px] sm:text-sm text-gray-700"
                v-html="a.message"
              ></p>


              <div v-if="a.actions?.length" class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="(act, i) in a.actions"
                  :key="i"
                  class="px-3 py-1.5 rounded-xl text-sm border hover:bg-gray-50"
                  @click="go(act)"
                >
                  {{ act.label }}
                </button>
              </div>

              <!-- Countdown / progress bar (shrinks to 0 over timeout) -->
              <div
                v-if="a.timeout && a.timeout > 0"
                class="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden"
                aria-hidden="true"
              >
                <div
                  class="h-full animate-alert-progress"
                  :class="{
                    'bg-green-500': a.type==='success',
                    'bg-red-500':   a.type==='error',
                    'bg-gray-500':  a.type==='info'
                  }"
                  :style="{ animationDuration: (a.timeout || 3500) + 'ms' }"
                />
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </teleport>
  </ClientOnly>
</template>

<style scoped>
/* Enter/leave transitions */
.alert-enter-from { opacity: 0; transform: translateY(-8px) scale(0.98); }
.alert-enter-to   { opacity: 1; transform: translateY(0)     scale(1);    }
.alert-enter-active { transition: all 180ms ease-out; }

.alert-leave-from { opacity: 1; transform: translateY(0)     scale(1);    }
.alert-leave-to   { opacity: 0; transform: translateY(-8px) scale(0.98); }
.alert-leave-active { transition: all 160ms ease-in; }

/* Progress animation: 100% -> 0% width over the alert timeout */
@keyframes alert-progress {
  from { width: 100%; }
  to   { width: 0%; }
}
.animate-alert-progress {
  animation-name: alert-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
</style>
