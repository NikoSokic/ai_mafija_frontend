import { useSyncExternalStore } from 'react'

// Isti prag kao Tailwindov lg: (64rem = 1024 px), pa se klase lg: i ovaj hook uvijek slažu
const QUERY = '(min-width: 1024px)'

const media = () => window.matchMedia(QUERY)

function subscribe(onChange: () => void) {
  const mql = media()
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * true na širini ≥ 1024 px; prati promjenu veličine prozora.
 * Komponente koje postoje samo na desktopu renderiraju se s {isDesktop && …}, a ne skrivaju
 * klasom (hidden lg:block): skrivena komponenta i dalje radi – timeri, dohvaćanje, glas, vibracija.
 */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => media().matches, () => false)
}
