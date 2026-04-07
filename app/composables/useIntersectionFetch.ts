import { ref, onMounted, onUnmounted } from 'vue'

export function useIntersectionFetch(
    fetchFn: () => Promise<void>,
    options: IntersectionObserverInit = {}
) {
    const el = ref<HTMLElement | null>(null)
    const loaded = ref(false)
    const loading = ref(false)
    let observer: IntersectionObserver | null = null

    onMounted(() => {
        if (!el.value) return

        observer = new IntersectionObserver(async (entries) => {
            const entry = entries[0]
            if (entry.isIntersecting && !loaded.value && !loading.value) {
                loading.value = true
                await fetchFn()
                loaded.value = true
                loading.value = false
                observer?.disconnect()
            }
        }, { rootMargin: '200px', threshold: 0, ...options })

        observer.observe(el.value)
    })

    onUnmounted(() => observer?.disconnect())

    return { el, loaded, loading }
}