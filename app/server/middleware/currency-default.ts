// server/middleware/currency-default.ts
export default defineEventHandler((event) => {
  const existing = getCookie(event, 'currency')
  if (!existing) {
    // pick your true default (USD?)
    setCookie(event, 'currency', 'USD', {
      path: '/',
      sameSite: 'lax',
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    })
  }
})
