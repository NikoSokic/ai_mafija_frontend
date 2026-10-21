// DTO-i backenda (ai_mafija_backend, paketi dto/Requests, dto/Response i dto/WebSocket).
// Imena polja su ista kao u Javi. `| null` znači da backend to polje vraća prazno,
// npr. faza i runda prije početka igre ili uloga prije dodjele.

export type LobbyStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'

export type GamePhase = 'NIGHT' | 'DAY' | 'TIE_BREAK' | 'FINISHED'

export type Winner = 'CITIZENS_WIN' | 'MAFIA_WIN'

export type ActionType = 'KILL' | 'SILENCE' | 'SAVE' | 'INVESTIGATE' | 'COMPARE'

/** Policajac: je li meta mafija (Dama je "MAFIA" tek kad mafija padne) */
export type InvestigationResult = 'MAFIA' | 'NOT_MAFIA'

/** Novinar: jesu li dvije mete u istom timu */
export type JournalistResult = 'ISTI_TIM' | 'RAZLICIT_TIM'

// ---------- zahtjevi ----------

export interface CreateLobbyRequest {
  hostNickname: string
  maxPlayers: number
  roles: { roleId: number; count: number }[]
}

export interface JoinLobbyRequest {
  nickname: string
}

// HostActionRequest, PlayerRoleRequest i ReconnectRequest imaju isti oblik: tko je igrač i njegov token
export interface PlayerAuth {
  playerId: number
  playerToken: string
}

export type HostActionRequest = PlayerAuth
export type PlayerRoleRequest = PlayerAuth
export type ReconnectRequest = PlayerAuth

/** POST /api/actions – druga meta samo za COMPARE */
export interface ActionRequest {
  playerId: number
  playerToken: string
  actionType: ActionType
  targetPlayerId: number
  secondTargetPlayerId?: number | null
}

// ---------- odgovori ----------

/** GET /api/test/roles */
export interface Role {
  id: number
  name: string
  opis: string
}

export interface CreateLobbyResponse {
  lobbyId: number
  code: string
  status: LobbyStatus
  maxPlayers: number
  hostPlayerId: number
  hostNickname: string
  playerToken: string
}

export interface LobbyPlayerResponse {
  id: number
  nickname: string
  alive: boolean
}

export interface LobbyDetailsResponse {
  id: number
  code: string
  status: LobbyStatus
  maxPlayers: number
  phase: GamePhase | null
  roundNumber: number | null
  players: LobbyPlayerResponse[]
}

export interface JoinLobbyResponse {
  playerId: number
  nickname: string
  alive: boolean
  lobbyId: number
  lobbyCode: string
  playerToken: string
}

export interface PlayerRoleResponse {
  playerId: number
  nickname: string
  roleName: string
}

export interface AvailableActionResponse {
  type: ActionType
  targetPlayerIds: number[]
  requiresSecondTarget: boolean
}

/** Obrada noći: automatski nakon zadnje uloge ili POST /api/actions/resolve-night/{code} */
export interface ResolveNightResponse {
  message: string
  phase: GamePhase
  roundNumber: number
  killedPlayerIds: number[]
  silencedPlayerIds: number[]
}

/** POST /api/actions – rezultat istrage / usporedbe dolazi samo za tu akciju, inače null */
export interface ActionResponse {
  actionId: number
  actionType: ActionType
  playerId: number
  targetPlayerId: number
  message: string
  investigationResult: InvestigationResult | null
  journalistResult: JournalistResult | null
  /** true kad je ova akcija bila zadnja i backend je odmah obradio noć */
  nightResolved: boolean
  resolveResult: ResolveNightResponse | null
}

export interface ReconnectResponse {
  valid: boolean
  playerId: number
  nickname: string
  alive: boolean
  host: boolean
  lobbyId: number
  lobbyCode: string
  lobbyStatus: LobbyStatus
  roleName: string | null
  phase: GamePhase | null
  roundNumber: number | null
  currentTurnRole: string | null
  canAct: boolean
  hasActed: boolean
  availableActions: AvailableActionResponse[]
}

export interface CurrentPlayerGameStateResponse {
  playerId: number
  nickname: string
  alive: boolean
  role: string | null
  canAct: boolean
  hasActed: boolean
  availableActions: AvailableActionResponse[]
}

export interface VotingStateResponse {
  votingOpen: boolean
  canVote: boolean
  hasVoted: boolean
  eligibleTargetPlayerIds: number[]
  tiedPlayerIds: number[]
}

/** GET /api/lobbies/{code}/game-state – stanje iz perspektive igrača */
export interface GameStateResponse {
  lobbyCode: string
  lobbyStatus: LobbyStatus
  phase: GamePhase | null
  roundNumber: number | null
  players: LobbyPlayerResponse[]
  currentPlayer: CurrentPlayerGameStateResponse
  gameFinished: boolean
  winner: Winner | null
  voting: VotingStateResponse
}

/** Javno stanje igre – stiže u `data` događaja GAME_STATE_CHANGED i GAME_FINISHED */
export interface PublicGameStateResponse {
  lobbyCode: string
  lobbyStatus: LobbyStatus
  phase: GamePhase | null
  roundNumber: number | null
  players: LobbyPlayerResponse[]
  gameFinished: boolean
  winner: Winner | null
  votingOpen: boolean
  tiedPlayerIds: number[]
}

export interface ApiErrorResponse {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
}

// ---------- WebSocket: /topic/lobby/{code} ----------

type LobbyEventOf<T extends string, D> = {
  type: T
  message: string
  lobbyCode: string
  data: D
}

export type LobbyEvent =
  | LobbyEventOf<'PLAYER_JOINED', LobbyPlayerResponse>
  | LobbyEventOf<'GAME_STARTED', null>
  | LobbyEventOf<'GAME_STATE_CHANGED', PublicGameStateResponse>
  | LobbyEventOf<'GAME_FINISHED', PublicGameStateResponse>
