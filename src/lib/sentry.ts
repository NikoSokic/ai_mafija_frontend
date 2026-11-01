import * as Sentry from '@sentry/react'

// Bez VITE_SENTRY_DSN (lokalno, CI) Sentry je isključen. Bez tracinga i snimanja sesija.
// Zahtjevi nose playerToken (zaglavlje X-Player-Token i tijelo POST-ova), pa se zaglavlja, tijela,
// kolačići i podaci o korisniku izričito ne skupljaju.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
  })
}

export function reportError(error: unknown, componentStack?: string | null) {
  Sentry.captureException(error, componentStack ? { extra: { componentStack } } : undefined)
}
