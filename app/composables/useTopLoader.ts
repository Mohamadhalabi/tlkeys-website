// composables/useTopLoader.ts
import { useState } from '#imports'

export function useTopLoader() {
  const counter = useState<number>('__top_loader_counter__', () => 0)

  function start() {
    counter.value++
  }
  function finish() {
    counter.value = Math.max(0, counter.value - 1)
  }
  const active = computed(() => counter.value > 0)

  return { start, finish, active }
}
