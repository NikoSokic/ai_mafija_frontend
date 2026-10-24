import { create } from 'zustand'
import { getHealth } from '../api/rest.ts'

// Render besplatni server spava, pa prvi zahtjev traje do ~50 s
const RETRY_MS = 3000
const GIVE_UP_MS = 90_000

interface ServerStore {
  status: 'waking' | 'ready' | 'failed'
}

export const useServerStore = create<ServerStore>(() => ({ status: 'waking' }))

let running = false

// Budi server: GET /api/health svake 3 s dok ne odgovori, a nakon 90 s odustaje do ručnog ponavljanja.
// Samo jedna petlja istodobno (StrictMode pokrene efekt dvaput).
export async function wakeServer() {
  if (running) return
  running = true
  useServerStore.setState({ status: 'waking' })
  const startedAt = Date.now()
  try {
    while (!(await getHealth())) {
      if (Date.now() - startedAt >= GIVE_UP_MS) {
        useServerStore.setState({ status: 'failed' })
        return
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS))
    }
    useServerStore.setState({ status: 'ready' })
  } finally {
    running = false
  }
}

/** Gumb "Pokušaj ponovno" */
export const retryWake = () => void wakeServer()

// Resolve kad je server spreman; ako odustane, čeka ručno ponavljanje
export function whenServerReady(): Promise<void> {
  return new Promise((resolve) => {
    if (useServerStore.getState().status === 'ready') return resolve()
    const unsubscribe = useServerStore.subscribe((s) => {
      if (s.status !== 'ready') return
      unsubscribe()
      resolve()
    })
  })
}
