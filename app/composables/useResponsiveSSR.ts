export const useResponsiveSSR = () => {
  const isDesktop = useState<boolean>('isDesktop-ssr', () => {
    if (process.server) {
      const ua = (useRequestHeaders(['user-agent'])['user-agent'] || '').toLowerCase();
      const isPhone = /android.+mobile|iphone|ipod|blackberry|iemobile|opera mini/.test(ua);
      const isTablet = /(ipad|tablet|android(?!.*mobile))/.test(ua);
      return !(isPhone || isTablet);
    }
    return true; // replaced by SSR value during hydration
  });

  if (process.client) {
    onMounted(() => {
      const mq = window.matchMedia('(min-width: 993px)');
      const update = () => { isDesktop.value = mq.matches; };
      update(); // AFTER hydration to avoid mismatches
      mq.addEventListener('change', update);
      onBeforeUnmount(() => mq.removeEventListener('change', update));
    });
  }

  return { isDesktop };
};
