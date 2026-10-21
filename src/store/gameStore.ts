import { create } from 'zustand'
import type {
  LobbyDetailsResponse,
  LobbyPlayerResponse,
  LobbyStatus,
  PublicGameStateResponse,
} from '../api/types.ts'
import type { ConnectionStatus } from '../lib/stomp.ts'

export interface Lobby {
  code: string
  status: LobbyStatus
  maxPlayers: number
  /** po id-u, to je redoslijed ulaska (o njemu ovise prozori u gradu) */
  players: LobbyPlayerResponse[]
}

interface GameStore {
  lobby: Lobby | null
  /** greška prvog učitavanja sobe (npr. soba ne postoji) */
  lobbyError: string | null
  /** zadnje javno stanje igre iz GAME_STATE_CHANGED / GAME_FINISHED */
  publicState: PublicGameStateResponse | null
  connection: ConnectionStatus

  /** prazni stanje kad se otvori druga soba; za istu sobu ga ostavlja */
  reset: (code: string) => void
  setLobby: (details: LobbyDetailsResponse) => void
  setLobbyError: (message: string) => void
  setConnection: (status: ConnectionStatus) => void
  // događaji s /topic/lobby/{code}
  playerJoined: (player: LobbyPlayerResponse) => void
  gameStarted: () => void
  gameStateChanged: (state: PublicGameStateResponse) => void
  gameFinished: (state: PublicGameStateResponse) => void
}

// Igrači se spajaju po id-u, a novi podaci zamjenjuju stare. Backend nema napuštanje sobe,
// pa zakašnjeli odgovor GET-a ne može izbrisati igrača koji je u međuvremenu stigao događajem.
function mergePlayers(current: LobbyPlayerResponse[], incoming: LobbyPlayerResponse[]) {
  const byId = new Map(current.map((p) => [p.id, p]))
  for (const p of incoming) byId.set(p.id, p)
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

export const useGameStore = create<GameStore>((set, get) => {
  // Događaj za sobu koja još nije učitana se preskače – GET nakon spajanja donese sve
  function updateLobby(change: (lobby: Lobby) => Partial<Lobby>) {
    const { lobby } = get()
    if (lobby) set({ lobby: { ...lobby, ...change(lobby) } })
  }

  function applyPublicState(state: PublicGameStateResponse) {
    set({ publicState: state })
    updateLobby((lobby) => ({
      status: state.lobbyStatus,
      players: mergePlayers(lobby.players, state.players),
    }))
  }

  return {
    lobby: null,
    lobbyError: null,
    publicState: null,
    connection: 'connecting',

    reset: (code) => {
      if (get().lobby?.code === code) return
      set({ lobby: null, lobbyError: null, publicState: null })
    },
    setLobby: (details) => {
      const previous = get().lobby
      set({
        lobbyError: null,
        lobby: {
          code: details.code,
          status: details.status,
          maxPlayers: details.maxPlayers,
          players:
            previous?.code === details.code
              ? mergePlayers(previous.players, details.players)
              : mergePlayers([], details.players),
        },
      })
    },
    setLobbyError: (message) => set({ lobbyError: message }),
    setConnection: (status) => set({ connection: status }),

    playerJoined: (player) => updateLobby((lobby) => ({ players: mergePlayers(lobby.players, [player]) })),
    gameStarted: () => updateLobby(() => ({ status: 'IN_PROGRESS' })),
    gameStateChanged: applyPublicState,
    gameFinished: applyPublicState,
  }
})
