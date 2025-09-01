export default defineNuxtRouteMiddleware((to, from) => {
  const error = useError();

  // If Nuxt marked the error as 404, change it to 410
  if (error.value?.statusCode === 404) {
    throw createError({
      statusCode: 410,
      statusMessage: 'Gone',
      fatal: true
    });
  }
});
