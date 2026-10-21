import { create } from 'zustand'
import type {
  GameStateResponse,
  LobbyDetailsResponse,
  LobbyPlayerResponse,
  LobbyRoleResponse,
  LobbyStatus,
  PublicGameStateResponse,
  ResolveVoteResponse,
} from '../api/types.ts'
import type { ConnectionStatus } from '../lib/stomp.ts'

export interface Lobby {
  code: string
  status: LobbyStatus
  maxPlayers: number
  /** po id-u, to je redoslijed ulaska (o njemu ovise prozori u gradu) */
  players: LobbyPlayerResponse[]
  /** sastav uloga koji je domaćin odabrao */
  roles: LobbyRoleResponse[]
}

interface GameStore {
  lobby: Lobby | null
  /** greška prvog učitavanja sobe (npr. soba ne postoji) */
  lobbyError: string | null
  /** zadnje javno stanje igre iz GAME_STATE_CHANGED / GAME_FINISHED */
  publicState: PublicGameStateResponse | null
  /** stanje iz perspektive ovog igrača (GET /game-state): uloga, je li živ… */
  gameState: GameStateResponse | null
  /** zadnji ishod glasanja (VOTE_RESOLVED ili odgovor REST-a) */
  voteResult: ResolveVoteResponse | null
  /** ms koje treba dodati Date.now() da se dobije vrijeme poslužitelja (za rokove faza) */
  clockOffset: number
  connection: ConnectionStatus

  /** prazni stanje kad se otvori druga soba; za istu sobu ga ostavlja */
  reset: (code: string) => void
  setLobby: (details: LobbyDetailsResponse) => void
  setLobbyError: (message: string) => void
  setGameState: (state: GameStateResponse) => void
  setConnection: (status: ConnectionStatus) => void
  // događaji s /topic/lobby/{code}
  playerJoined: (player: LobbyPlayerResponse) => void
  gameStarted: () => void
  gameStateChanged: (state: PublicGameStateResponse) => void
  gameFinished: (state: PublicGameStateResponse) => void
  /** isti ishod stiže događajem i u odgovoru REST-a, pa se drugi put preskače */
  voteResolved: (result: ResolveVoteResponse) => void
}

// Igrači se spajaju po id-u, a novi podaci zamjenjuju stare. Napuštanje sobe (PLAYER_LEFT) se još
// ne obrađuje, pa zakašnjeli odgovor GET-a ne može izbrisati igrača koji je stigao događajem.
function mergePlayers(current: LobbyPlayerResponse[], incoming: LobbyPlayerResponse[]) {
  const byId = new Map(current.map((p) => [p.id, p]))
  for (const p of incoming) byId.set(p.id, p)
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

// Razlika sata u trenutku kad je stanje stiglo; kašnjenje mreže se zanemaruje
function offsetFrom(serverTime: string | undefined, fallback: number) {
  const server = serverTime ? Date.parse(serverTime) : NaN
  return Number.isFinite(server) ? server - Date.now() : fallback
}

// Svaka faza glasanja se obradi jednom: TIE_BREAK nema suzdržanih (abstainCount null)
const voteKey = (r: ResolveVoteResponse) => `${r.roundNumber}:${r.abstainCount === null ? 'TIE_BREAK' : 'VOTING'}`

export const useGameStore = create<GameStore>((set, get) => {
  // Događaj za sobu koja još nije učitana se preskače – GET nakon spajanja donese sve
  function updateLobby(change: (lobby: Lobby) => Partial<Lobby>) {
    const { lobby } = get()
    if (lobby) set({ lobby: { ...lobby, ...change(lobby) } })
  }

  function applyPublicState(state: PublicGameStateResponse) {
    set({ publicState: state, clockOffset: offsetFrom(state.serverTime, get().clockOffset) })
    updateLobby((lobby) => ({
      status: state.lobbyStatus,
      players: mergePlayers(lobby.players, state.players),
    }))
  }

  return {
    lobby: null,
    lobbyError: null,
    publicState: null,
    gameState: null,
    voteResult: null,
    clockOffset: 0,
    connection: 'connecting',

    reset: (code) => {
      if (get().lobby?.code === code) return
      set({ lobby: null, lobbyError: null, publicState: null, gameState: null, voteResult: null })
    },
    setLobby: (details) => {
      const previous = get().lobby
      set({
        lobbyError: null,
        lobby: {
          code: details.code,
          status: details.status,
          maxPlayers: details.maxPlayers,
          roles: details.roles,
          players:
            previous?.code === details.code
              ? mergePlayers(previous.players, details.players)
              : mergePlayers([], details.players),
        },
      })
    },
    setLobbyError: (message) => set({ lobbyError: message }),
    setGameState: (state) => set({ gameState: state, clockOffset: offsetFrom(state.serverTime, get().clockOffset) }),
    setConnection: (status) => set({ connection: status }),

    playerJoined: (player) => updateLobby((lobby) => ({ players: mergePlayers(lobby.players, [player]) })),
    gameStarted: () => updateLobby(() => ({ status: 'IN_PROGRESS' })),
    gameStateChanged: applyPublicState,
    gameFinished: applyPublicState,
    voteResolved: (result) => {
      const current = get().voteResult
      if (current && voteKey(current) === voteKey(result)) return
      set({ voteResult: result })
    },
  }
})
