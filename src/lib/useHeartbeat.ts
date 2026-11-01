import { useEffect, useRef } from 'react'
import { ApiError, sendHeartbeat } from '../api/rest.ts'
import { useGameStore } from '../store/gameStore.ts'
import type { Session } from '../store/session.ts'

// Mora biti znatno kraće od roka "Nije tu" (45 s) na backendu (GameRules.AWAY_AFTER)
const INTERVAL_MS = 15000

// Igrač se javlja backendu dok je u sobi: svakih 15 s, pri povratku u aplikaciju i kad se vrati veza.
// Po tome backend zna tko je "Nije tu" i predaje ulogu domaćinu koji nestane. Odgovor nosi popis odsutnih.
// onLost: backend ne poznaje ovaj token (domaćin je izbacio igrača, soba je obrisana), pa sesija više ne vrijedi.
export function useHeartbeat(session: Session | null, onLost: () => void) {
  const onLostRef = useRef(onLost)
  useEffect(() => {
    onLostRef.current = onLost
  })

  const playerId = session?.playerId
  const playerToken = session?.playerToken
  useEffect(() => {
    if (playerId === undefined || playerToken === undefined) return
    let active = true

    const beat = () => {
      sendHeartbeat({ playerId, playerToken })
        .then((res) => {
          if (!active) return
          useGameStore.getState().setAway(res.awayPlayerIds)
          // stariji backend polje nema; novi ga šalje samo domaćinu
          useGameStore.getState().setReclaims(res.reclaimRequests ?? [])
        })
        .catch((e: unknown) => {
          // bez veze se samo pokuša ponovno; 401 i 404 znače da igrača u sobi više nema
          if (active && e instanceof ApiError && (e.status === 401 || e.status === 404)) onLostRef.current()
        })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') beat()
    }

    beat()
    const id = window.setInterval(beat, INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', beat)
    return () => {
      active = false
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', beat)
    }
  }, [playerId, playerToken])
}
