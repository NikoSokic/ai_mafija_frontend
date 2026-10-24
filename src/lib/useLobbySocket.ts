import { useEffect } from 'react'
import { describeError, getLobby } from '../api/rest.ts'
import type { LobbyEvent } from '../api/types.ts'
import { loadSession } from '../store/session.ts'
import { useGameStore } from '../store/gameStore.ts'
import { subscribeToLobby } from './stomp.ts'

function applyEvent(event: LobbyEvent) {
  const store = useGameStore.getState()
  switch (event.type) {
    case 'PLAYER_JOINED':
      store.playerJoined(event.data)
      break
    case 'PLAYER_LEFT':
      store.playerLeft(event.data.playerId, event.data.newHostPlayerId, loadSession()?.playerId ?? null)
      break
    case 'HOST_CHANGED':
      store.hostChanged(event.data.hostPlayerId, loadSession()?.playerId ?? null)
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
    case 'VOTE_RESOLVED':
      store.voteResolved(event.data)
      break
    case 'REMATCH':
      store.clearGame(event.lobbyCode)
      break
    default:
      // NIGHT_RESOLVED, VOTING_STARTED, VOTE_CAST i PLAYER_READY donose isto što i GAME_STATE_CHANGED
      // koji stiže odmah za njima; nove događaje (spec 10.1) klijent preskače dok ih ne zna
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
