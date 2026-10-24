import { create } from 'zustand'
import type {
  GameStateResponse,
  LobbyDetailsResponse,
  LobbyMode,
  LobbyPlayerResponse,
  LobbyRoleResponse,
  LobbyStatus,
  PublicGameStateResponse,
  ResolveVoteResponse,
} from '../api/types.ts'
import type { ConnectionStatus } from '../lib/stomp.ts'
import { clearNarrated } from './narrated.ts'
import { clearNotes } from './notes.ts'

export interface Lobby {
  code: string
  status: LobbyStatus
  maxPlayers: number
  /** po id-u, to je redoslijed ulaska (o njemu ovise prozori u gradu) */
  players: LobbyPlayerResponse[]
  /** sastav uloga koji je domaćin odabrao */
  roles: LobbyRoleResponse[]
  /** domaćin je izvor istine za krunu; null kad domaćina nema */
  hostPlayerId: number | null
  mode: LobbyMode
  isPublic: boolean
  voiceEnabled: boolean
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
  /** id-ovi igrača koji su otišli; zakašnjeli GET ih ne smije vratiti */
  leftIds: number[]
  /** raste svaki put kad ovaj igrač postane domaćin (za obavijest) */
  becameHost: number

  /** prazni stanje kad se otvori druga soba; za istu sobu ga ostavlja */
  reset: (code: string) => void
  setLobby: (details: LobbyDetailsResponse) => void
  setLobbyError: (message: string) => void
  setGameState: (state: GameStateResponse) => void
  setConnection: (status: ConnectionStatus) => void
  // događaji s /topic/lobby/{code}
  playerJoined: (player: LobbyPlayerResponse) => void
  playerLeft: (playerId: number, newHostPlayerId: number | null, myId: number | null) => void
  hostChanged: (hostPlayerId: number, myId: number | null) => void
  gameStarted: () => void
  gameStateChanged: (state: PublicGameStateResponse) => void
  gameFinished: (state: PublicGameStateResponse) => void
  /** isti ishod stiže događajem i u odgovoru REST-a, pa se drugi put preskače */
  voteResolved: (result: ResolveVoteResponse) => void
  /** REMATCH: soba je opet u čekaonici, stanje stare igre se briše (i bilješke i naracije u pregledniku) */
  clearGame: (code: string) => void
}

// Igrači se spajaju po id-u, a novi podaci zamjenjuju stare, pa zakašnjeli odgovor GET-a ne može
// izbrisati igrača koji je stigao događajem. Tko je otišao (PLAYER_LEFT), ne vraća se: id-ovi se ne ponavljaju.
function mergePlayers(current: LobbyPlayerResponse[], incoming: LobbyPlayerResponse[], leftIds: number[]) {
  const byId = new Map(current.map((p) => [p.id, p]))
  for (const p of incoming) byId.set(p.id, p)
  for (const id of leftIds) byId.delete(id)
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
      players: mergePlayers(lobby.players, state.players, get().leftIds),
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
    leftIds: [],
    becameHost: 0,

    reset: (code) => {
      if (get().lobby?.code === code) return
      set({ lobby: null, lobbyError: null, publicState: null, gameState: null, voteResult: null, leftIds: [] })
    },
    setLobby: (details) => {
      const previous = get().lobby
      const { leftIds } = get()
      set({
        lobbyError: null,
        lobby: {
          code: details.code,
          status: details.status,
          maxPlayers: details.maxPlayers,
          roles: details.roles,
          hostPlayerId: details.hostPlayerId,
          mode: details.mode,
          isPublic: details.isPublic,
          voiceEnabled: details.voiceEnabled,
          players:
            previous?.code === details.code
              ? mergePlayers(previous.players, details.players, leftIds)
              : mergePlayers([], details.players, leftIds),
        },
      })
    },
    setLobbyError: (message) => set({ lobbyError: message }),
    setGameState: (state) => set({ gameState: state, clockOffset: offsetFrom(state.serverTime, get().clockOffset) }),
    setConnection: (status) => set({ connection: status }),

    playerJoined: (player) =>
      updateLobby((lobby) => ({ players: mergePlayers(lobby.players, [player], get().leftIds) })),
    playerLeft: (playerId, newHostPlayerId, myId) => {
      set({ leftIds: [...get().leftIds, playerId] })
      updateLobby((lobby) => ({ players: lobby.players.filter((p) => p.id !== playerId) }))
      if (newHostPlayerId !== null) get().hostChanged(newHostPlayerId, myId)
    },
    hostChanged: (hostPlayerId, myId) => {
      const wasMe = get().lobby?.hostPlayerId === myId
      updateLobby((lobby) => ({
        hostPlayerId,
        players: lobby.players.map((p) => ({ ...p, host: p.id === hostPlayerId })),
      }))
      if (hostPlayerId === myId && !wasMe) set({ becameHost: get().becameHost + 1 })
    },
    gameStarted: () => updateLobby(() => ({ status: 'IN_PROGRESS' })),
    gameStateChanged: applyPublicState,
    gameFinished: applyPublicState,
    voteResolved: (result) => {
      const current = get().voteResult
      if (current && voteKey(current) === voteKey(result)) return
      set({ voteResult: result })
    },
    // voteResult se mora obrisati: ključ "1:VOTING" stare igre inače bi progutao prvi ishod nove
    clearGame: (code) => {
      clearNarrated(code)
      clearNotes(code)
      set({ publicState: null, gameState: null, voteResult: null })
      if (get().lobby?.code !== code) return
      // tko je izašao tijekom igre, backend briše; ostali su opet živi i bez uloge
      updateLobby((lobby) => ({
        status: 'WAITING',
        players: lobby.players
          .filter((p) => p.eliminatedHow !== 'LEFT')
          .map((p) => ({ ...p, alive: true, roleName: null, eliminatedHow: null, eliminatedRound: null })),
      }))
    },
  }
})
