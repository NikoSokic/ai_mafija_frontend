// DTO-i backenda (ai_mafia_backend, paketi dto/Requests, dto/Response i dto/WebSocket).
// Imena polja su ista kao u Javi. `| null` znači da backend to polje vraća prazno,
// npr. faza i runda prije početka igre ili uloga prije dodjele.
// Vremena (`phaseEndsAt`, `serverTime`…) su ISO tekst, npr. "2026-10-21T18:30:00.123+02:00".

export type LobbyStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED'

/** DAY je samo rasprava; glasa se u VOTING i, kod izjednačenja, u TIE_BREAK */
export type GamePhase = 'NIGHT' | 'DAY' | 'VOTING' | 'TIE_BREAK' | 'FINISHED'

export type Winner = 'CITIZENS_WIN' | 'MAFIA_WIN'

export type ActionType = 'KILL' | 'SILENCE' | 'SAVE' | 'INVESTIGATE' | 'COMPARE'

/** Policajac: je li meta mafija (Dama je "MAFIA" tek kad mafija padne) */
export type InvestigationResult = 'MAFIA' | 'NOT_MAFIA'

/** Novinar: jesu li dvije mete u istom timu */
export type JournalistResult = 'ISTI_TIM' | 'RAZLICIT_TIM'

/** Kako je igrač ispao: mafija noću, glasanjem ili je napustio igru */
export type EliminatedHow = 'NIGHT' | 'VOTE' | 'LEFT'

/** Ishod glasanja; kad glasanje odluči igru, umjesto ELIMINATED dolazi pobjednik */
export type VoteResult = 'ELIMINATED' | 'TIE' | 'NO_ELIMINATION' | Winner

// ---------- zahtjevi ----------

/** Uživo = narator u sobi, Online = svatko na svom uređaju */
export type LobbyMode = 'LIVE' | 'ONLINE'

export interface CreateLobbyRequest {
  hostNickname: string
  maxPlayers: number
  roles: { roleId: number; count: number }[]
  mode: LobbyMode
  isPublic: boolean
  voiceEnabled: boolean
  hostAvatarEmoji: string
}

export interface JoinLobbyRequest {
  nickname: string
  avatarEmoji: string
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

/** POST /api/votes – targetPlayerId null = "Suzdržan" (samo u VOTING) */
export interface VoteRequest {
  voterPlayerId: number
  targetPlayerId: number | null
  playerToken: string
}

// ---------- odgovori ----------

/** GET /api/roles */
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
  host: boolean
  /** null dok je igrač živ */
  eliminatedHow: EliminatedHow | null
  eliminatedRound: number | null
  /** uloga je javna tek kad igra završi */
  roleName: string | null
  /** null kad igrač nije odabrao emoji */
  avatarEmoji: string | null
}

/** Sastav uloga koji je domaćin odabrao */
export interface LobbyRoleResponse {
  roleId: number
  roleName: string
  count: number
}

export interface LobbyDetailsResponse {
  id: number
  code: string
  status: LobbyStatus
  maxPlayers: number
  phase: GamePhase | null
  roundNumber: number | null
  players: LobbyPlayerResponse[]
  roles: LobbyRoleResponse[]
  /** null kad domaćina nema */
  hostPlayerId: number | null
  mode: LobbyMode
  isPublic: boolean
  voiceEnabled: boolean
}

/** GET /api/lobbies?public=true – čekaonice javnih soba, najnovije prve */
export interface PublicLobbyResponse {
  code: string
  hostNickname: string
  hostAvatarEmoji: string | null
  playerCount: number
  maxPlayers: number
  mode: LobbyMode
  createdAt: string
}

export interface JoinLobbyResponse {
  playerId: number
  nickname: string
  alive: boolean
  lobbyId: number
  lobbyCode: string
  playerToken: string
}

/** Suigrač iz tima mafije – vidi ga samo tim mafije */
export interface TeammateResponse {
  playerId: number
  nickname: string
  roleName: string
  alive: boolean
}

/** Koga je član tima mafije noćas odabrao za KILL */
export interface TeamTargetResponse {
  playerId: number
  targetPlayerId: number
}

export interface PlayerRoleResponse {
  playerId: number
  nickname: string
  roleName: string
  /** prazno za građane */
  teammates: TeammateResponse[]
}

export interface AvailableActionResponse {
  type: ActionType
  targetPlayerIds: number[]
  requiresSecondTarget: boolean
}

/** Obrada noći: automatski nakon zadnje uloge, istekom roka ili POST /api/actions/resolve-night/{code} */
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

export interface VoteCountResponse {
  playerId: number
  votes: number
}

/** Obrada glasanja: kad svi glasaju, istekom roka ili POST /api/votes/resolve/{code} */
export interface ResolveVoteResponse {
  result: VoteResult
  message: string
  roundNumber: number
  eliminatedPlayerId: number | null
  tiedPlayerIds: number[]
  voteCounts: VoteCountResponse[]
  /** suzdržani + oni koji nisu glasali; null u ponovnom glasanju (TIE_BREAK) */
  abstainCount: number | null
}

/** POST /api/votes */
export interface VoteResponse {
  voteId: number
  voterPlayerId: number
  targetPlayerId: number | null
  message: string
  /** true kad je ovaj glas bio zadnji i backend je odmah obradio glasanje */
  votingResolved: boolean
  resolveResult: ResolveVoteResponse | null
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
  /** null osim kad je igrač na redu */
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
  /** rok poteza; samo dok je igrač na redu */
  actionEndsAt: string | null
  /** samo za tim mafije */
  teammates: TeammateResponse[]
  /** samo za tim mafije tijekom noći */
  teamTargets: TeamTargetResponse[]
}

/** Jedan glas; targetPlayerId je null za "Suzdržan" */
export interface VoteEntryResponse {
  voterPlayerId: number
  targetPlayerId: number | null
}

export interface VotingStateResponse {
  votingOpen: boolean
  canVote: boolean
  hasVoted: boolean
  /** "Suzdržan" samo u prvom glasanju */
  canAbstain: boolean
  /** za koga ovaj igrač smije glasati (bez sebe) */
  eligibleTargetPlayerIds: number[]
  tiedPlayerIds: number[]
  eligibleVoterIds: number[]
  votes: VoteEntryResponse[]
}

/** Javno glasanje uživo; postoji samo dok je glasanje otvoreno */
export interface PublicVotingResponse {
  eligibleVoterIds: number[]
  votes: VoteEntryResponse[]
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
  /** kraj rasprave / glasanja; noću null */
  phaseEndsAt: string | null
  /** vrijeme poslužitelja, za razliku u satu */
  serverTime: string
  /** utišani u tekućem danu */
  silencedPlayerIds: number[]
  /** tko je stradao u noći prije tekućeg dana */
  nightKilledPlayerIds: number[]
  /** koja je uloga noću budna (MAFIA, DAMA, Doktor, Policajac, Novinar); null u uvodu noći i danju */
  currentTurnRole: string | null
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
  phaseEndsAt: string | null
  serverTime: string
  silencedPlayerIds: number[]
  nightKilledPlayerIds: number[]
  /** null dok glasanje nije otvoreno */
  voting: PublicVotingResponse | null
  /** koja je uloga noću budna (MAFIA, DAMA, Doktor, Policajac, Novinar); null u uvodu noći i danju */
  currentTurnRole: string | null
}

export interface PlayerLeftResponse {
  playerId: number
  nickname: string
  /** samo ako je otišao domaćin */
  newHostPlayerId: number | null
}

export interface HostChangedResponse {
  hostPlayerId: number
}

/** `code` je stabilan (backend exception/ErrorCode.java), `message` je tekst za ljude */
export interface ApiErrorResponse {
  timestamp: string
  status: number
  error: string
  code: string
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
  | LobbyEventOf<'PLAYER_LEFT', PlayerLeftResponse>
  | LobbyEventOf<'HOST_CHANGED', HostChangedResponse>
  | LobbyEventOf<'GAME_STARTED', null>
  | LobbyEventOf<'GAME_STATE_CHANGED', PublicGameStateResponse>
  | LobbyEventOf<'NIGHT_RESOLVED', ResolveNightResponse>
  | LobbyEventOf<'VOTING_STARTED', { roundNumber: number; phaseEndsAt: string }>
  | LobbyEventOf<'VOTE_RESOLVED', ResolveVoteResponse>
  | LobbyEventOf<'GAME_FINISHED', PublicGameStateResponse>
