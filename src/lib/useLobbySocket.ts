import { useEffect } from 'react'
import { describeError, getLobby } from '../api/rest.ts'
import type { LobbyEvent } from '../api/types.ts'
import { useGameStore } from '../store/gameStore.ts'
import { subscribeToLobby } from './stomp.ts'

function applyEvent(event: LobbyEvent) {
  const store = useGameStore.getState()
  switch (event.type) {
    case 'PLAYER_JOINED':
      store.playerJoined(event.data)
      break
    case 'GAME_STARTED':
      store.gameStarted()
      break
    case 'GAME_STATE_CHANGED':
      store.gameStateChanged(event.data)
      break
    case 'GAME_FINISHED':
      store.gameFinished(event.data)
      break
    default:
      // backend može dodati nove događaje (spec 10.1) – dok ih klijent ne zna, preskače ih
      break
  }
}

// Soba u stvarnom vremenu: učita je preko REST-a i prati događaje na /topic/lobby/{code}.
// Stanje (soba, javno stanje igre, veza) je u gameStoreu.
export function useLobbySocket(code: string) {
  useEffect(() => {
    let active = true
    useGameStore.getState().reset(code)

    const load = () => {
      getLobby(code)
        .then((details) => {
          if (active) useGameStore.getState().setLobby(details)
        })
        .catch((e: unknown) => {
          // Ako je soba već učitana (npr. pri ponovnom spajanju), ostaje prikazana
          if (active && !useGameStore.getState().lobby) {
            useGameStore.getState().setLobbyError(describeError(e, code))
          }
        })
    }

    load()
    const release = subscribeToLobby(code, {
      onEvent: applyEvent,
      onStatus: (status) => useGameStore.getState().setConnection(status),
      // Nakon (ponovnog) spajanja stanje se opet dohvaća, jer su se događaji mogli propustiti:
      // dok veza nije radila ili između prvog GET-a i pretplate
      onConnect: load,
    })

    return () => {
      active = false
      release()
    }
  }, [code])
}
